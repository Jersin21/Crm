const { Op } = require('sequelize');
const { ConsumoLuz, Socio, Cargo, ConceptoCobro, Persona, Asociacion } = require('../models');
const sequelize = require('../db/connection');

/**
 * registrarConsumo: registrar lectura de medidor y generar cargo de luz automáticamente
 * con validaciones de correlatividad y sanción por 3er mes impago consecutivo.
 * Protegido con transacción atómica de base de datos.
 */
const registrarConsumo = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const id_asociacion =
      req.user.rol === 'SUPERADMIN_SAAS' && (req.body.id_asociacion || req.query.id_asociacion)
        ? req.body.id_asociacion || req.query.id_asociacion
        : req.user.id_asociacion;
    const id_usuario = req.user.id_usuario;

    if (!id_asociacion) {
      await transaction.rollback();
      return res.status(400).json({ mensaje: 'Debe especificar la asociación.' });
    }

    let { id_socio, mes_anio, lectura_anterior, lectura_actual, fecha_lectura } = req.body;

    if (!id_socio || lectura_actual === undefined) {
      await transaction.rollback();
      return res.status(400).json({ mensaje: 'Faltan campos requeridos: id_socio y lectura_actual.' });
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    fecha_lectura = fecha_lectura || fechaHoy;
    mes_anio = mes_anio || fecha_lectura.slice(0, 7);

    // Verificar que el socio pertenezca a la asociación
    const socio = await Socio.findOne({
      where: { id_socio, id_asociacion, deleted_at: null },
      transaction,
    });
    if (!socio) {
      await transaction.rollback();
      return res.status(404).json({ mensaje: 'Socio no encontrado en esta asociación.' });
    }

    // Obtener la última lectura previa registrada (optimizado a 1 registro LIMIT 1)
    const ultimaLectura = await ConsumoLuz.findOne({
      where: { id_socio, deleted_at: null },
      order: [
        ['mes_anio', 'DESC'],
        ['fecha_lectura', 'DESC'],
      ],
      transaction,
    });

    // Si no se envió lectura_anterior, tomar la de la última lectura o 0
    if (lectura_anterior === undefined || lectura_anterior === null) {
      lectura_anterior = ultimaLectura ? parseFloat(ultimaLectura.lectura_actual) : 0;
    } else {
      lectura_anterior = parseFloat(lectura_anterior);
    }
    lectura_actual = parseFloat(lectura_actual);

    // Validación 1: Lectura actual no puede ser menor a la anterior
    if (lectura_actual < lectura_anterior) {
      await transaction.rollback();
      return res.status(400).json({
        mensaje: `La lectura actual (${lectura_actual} kWh) no puede ser menor a la lectura anterior (${lectura_anterior} kWh).`,
      });
    }

    if (ultimaLectura) {
      // Validación 2: Fecha de lectura no puede ser anterior a la última fecha
      const dNueva = new Date(fecha_lectura);
      const dUltima = new Date(ultimaLectura.fecha_lectura);
      if (dNueva < dUltima) {
        await transaction.rollback();
        return res.status(400).json({
          mensaje: `La fecha de lectura (${fecha_lectura}) no puede ser anterior a la última lectura registrada (${ultimaLectura.fecha_lectura}).`,
        });
      }

      // Validación 3: No saltarse meses correlativos
      const [uAnio, uMes] = ultimaLectura.mes_anio.split('-').map(Number);
      let mesSig = uMes + 1;
      let anioSig = uAnio;
      if (mesSig > 12) {
        mesSig = 1;
        anioSig += 1;
      }
      const mesEsperado = `${anioSig}-${String(mesSig).padStart(2, '0')}`;

      if (mes_anio > mesEsperado) {
        await transaction.rollback();
        return res.status(400).json({
          mensaje: `No puede saltarse el mes correlativo ${mesEsperado}. La última lecturación registrada para este socio fue ${ultimaLectura.mes_anio}.`,
        });
      }
    }

    // Validación 4: Verificar duplicidad de periodo
    const consumoExistente = await ConsumoLuz.findOne({
      where: { id_socio, mes_anio, deleted_at: null },
      transaction,
    });
    if (consumoExistente) {
      await transaction.rollback();
      return res.status(400).json({
        mensaje: `El socio ya tiene una lecturación registrada para el periodo ${mes_anio}.`,
      });
    }

    // Calcular kWh y monto con la tarifa configurada en la asociación
    const kwh_consumidos = lectura_actual - lectura_anterior;
    const asoc = await Asociacion.findByPk(id_asociacion, { transaction });
    const PRECIO_KWH = asoc?.precio_kwh ? parseFloat(asoc.precio_kwh) : 2.0;
    const monto_calculado = parseFloat((kwh_consumidos * PRECIO_KWH).toFixed(2));

    // Crear el registro de consumo
    const consumo = await ConsumoLuz.create(
      {
        id_socio,
        mes_anio,
        lectura_anterior,
        lectura_actual,
        kwh_consumidos,
        monto_calculado,
        fecha_lectura,
        id_usuario_registro: id_usuario,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction }
    );

    // Buscar o crear concepto de cobro 'Luz' para esta asociación
    const [conceptoLuz] = await ConceptoCobro.findOrCreate({
      where: { id_asociacion, nombre_concepto: 'Luz', deleted_at: null },
      defaults: {
        id_asociacion,
        nombre_concepto: 'Luz',
        monto_fijo: null,
        aplica_mora: true,
        tasa_mora_mensual: 0.05,
        dias_gracia: 10,
        created_at: new Date(),
        updated_at: new Date(),
      },
      transaction,
    });

    const [anioStr, mesStr] = mes_anio.split('-');
    const fechaVencimiento = new Date(parseInt(anioStr), parseInt(mesStr), 15);

    // Crear cargo de luz del mes
    const cargoLuz = await Cargo.create(
      {
        id_socio,
        id_asociacion,
        id_concepto: conceptoLuz.id_concepto,
        id_referencia_origen: consumo.id_consumo,
        tipo_origen: 'luz',
        periodo: mes_anio,
        detalle: `Consumo Luz ${mes_anio}: ${kwh_consumidos.toFixed(2)} kWh`,
        monto_capital_inicial: monto_calculado,
        saldo_capital_pendiente: monto_calculado,
        monto_mora_acumulada: 0,
        fecha_vencimiento: fechaVencimiento,
        estado: 'Pendiente',
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction }
    );

    // ─── REGLA: 3er MES SIN PAGAR LA LUZ (APLICACIÓN AUTOMÁTICA DE MULTA POR MORA) ───
    const cargosLuzImpagos = await Cargo.findAll({
      where: {
        id_socio,
        id_asociacion,
        tipo_origen: 'luz',
        estado: { [Op.in]: ['Pendiente', 'Pagado_Parcial'] },
        deleted_at: null,
      },
      transaction,
    });

    let multaGenerada = null;
    let mensajeMora = null;

    // Si con este nuevo cargo alcanza 3 o más meses pendientes de luz:
    if (cargosLuzImpagos.length >= 3) {
      const [conceptoMoraLuz] = await ConceptoCobro.findOrCreate({
        where: { id_asociacion, nombre_concepto: 'Multa Mora Luz', deleted_at: null },
        defaults: {
          id_asociacion,
          nombre_concepto: 'Multa Mora Luz',
          monto_fijo: 20.0,
          aplica_mora: false,
          tasa_mora_mensual: 0,
          dias_gracia: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
        transaction,
      });

      const yaTieneMulta = await Cargo.findOne({
        where: {
          id_socio,
          id_asociacion,
          id_concepto: conceptoMoraLuz.id_concepto,
          periodo: mes_anio,
          deleted_at: null,
        },
        transaction,
      });

      if (!yaTieneMulta) {
        multaGenerada = await Cargo.create(
          {
            id_socio,
            id_asociacion,
            id_concepto: conceptoMoraLuz.id_concepto,
            tipo_origen: 'mora_luz',
            periodo: mes_anio,
            detalle: `Multa por Mora en Consumo de Luz (${cargosLuzImpagos.length} meses acumulados sin pagar)`,
            monto_capital_inicial: 20.0,
            saldo_capital_pendiente: 20.0,
            monto_mora_acumulada: 0,
            fecha_vencimiento: fechaVencimiento,
            estado: 'Pendiente',
            created_at: new Date(),
            updated_at: new Date(),
          },
          { transaction }
        );

        mensajeMora = `¡Atención! Este es el ${cargosLuzImpagos.length}° mes consecutivo sin pagar luz. Se ha aplicado automáticamente una Multa por Mora de 20.00 Bs a la cuenta del socio.`;
      }
    }

    await transaction.commit();

    return res.status(201).json({
      mensaje: mensajeMora || 'Consumo registrado y cargo generado exitosamente.',
      consumo,
      cargo_luz: cargoLuz,
      multa_mora: multaGenerada,
      total_meses_impagos_luz: cargosLuzImpagos.length,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * getConsumos: listar consumos de la asociación, filtrable por mes_anio
 * Optimizado con INNER JOIN para resolver en 1 sola consulta SQL.
 */
const getConsumos = async (req, res, next) => {
  try {
    const id_asociacion =
      req.user.rol === 'SUPERADMIN_SAAS' && (req.query.id_asociacion || req.body.id_asociacion)
        ? req.query.id_asociacion || req.body.id_asociacion
        : req.user.id_asociacion;

    if (!id_asociacion) {
      return res.status(400).json({ mensaje: 'Debe especificar la asociación.' });
    }

    const { mes_anio } = req.query;

    const filtro = { deleted_at: null };
    if (mes_anio) filtro.mes_anio = mes_anio;

    const consumos = await ConsumoLuz.findAll({
      where: filtro,
      include: [
        {
          model: Socio,
          as: 'socio',
          where: { id_asociacion, deleted_at: null },
          required: true,
          include: [{ model: Persona, as: 'persona' }],
        },
      ],
      order: [['fecha_lectura', 'DESC']],
    });

    return res.status(200).json({ consumos });
  } catch (error) {
    next(error);
  }
};

/**
 * getConsumoSocio: historial de consumos de un socio
 */
const getConsumoSocio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion =
      req.user.rol === 'SUPERADMIN_SAAS' && (req.query.id_asociacion || req.body.id_asociacion)
        ? req.query.id_asociacion || req.body.id_asociacion
        : req.user.id_asociacion;

    if (!id_asociacion) {
      return res.status(400).json({ mensaje: 'Debe especificar la asociación.' });
    }

    const socio = await Socio.findOne({
      where: { id_socio: id, id_asociacion, deleted_at: null },
    });
    if (!socio) return res.status(404).json({ mensaje: 'Socio no encontrado.' });

    const consumos = await ConsumoLuz.findAll({
      where: { id_socio: id, deleted_at: null },
      order: [['mes_anio', 'DESC']],
    });
    return res.status(200).json({ consumos });
  } catch (error) {
    next(error);
  }
};

/**
 * getTarifaLuz: obtener precio_kwh configurado para la asociación
 */
const getTarifaLuz = async (req, res, next) => {
  try {
    const id_asociacion =
      req.user.rol === 'SUPERADMIN_SAAS' && (req.query.id_asociacion || req.body.id_asociacion)
        ? req.query.id_asociacion || req.body.id_asociacion
        : req.user.id_asociacion;

    if (!id_asociacion) {
      return res.status(400).json({ mensaje: 'Debe especificar la asociación.' });
    }

    const asoc = await Asociacion.findByPk(id_asociacion);
    const tarifa = asoc?.precio_kwh ? parseFloat(asoc.precio_kwh) : 2.0;
    return res.status(200).json({ precio_kwh: tarifa });
  } catch (error) {
    next(error);
  }
};

module.exports = { registrarConsumo, getConsumos, getConsumoSocio, getTarifaLuz };


