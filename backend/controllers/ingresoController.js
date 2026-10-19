const { sequelize } = require('../models');
const { Ingreso, IngresoDetalle, Cargo, Socio, Usuario, Asociacion, ConceptoCobro, Persona } = require('../models');

/**
 * createIngreso: Registrar un pago de cargos con bloqueo pesimista y cálculo del lado del servidor.
 * Previene condiciones de carrera (Race Conditions) y garantiza la integridad de saldos.
 */
const createIngreso = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const id_asociacion = req.user.id_asociacion;
    const id_usuario = req.user.id_usuario;
    const { id_socio, cargos: cargosAbono, monto_total_recibido, fecha_pago, observacion } = req.body;

    const fechaPagoEfectiva = fecha_pago ? new Date(fecha_pago) : new Date();

    if (!id_socio || !cargosAbono || !Array.isArray(cargosAbono) || cargosAbono.length === 0) {
      await t.rollback();
      return res.status(400).json({ mensaje: 'Debe especificar el socio y al menos un cargo a cobrar.' });
    }

    // 1. Verificar socio en la asociación actual (Aislamiento Multi-tenant estricto)
    const socio = await Socio.findOne({
      where: { id_socio, id_asociacion, deleted_at: null },
      transaction: t,
    });
    if (!socio) {
      await t.rollback();
      return res.status(404).json({ mensaje: 'Socio no encontrado en esta asociación.' });
    }

    // 2. Bloquear asociación para cálculo serializado seguro de nro_recibo (Anti-Race Condition)
    await Asociacion.findOne({
      where: { id_asociacion },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    const maxRecibo = await Ingreso.max('nro_recibo', {
      where: { id_asociacion },
      transaction: t,
      paranoid: false,
    });
    const nro_recibo = (maxRecibo || 0) + 1;

    // 3. Procesar cargos con bloqueo pesimista y recálculo financiero en servidor
    let sumaCapitalCalculada = 0;
    let sumaMoraCalculada = 0;
    const detallesParaInsertar = [];
    const cargosParaActualizar = [];

    for (const abonoItem of cargosAbono) {
      const id_cargo = typeof abonoItem === 'object' ? abonoItem.id_cargo : abonoItem;
      if (!id_cargo) continue;

      // Bloqueo pesimista: nadie más puede cobrar ni modificar este cargo mientras dura la transacción
      const cargo = await Cargo.findOne({
        where: { id_cargo, id_asociacion, deleted_at: null },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!cargo) {
        await t.rollback();
        return res.status(404).json({ mensaje: `El cargo #${id_cargo} no existe o no pertenece a su asociación.` });
      }

      if (cargo.estado === 'Pagado_Total' || cargo.estado === 'Anulado') {
        await t.rollback();
        return res.status(400).json({ mensaje: `El cargo #${id_cargo} ya se encuentra ${cargo.estado}.` });
      }

      const saldoPendiente = Math.round(parseFloat(cargo.saldo_capital_pendiente || 0) * 100) / 100;
      const moraPendiente = Math.round(parseFloat(cargo.monto_mora_acumulada || 0) * 100) / 100;

      // El servidor determina y valida cuánto se abona
      let abonoCapital = saldoPendiente;
      let abonoMora = moraPendiente;

      if (typeof abonoItem === 'object') {
        if (abonoItem.monto_abonado_capital !== undefined && abonoItem.monto_abonado_capital !== null) {
          const capPropuesto = Math.round(parseFloat(abonoItem.monto_abonado_capital) * 100) / 100;
          if (capPropuesto < 0) {
            await t.rollback();
            return res.status(400).json({ mensaje: 'El abono a capital no puede ser negativo.' });
          }
          abonoCapital = Math.min(saldoPendiente, capPropuesto);
        }
        if (abonoItem.monto_abonado_mora !== undefined && abonoItem.monto_abonado_mora !== null) {
          const moraPropuesta = Math.round(parseFloat(abonoItem.monto_abonado_mora) * 100) / 100;
          if (moraPropuesta < 0) {
            await t.rollback();
            return res.status(400).json({ mensaje: 'El abono a mora no puede ser negativo.' });
          }
          abonoMora = Math.min(moraPendiente, moraPropuesta);
        }
      }

      sumaCapitalCalculada = Math.round((sumaCapitalCalculada + abonoCapital) * 100) / 100;
      sumaMoraCalculada = Math.round((sumaMoraCalculada + abonoMora) * 100) / 100;

      detallesParaInsertar.push({
        id_cargo,
        monto_abonado_capital: abonoCapital,
        monto_abonado_mora: abonoMora,
      });

      const nuevoSaldoCapital = Math.round((saldoPendiente - abonoCapital) * 100) / 100;
      const nuevaMora = Math.round(Math.max(0, moraPendiente - abonoMora) * 100) / 100;
      const nuevoEstado = nuevoSaldoCapital <= 0 && nuevaMora <= 0 ? 'Pagado_Total' : 'Pagado_Parcial';

      cargosParaActualizar.push({
        cargo,
        nuevoSaldoCapital,
        nuevaMora,
        nuevoEstado,
      });
    }

    const totalCobroServidor = Math.round((sumaCapitalCalculada + sumaMoraCalculada) * 100) / 100;
    const montoFinalRecibido = monto_total_recibido !== undefined && !isNaN(parseFloat(monto_total_recibido))
      ? Math.round(parseFloat(monto_total_recibido) * 100) / 100
      : totalCobroServidor;

    // 4. Crear el comprobante principal de Ingreso
    const ingreso = await Ingreso.create({
      id_asociacion,
      nro_recibo,
      id_socio,
      id_usuario,
      monto_total_recibido: montoFinalRecibido,
      fecha_pago: fechaPagoEfectiva,
      estado: 'Valido',
      observacion: observacion ? String(observacion).trim() : null,
      created_at: new Date(),
      updated_at: new Date(),
    }, { transaction: t });

    // 5. Insertar los detalles vinculados
    for (const det of detallesParaInsertar) {
      await IngresoDetalle.create({
        id_ingreso: ingreso.id_ingreso,
        id_cargo: det.id_cargo,
        monto_abonado_capital: det.monto_abonado_capital,
        monto_abonado_mora: det.monto_abonado_mora,
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
    }

    // 6. Aplicar las actualizaciones a los cargos bloqueados
    for (const item of cargosParaActualizar) {
      await item.cargo.update({
        saldo_capital_pendiente: item.nuevoSaldoCapital.toFixed(2),
        monto_mora_acumulada: item.nuevaMora.toFixed(2),
        estado: item.nuevoEstado,
        updated_at: new Date(),
      }, { transaction: t });
    }

    await t.commit();

    // Retornar comprobante emitido
    const ingresoCompleto = await Ingreso.findOne({
      where: { id_ingreso: ingreso.id_ingreso },
      include: [
        { model: Asociacion, as: 'asociacion' },
        { model: Socio, as: 'socio', include: [{ model: Persona, as: 'persona' }] },
        { model: Usuario, as: 'cajero', attributes: { exclude: ['password'] } },
        {
          model: IngresoDetalle, as: 'detalles',
          include: [{ model: Cargo, as: 'cargo', include: [{ model: ConceptoCobro, as: 'concepto' }] }],
        },
      ],
    });

    return res.status(201).json({
      mensaje: 'Pago registrado exitosamente con integridad financiera.',
      ingreso: ingresoCompleto,
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * createIngresoDirecto: Registrar un ingreso directo extraordinario a caja
 * (ej. Traspaso de caseta con 10% de comisión, Cuota de afiliación para nuevo socio,
 * alquiler de espacios comunes, donaciones).
 */
const createIngresoDirecto = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const id_asociacion = req.user.id_asociacion;
    const id_usuario = req.user.id_usuario;
    let id_socio = req.body.id_socio;
    const {
      monto,
      concepto,
      detalle,
      observacion,
      pagador,
      fecha_pago,
      tipo_origen,
      porcentaje_traspaso,
      valor_venta_caseta,
      nuevo_socio_nombres,
      nuevo_socio_apellidos,
      nuevo_socio_ci,
      nuevo_socio_telefono,
      nuevo_socio_domicilio,
    } = req.body;

    const montoNum = Math.round(parseFloat(monto) * 100) / 100;
    if (isNaN(montoNum) || montoNum <= 0) {
      await t.rollback();
      return res.status(400).json({ mensaje: 'El monto del ingreso debe ser un número positivo.' });
    }

    const fechaPagoEfectiva = fecha_pago ? new Date(fecha_pago) : new Date();

    // 1. Si se especificó socio, verificar pertenencia estricta a la asociación
    let socio = null;
    let nombreSocio = '';
    if (id_socio) {
      socio = await Socio.findOne({
        where: { id_socio, id_asociacion, deleted_at: null },
        include: [{ model: Persona, as: 'persona' }],
        transaction: t,
      });
      if (!socio) {
        await t.rollback();
        return res.status(404).json({ mensaje: 'El socio especificado no existe o no pertenece a su asociación.' });
      }
      const p = socio.persona || {};
      nombreSocio = `${p.nombres || ''} ${p.apellidos || ''} (Caseta #${socio.nro_caseta || 'S/N'})`.trim();

      // Si es un traspaso / afiliación con datos de un nuevo socio:
      // El socio antiguo de esa caseta se da de baja lógica y pasa a Inactivo, y se afilia al nuevo socio
      if (nuevo_socio_nombres && nuevo_socio_nombres.trim()) {
        const nroCasetaTraspaso = socio.nro_caseta;
        // 1.1 Dar de baja lógica al socio antiguo
        await socio.update({ estado_socio: 'Inactivo' }, { transaction: t });
        await socio.destroy({ transaction: t });

        // 1.2 Registrar o buscar la Persona del nuevo socio
        let personaNueva = null;
        if (nuevo_socio_ci && nuevo_socio_ci.trim()) {
          personaNueva = await Persona.findOne({
            where: { ci: nuevo_socio_ci.trim() },
            transaction: t,
          });
        }

        if (!personaNueva) {
          personaNueva = await Persona.create({
            nombres: nuevo_socio_nombres.trim(),
            apellidos: (nuevo_socio_apellidos || '').trim(),
            ci: nuevo_socio_ci ? nuevo_socio_ci.trim() : null,
            telefono: nuevo_socio_telefono ? nuevo_socio_telefono.trim() : null,
            domicilio: nuevo_socio_domicilio ? nuevo_socio_domicilio.trim() : null,
          }, { transaction: t });
        } else {
          await personaNueva.update({
            nombres: nuevo_socio_nombres.trim(),
            apellidos: (nuevo_socio_apellidos || personaNueva.apellidos || '').trim(),
            telefono: nuevo_socio_telefono || personaNueva.telefono,
            domicilio: nuevo_socio_domicilio || personaNueva.domicilio,
          }, { transaction: t });
        }

        // 1.3 Crear el nuevo Socio activo asignándole la caseta
        const nuevoSocio = await Socio.create({
          id_asociacion,
          id_persona: personaNueva.id_persona,
          nro_caseta: nroCasetaTraspaso,
          estado_socio: 'Activo',
        }, { transaction: t });

        socio = nuevoSocio;
        id_socio = nuevoSocio.id_socio;
        nombreSocio = `${personaNueva.nombres} ${personaNueva.apellidos || ''} (Caseta #${nuevoSocio.nro_caseta})`.trim();
      }
    }

    // 2. Bloquear asociación para cálculo serializado seguro de nro_recibo
    await Asociacion.findOne({
      where: { id_asociacion },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    const maxRecibo = await Ingreso.max('nro_recibo', {
      where: { id_asociacion },
      transaction: t,
      paranoid: false,
    });
    const nro_recibo = (maxRecibo || 0) + 1;

    // 3. Determinar o crear el Concepto de Cobro correspondiente
    const nombreConcepto = (concepto || 'Ingreso Directo de Caja').trim();
    const [conceptoRecord] = await ConceptoCobro.findOrCreate({
      where: { id_asociacion, nombre_concepto: nombreConcepto },
      defaults: {
        monto_fijo: montoNum,
        aplica_mora: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      transaction: t,
    });

    // 4. Determinar tipo de origen y glosa
    const origenFinal = tipo_origen || (
      nombreConcepto.toLowerCase().includes('traspaso') ? 'traspaso' :
      nombreConcepto.toLowerCase().includes('afilia') ? 'afiliacion' :
      nombreConcepto.toLowerCase().includes('alquiler') ? 'alquiler' : 'directo'
    );

    let glosaFinal = detalle || observacion || '';
    if (origenFinal === 'traspaso' && valor_venta_caseta) {
      const pct = porcentaje_traspaso || 10;
      glosaFinal = `[TRASPASO]: Venta de caseta por Bs. ${parseFloat(valor_venta_caseta).toFixed(2)} (${pct}% = Bs. ${montoNum.toFixed(2)}). ${glosaFinal}`.trim();
    } else if (origenFinal === 'afiliacion') {
      glosaFinal = `[AFILIACIÓN]: Cuota de incorporación nuevo socio. ${glosaFinal}`.trim();
    } else if (!glosaFinal) {
      glosaFinal = nombreConcepto;
    }

    const pagadorFinal = (pagador || nombreSocio || 'Público General / Tercero').trim();

    // 5. Si hay socio vinculado, crear Cargo 'Pagado_Total' para trazabilidad financiera en su estado de cuenta
    let cargo = null;
    if (id_socio) {
      cargo = await Cargo.create({
        id_asociacion,
        id_socio,
        id_concepto: conceptoRecord.id_concepto,
        tipo_origen: origenFinal,
        periodo: new Date(fechaPagoEfectiva).toISOString().slice(0, 7),
        detalle: glosaFinal,
        monto_capital_inicial: montoNum,
        saldo_capital_pendiente: 0.00,
        monto_mora_acumulada: 0.00,
        fecha_vencimiento: fechaPagoEfectiva,
        estado: 'Pagado_Total',
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
    }

    // 6. Crear el Comprobante Oficial de Ingreso
    const ingreso = await Ingreso.create({
      id_asociacion,
      nro_recibo,
      id_socio: id_socio || null,
      id_usuario,
      id_concepto: conceptoRecord.id_concepto,
      concepto: nombreConcepto,
      tipo_origen: origenFinal,
      pagador: pagadorFinal,
      monto_total_recibido: montoNum,
      fecha_pago: fechaPagoEfectiva,
      estado: 'Valido',
      observacion: glosaFinal,
      created_at: new Date(),
      updated_at: new Date(),
    }, { transaction: t });

    // 7. Si hay cargo, vincularlo en IngresoDetalle
    if (cargo) {
      await IngresoDetalle.create({
        id_ingreso: ingreso.id_ingreso,
        id_cargo: cargo.id_cargo,
        monto_abonado_capital: montoNum,
        monto_abonado_mora: 0.00,
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
    }

    await t.commit();

    const ingresoCompleto = await Ingreso.findOne({
      where: { id_ingreso: ingreso.id_ingreso },
      include: [
        { model: Asociacion, as: 'asociacion' },
        { model: Socio, as: 'socio', include: [{ model: Persona, as: 'persona' }] },
        { model: Usuario, as: 'cajero', attributes: { exclude: ['password'] } },
        { model: ConceptoCobro, as: 'concepto_cobro' },
        {
          model: IngresoDetalle, as: 'detalles',
          include: [{ model: Cargo, as: 'cargo', include: [{ model: ConceptoCobro, as: 'concepto' }] }],
        },
      ],
    });

    return res.status(201).json({
      mensaje: 'Ingreso directo registrado exitosamente con comprobante correlativo.',
      ingreso: ingresoCompleto,
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * getIngresos: listar ingresos de la asociación actual (Aislamiento Multi-tenant)
 */
const getIngresos = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const page = parseInt(req.query.page, 10) || 1;
    // Paginación por defecto optimizada para evitar saturación de memoria
    const limit = req.query.limit
      ? Math.min(parseInt(req.query.limit, 10) || 50, 500)
      : (req.query.all === 'true' ? null : 100);
    const offset = limit ? (page - 1) * limit : null;

    const { count, rows: ingresos } = await Ingreso.findAndCountAll({
      where: { id_asociacion, deleted_at: null },
      attributes: [
        'id_ingreso',
        'nro_recibo',
        'id_asociacion',
        'id_socio',
        'id_usuario',
        'id_concepto',
        'concepto',
        'tipo_origen',
        'pagador',
        'monto_total_recibido',
        'fecha_pago',
        'estado',
        'observacion',
        'created_at',
      ],
      include: [
        {
          model: ConceptoCobro,
          as: 'concepto_cobro',
          attributes: ['id_concepto', 'nombre_concepto'],
        },
        {
          model: Asociacion,
          as: 'asociacion',
          attributes: ['id_asociacion', 'nombre_mercado'],
        },
        {
          model: Socio,
          as: 'socio',
          attributes: ['id_socio', 'nro_caseta', 'id_persona', 'estado_socio'],
          include: [
            {
              model: Persona,
              as: 'persona',
              attributes: ['id_persona', 'nombres', 'apellidos', 'ci', 'telefono'],
            },
          ],
        },
        {
          model: Usuario,
          as: 'cajero',
          attributes: ['id_usuario', 'username', 'rol'],
        },
        {
          model: IngresoDetalle,
          as: 'detalles',
          attributes: ['id_detalle', 'id_ingreso', 'id_cargo', 'monto_abonado_capital', 'monto_abonado_mora'],
          include: [
            {
              model: Cargo,
              as: 'cargo',
              attributes: ['id_cargo', 'id_concepto', 'tipo_origen', 'periodo', 'detalle'],
              include: [
                {
                  model: ConceptoCobro,
                  as: 'concepto',
                  attributes: ['id_concepto', 'nombre_concepto'],
                },
              ],
            },
          ],
        },
      ],
      order: [['fecha_pago', 'DESC'], ['id_ingreso', 'DESC']],
      limit: limit || undefined,
      offset: offset !== null ? offset : undefined,
      distinct: true,
    });

    return res.status(200).json({
      ingresos,
      total: count,
      page,
      limit: limit || count,
      total_paginas: limit ? Math.ceil(count / limit) : 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getIngreso: obtener un ingreso por ID asegurando pertenencia a la asociación del token
 */
const getIngreso = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;

    const ingreso = await Ingreso.findOne({
      where: { id_ingreso: id, id_asociacion, deleted_at: null },
      include: [
        { model: Asociacion, as: 'asociacion' },
        { model: Socio, as: 'socio', include: [{ model: Persona, as: 'persona' }] },
        { model: Usuario, as: 'cajero' },
        {
          model: IngresoDetalle, as: 'detalles',
          include: [{ model: Cargo, as: 'cargo', include: [{ model: ConceptoCobro, as: 'concepto' }] }],
        },
      ],
    });
    if (!ingreso) return res.status(404).json({ mensaje: 'Ingreso no encontrado en esta asociación.' });
    return res.status(200).json({ ingreso });
  } catch (error) {
    next(error);
  }
};

/**
 * anularIngreso: Flujo seguro de anulación de recibos bajo transacción pesimista.
 * Exige motivo obligatorio, verifica estado VALIDO, cambia estado a ANULADO,
 * y devuelve exactamente el capital y mora abonados a la cuenta del socio.
 */
const anularIngreso = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;
    const motivo = (req.body.observacion || req.body.motivo || req.body.motivo_anulacion || '').trim();

    if (!motivo || motivo.length < 5) {
      await t.rollback();
      return res.status(400).json({
        mensaje: 'Debe proporcionar un motivo obligatorio para la anulación (mínimo 5 caracteres).',
      });
    }

    // 1. Buscar ingreso con bloqueo pesimista for update
    const ingreso = await Ingreso.findOne({
      where: { id_ingreso: id, id_asociacion, deleted_at: null },
      include: [{ model: IngresoDetalle, as: 'detalles' }],
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!ingreso) {
      await t.rollback();
      return res.status(404).json({ mensaje: 'Recibo de ingreso no encontrado en esta asociación.' });
    }

    if (String(ingreso.estado).toUpperCase() !== 'VALIDO') {
      await t.rollback();
      return res.status(400).json({
        mensaje: `El recibo no puede ser anulado porque ya se encuentra en estado '${ingreso.estado}'.`,
      });
    }

    // 2. Revertir cada cargo asociado con bloqueo pesimista
    for (const detalle of ingreso.detalles) {
      const cargo = await Cargo.findOne({
        where: { id_cargo: detalle.id_cargo, id_asociacion },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (cargo && cargo.estado !== 'Anulado') {
        if (cargo.tipo_origen === 'traspaso' || cargo.tipo_origen === 'afiliacion' || cargo.tipo_origen === 'directo') {
          await cargo.update({
            saldo_capital_pendiente: 0.00,
            estado: 'Anulado',
            updated_at: new Date(),
          }, { transaction: t });
        } else {
          const abonadoCap = Math.round(parseFloat(detalle.monto_abonado_capital || 0) * 100) / 100;
          const abonadoMora = Math.round(parseFloat(detalle.monto_abonado_mora || 0) * 100) / 100;

          const saldoRevertido = Math.round((parseFloat(cargo.saldo_capital_pendiente || 0) + abonadoCap) * 100) / 100;
          const moraRevertida = Math.round((parseFloat(cargo.monto_mora_acumulada || 0) + abonadoMora) * 100) / 100;

          const capitalInicial = Math.round(parseFloat(cargo.monto_capital_inicial || 0) * 100) / 100;
          const nuevoEstado = saldoRevertido >= capitalInicial ? 'Pendiente' : 'Pagado_Parcial';

          await cargo.update({
            saldo_capital_pendiente: saldoRevertido.toFixed(2),
            monto_mora_acumulada: moraRevertida.toFixed(2),
            estado: nuevoEstado,
            updated_at: new Date(),
          }, { transaction: t });
        }
      }
    }

    // 3. Actualizar estado del ingreso a Anulado con auditoría
    const textoAuditoria = `[ANULADO por ${req.user.username}]: ${motivo}`;
    await ingreso.update({
      estado: 'Anulado',
      observacion: ingreso.observacion ? `${ingreso.observacion} | ${textoAuditoria}` : textoAuditoria,
      updated_at: new Date(),
    }, { transaction: t });

    await t.commit();
    return res.status(200).json({
      mensaje: 'Recibo anulado y saldos revertidos con integridad financiera.',
      id_ingreso: ingreso.id_ingreso,
      nro_recibo: ingreso.nro_recibo,
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

module.exports = {
  createIngreso,
  createIngresoDirecto,
  getIngresos,
  getIngreso,
  anularIngreso,
};
