const { Op } = require('sequelize');
const { ConsumoLuz, Socio, Cargo, ConceptoCobro, Persona, Asociacion } = require('../models');

/**
 * registrarConsumo: registrar lectura de medidor y generar cargo de luz automáticamente
 * con validaciones de correlatividad y sanción por 3er mes impago consecutivo.
 */
const registrarConsumo = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const id_usuario = req.user.id_usuario;
    let { id_socio, mes_anio, lectura_anterior, lectura_actual, fecha_lectura } = req.body;

    if (!id_socio || lectura_actual === undefined) {
      return res.status(400).json({ mensaje: 'Faltan campos requeridos: id_socio y lectura_actual.' });
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    fecha_lectura = fecha_lectura || fechaHoy;
    mes_anio = mes_anio || fecha_lectura.slice(0, 7);

    // Verificar que el socio pertenezca a la asociación
    const socio = await Socio.findOne({ where: { id_socio, id_asociacion, deleted_at: null } });
    if (!socio) return res.status(404).json({ mensaje: 'Socio no encontrado en esta asociación.' });

    // Obtener historial de lecturas del socio ordenado cronológicamente
    const lecturasPrevias = await ConsumoLuz.findAll({
      where: { id_socio, deleted_at: null },
      order: [['mes_anio', 'DESC'], ['fecha_lectura', 'DESC']],
    });

    const ultimaLectura = lecturasPrevias.length > 0 ? lecturasPrevias[0] : null;

    // Si no se envió lectura_anterior, tomar la de la última lectura o 0
    if (lectura_anterior === undefined || lectura_anterior === null) {
      lectura_anterior = ultimaLectura ? parseFloat(ultimaLectura.lectura_actual) : 0;
    } else {
      lectura_anterior = parseFloat(lectura_anterior);
    }
    lectura_actual = parseFloat(lectura_actual);

    // Validación 1: Lectura actual no puede ser menor a la anterior
    if (lectura_actual < lectura_anterior) {
      return res.status(400).json({
        mensaje: `La lectura actual (${lectura_actual} kWh) no puede ser menor a la lectura anterior (${lectura_anterior} kWh).`,
      });
    }

    if (ultimaLectura) {
      // Validación 2: Fecha de lectura no puede ser anterior a la última fecha
      const dNueva = new Date(fecha_lectura);
      const dUltima = new Date(ultimaLectura.fecha_lectura);
      if (dNueva < dUltima) {
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
        return res.status(400).json({
          mensaje: `No puede saltarse el mes correlativo ${mesEsperado}. La última lecturación registrada para este socio fue ${ultimaLectura.mes_anio}.`,
        });
      }
    }

    // Validación 4: Verificar duplicidad de periodo
    const consumoExistente = await ConsumoLuz.findOne({
      where: { id_socio, mes_anio, deleted_at: null },
    });
    if (consumoExistente) {
      return res.status(400).json({
        mensaje: `El socio ya tiene una lecturación registrada para el periodo ${mes_anio}.`,
      });
    }

    // Calcular kWh y monto con la tarifa configurada en la asociación
    const kwh_consumidos = lectura_actual - lectura_anterior;
    const asoc = await Asociacion.findByPk(id_asociacion);
    const PRECIO_KWH = asoc?.precio_kwh ? parseFloat(asoc.precio_kwh) : 2.0;
    const monto_calculado = parseFloat((kwh_consumidos * PRECIO_KWH).toFixed(2));

    // Crear el registro de consumo
    const consumo = await ConsumoLuz.create({
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
    });

    // Buscar concepto de cobro 'Luz' para esta asociación
    let conceptoLuz = await ConceptoCobro.findOne({
      where: { id_asociacion, nombre_concepto: 'Luz', deleted_at: null },
    });

    if (!conceptoLuz) {
      conceptoLuz = await ConceptoCobro.create({
        id_asociacion,
        nombre_concepto: 'Luz',
        monto_fijo: null,
        aplica_mora: true,
        tasa_mora_mensual: 0.05,
        dias_gracia: 10,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    const [anioStr, mesStr] = mes_anio.split('-');
    const fechaVencimiento = new Date(parseInt(anioStr), parseInt(mesStr), 15);

    // Crear cargo de luz del mes
    const cargoLuz = await Cargo.create({
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
    });

    // ─── REGLA: 3er MES SIN PAGAR LA LUZ (APLICACIÓN AUTOMÁTICA DE MULTA POR MORA) ───
    const cargosLuzImpagos = await Cargo.findAll({
      where: {
        id_socio,
        id_asociacion,
        tipo_origen: 'luz',
        estado: { [Op.in]: ['Pendiente', 'Pagado_Parcial'] },
        deleted_at: null,
      },
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
          monto_fijo: 20.00,
          aplica_mora: false,
          tasa_mora_mensual: 0,
          dias_gracia: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const yaTieneMulta = await Cargo.findOne({
        where: {
          id_socio,
          id_asociacion,
          id_concepto: conceptoMoraLuz.id_concepto,
          periodo: mes_anio,
          deleted_at: null,
        },
      });

      if (!yaTieneMulta) {
        multaGenerada = await Cargo.create({
          id_socio,
          id_asociacion,
          id_concepto: conceptoMoraLuz.id_concepto,
          tipo_origen: 'mora_luz',
          periodo: mes_anio,
          detalle: `Multa por Mora en Consumo de Luz (${cargosLuzImpagos.length} meses acumulados sin pagar)`,
          monto_capital_inicial: 20.00,
          saldo_capital_pendiente: 20.00,
          monto_mora_acumulada: 0,
          fecha_vencimiento: fechaVencimiento,
          estado: 'Pendiente',
          created_at: new Date(),
          updated_at: new Date(),
        });

        mensajeMora = `¡Atención! Este es el ${cargosLuzImpagos.length}° mes consecutivo sin pagar luz. Se ha aplicado automáticamente una Multa por Mora de 20.00 Bs a la cuenta del socio.`;
      }
    }

    return res.status(201).json({
      mensaje: mensajeMora || 'Consumo registrado y cargo generado exitosamente.',
      consumo,
      cargo_luz: cargoLuz,
      multa_mora: multaGenerada,
      total_meses_impagos_luz: cargosLuzImpagos.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getConsumos: listar consumos de la asociación, filtrable por mes_anio
 */
const getConsumos = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const { mes_anio } = req.query;

    // Obtener socios de la asociación
    const socios = await Socio.findAll({
      where: { id_asociacion, deleted_at: null },
      attributes: ['id_socio'],
    });
    const idsSocios = socios.map(s => s.id_socio);

    const filtro = { id_socio: { [Op.in]: idsSocios }, deleted_at: null };
    if (mes_anio) filtro.mes_anio = mes_anio;

    const consumos = await ConsumoLuz.findAll({
      where: filtro,
      include: [{ model: Socio, as: 'socio', include: [{ model: Persona, as: 'persona' }] }],
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
    const id_asociacion = req.user.id_asociacion;

    const socio = await Socio.findOne({ where: { id_socio: id, id_asociacion, deleted_at: null } });
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
    const id_asociacion = req.user.id_asociacion;
    const asoc = await Asociacion.findByPk(id_asociacion);
    const tarifa = asoc?.precio_kwh ? parseFloat(asoc.precio_kwh) : 2.0;
    return res.status(200).json({ precio_kwh: tarifa });
  } catch (error) {
    next(error);
  }
};

module.exports = { registrarConsumo, getConsumos, getConsumoSocio, getTarifaLuz };

