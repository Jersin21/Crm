const { Op } = require('sequelize');
const { Asistencia, Evento, Socio, Cargo, ConceptoCobro, Persona } = require('../models');

/**
 * updateAsistencia: actualizar estado de asistencia.
 * Si es 'Falta' y el evento tiene monto_aporte o concepto, crear Cargo automáticamente.
 */
const updateAsistencia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado_asistencia } = req.body;
    const id_asociacion = req.user.id_asociacion;

    const asistencia = await Asistencia.findOne({
      where: { id_asistencia: id, deleted_at: null },
      include: [
        {
          model: Evento,
          as: 'evento',
          where: { id_asociacion, deleted_at: null },
          include: [{ model: ConceptoCobro, as: 'concepto' }],
        },
        { model: Socio, as: 'socio' },
      ],
    });

    if (!asistencia) return res.status(404).json({ mensaje: 'Registro de asistencia no encontrado.' });

    // Validar si la fecha del evento ya pasó: si ya concluyó, bloquear modificación
    const fechaEvento = new Date(asistencia.evento.fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaEvento.setHours(0, 0, 0, 0);

    if (fechaEvento < hoy) {
      return res.status(400).json({
        mensaje: `El evento "${asistencia.evento.nombre_evento}" ya concluyó. La lista de asistencia se encuentra cerrada y las multas ya fueron aplicadas en caja. No es posible modificarla.`,
      });
    }

    const estadoAnterior = asistencia.estado_asistencia;
    await asistencia.update({ estado_asistencia, updated_at: new Date() });

    let cargoCreado = null;

    // Si el nuevo estado es 'Falta' y antes no era Falta, crear cargo de multa
    if (estado_asistencia === 'Falta' && estadoAnterior !== 'Falta') {
      const evento = asistencia.evento;
      const montoMulta = parseFloat(evento.monto_multa || evento.monto_aporte || 30.00);

      let concepto = evento.concepto;
      if (!concepto) {
        let nombreConcepto = `Multa por Falta: ${evento.tipo_evento}`;
        if (evento.tipo_evento === 'Marcha') nombreConcepto = 'Multa Marcha';
        else if (evento.tipo_evento === 'Asamblea') nombreConcepto = 'Multa Asamblea';
        else if (evento.tipo_evento === 'Evento_Cobro') nombreConcepto = 'Multa / Cuota Evento';

        const [conceptoAuto] = await ConceptoCobro.findOrCreate({
          where: { id_asociacion, nombre_concepto: nombreConcepto, deleted_at: null },
          defaults: {
            id_asociacion,
            nombre_concepto: nombreConcepto,
            monto_fijo: montoMulta,
            aplica_mora: true,
            tasa_mora_mensual: 0.05,
            dias_gracia: 5,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
        concepto = conceptoAuto;
      }

      // Verificar si ya existía un cargo para esta asistencia
      let cargoExistente = await Cargo.findOne({
        where: {
          id_socio: asistencia.id_socio,
          id_referencia_origen: asistencia.id_asistencia,
          tipo_origen: 'evento',
          deleted_at: null,
        },
      });

      if (!cargoExistente) {
        const fechaEvento = new Date(evento.fecha);
        const fechaVencimiento = new Date(fechaEvento);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + (concepto.dias_gracia || 5) + 15);

        cargoCreado = await Cargo.create({
          id_socio: asistencia.id_socio,
          id_asociacion,
          id_concepto: concepto.id_concepto,
          id_referencia_origen: asistencia.id_asistencia,
          tipo_origen: 'evento',
          periodo: fechaEvento.toISOString().slice(0, 7),
          detalle: `Multa por inasistencia en: ${evento.nombre_evento} (${evento.tipo_evento})`,
          monto_capital_inicial: montoMulta,
          saldo_capital_pendiente: montoMulta,
          monto_mora_acumulada: 0,
          fecha_vencimiento: fechaVencimiento,
          estado: 'Pendiente',
          created_at: new Date(), updated_at: new Date(),
        });
      } else if (cargoExistente.estado === 'Anulado') {
        await cargoExistente.update({
          estado: 'Pendiente',
          saldo_capital_pendiente: montoMulta,
          updated_at: new Date(),
        });
        cargoCreado = cargoExistente;
      }
    } else if (estado_asistencia !== 'Falta' && estadoAnterior === 'Falta') {
      // Si se rectifica a Presente o Licencia, anular el cargo de multa pendiente si no se cobró aún
      const cargoPendiente = await Cargo.findOne({
        where: {
          id_socio: asistencia.id_socio,
          id_referencia_origen: asistencia.id_asistencia,
          tipo_origen: 'evento',
          estado: 'Pendiente',
          deleted_at: null,
        },
      });
      if (cargoPendiente) {
        await cargoPendiente.update({ estado: 'Anulado', updated_at: new Date() });
      }
    }

    return res.status(200).json({
      mensaje: 'Asistencia actualizada.',
      asistencia,
      cargo_generado: cargoCreado,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * aplicarMultasEvento: aplica multas masivas a todos los socios marcados con Falta
 * o con cuotas pendientes en un evento (especialmente si el evento ya concluyó)
 */
const aplicarMultasEvento = async (req, res, next) => {
  try {
    const { id_evento } = req.params;
    const id_asociacion = req.user.id_asociacion;

    const evento = await Evento.findOne({
      where: { id_evento, id_asociacion, deleted_at: null },
      include: [{ model: ConceptoCobro, as: 'concepto' }],
    });
    if (!evento) return res.status(404).json({ mensaje: 'Evento no encontrado.' });

    const montoMulta = parseFloat(evento.monto_multa || evento.monto_aporte || 30.00);

    let concepto = evento.concepto;
    if (!concepto) {
      let nombreConcepto = `Multa por Falta: ${evento.tipo_evento}`;
      if (evento.tipo_evento === 'Marcha') nombreConcepto = 'Multa Marcha';
      else if (evento.tipo_evento === 'Asamblea') nombreConcepto = 'Multa Asamblea';
      else if (evento.tipo_evento === 'Evento_Cobro') nombreConcepto = 'Multa / Cuota Evento';

      const [conceptoAuto] = await ConceptoCobro.findOrCreate({
        where: { id_asociacion, nombre_concepto: nombreConcepto, deleted_at: null },
        defaults: {
          id_asociacion,
          nombre_concepto: nombreConcepto,
          monto_fijo: montoMulta,
          aplica_mora: true,
          tasa_mora_mensual: 0.05,
          dias_gracia: 5,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      concepto = conceptoAuto;
    }

    const asistenciasFalta = await Asistencia.findAll({
      where: { id_evento, estado_asistencia: 'Falta', deleted_at: null },
    });

    const fechaEvento = new Date(evento.fecha);
    const fechaVencimiento = new Date(fechaEvento);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + (concepto.dias_gracia || 5) + 15);

    let cargosCreados = 0;
    if (asistenciasFalta.length > 0) {
      const idsAsistencias = asistenciasFalta.map(a => a.id_asistencia);
      const cargosExistentes = await Cargo.findAll({
        where: {
          id_asociacion,
          id_referencia_origen: { [Op.in]: idsAsistencias },
          tipo_origen: 'evento',
          deleted_at: null,
        },
        attributes: ['id_referencia_origen'],
      });

      const setExistentes = new Set(cargosExistentes.map(c => c.id_referencia_origen));
      const cargosAInsertar = [];

      for (const a of asistenciasFalta) {
        if (!setExistentes.has(a.id_asistencia)) {
          cargosAInsertar.push({
            id_socio: a.id_socio,
            id_asociacion,
            id_concepto: concepto.id_concepto,
            id_referencia_origen: a.id_asistencia,
            tipo_origen: 'evento',
            periodo: fechaEvento.toISOString().slice(0, 7),
            detalle: `Multa por inasistencia en: ${evento.nombre_evento} (${evento.tipo_evento})`,
            monto_capital_inicial: montoMulta,
            saldo_capital_pendiente: montoMulta,
            monto_mora_acumulada: 0,
            fecha_vencimiento: fechaVencimiento,
            estado: 'Pendiente',
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }

      if (cargosAInsertar.length > 0) {
        await Cargo.bulkCreate(cargosAInsertar);
        cargosCreados = cargosAInsertar.length;
      }
    }

    return res.status(200).json({
      mensaje: `Multas procesadas para el evento "${evento.nombre_evento}". Se crearon ${cargosCreados} nuevo(s) cargo(s) por inasistencia.`,
      cargos_creados: cargosCreados,
      total_faltas: asistenciasFalta.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getAsistenciasByEvento: obtener todas las asistencias de un evento
 */
const getAsistenciasByEvento = async (req, res, next) => {
  try {
    const { id_evento } = req.params;
    const id_asociacion = req.user.id_asociacion;

    // Verificar que el evento pertenezca a la asociación
    const evento = await Evento.findOne({ where: { id_evento, id_asociacion, deleted_at: null } });
    if (!evento) return res.status(404).json({ mensaje: 'Evento no encontrado.' });

    const asistencias = await Asistencia.findAll({
      where: { id_evento, deleted_at: null },
      include: [{
        model: Socio, as: 'socio',
        include: [{ model: Persona, as: 'persona' }],
      }],
      order: [[{ model: Socio, as: 'socio' }, { model: Persona, as: 'persona' }, 'apellidos', 'ASC']],
    });

    const fechaEvento = new Date(evento.fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaEvento.setHours(0, 0, 0, 0);
    const eventoConcluido = fechaEvento < hoy;

    // Si el evento ya concluyó, asegurar que todas las Faltas tengan su cargo de multa creado
    if (eventoConcluido) {
      const asistenciasFalta = asistencias.filter((a) => a.estado_asistencia === 'Falta');
      if (asistenciasFalta.length > 0) {
        const montoMulta = parseFloat(evento.monto_multa || evento.monto_aporte || 30.0);
        let [conceptoAuto] = await ConceptoCobro.findOrCreate({
          where: { id_asociacion, nombre_concepto: `Multa por Falta: ${evento.tipo_evento}`, deleted_at: null },
          defaults: {
            id_asociacion,
            nombre_concepto: `Multa por Falta: ${evento.tipo_evento}`,
            monto_fijo: montoMulta,
            aplica_mora: true,
            tasa_mora_mensual: 0.05,
            dias_gracia: 5,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        const idsAsistencias = asistenciasFalta.map((a) => a.id_asistencia);
        const cargosExistentes = await Cargo.findAll({
          where: {
            id_asociacion,
            id_referencia_origen: { [Op.in]: idsAsistencias },
            tipo_origen: 'evento',
            deleted_at: null,
          },
          attributes: ['id_referencia_origen'],
        });

        const setExistentes = new Set(cargosExistentes.map((c) => c.id_referencia_origen));
        const cargosAInsertar = [];

        for (const a of asistenciasFalta) {
          if (!setExistentes.has(a.id_asistencia)) {
            cargosAInsertar.push({
              id_socio: a.id_socio,
              id_asociacion,
              id_concepto: conceptoAuto.id_concepto,
              id_referencia_origen: a.id_asistencia,
              tipo_origen: 'evento',
              periodo: fechaEvento.toISOString().slice(0, 7),
              detalle: `Multa por inasistencia en: ${evento.nombre_evento} (${evento.tipo_evento})`,
              monto_capital_inicial: montoMulta,
              saldo_capital_pendiente: montoMulta,
              monto_mora_acumulada: 0,
              fecha_vencimiento: new Date(fechaEvento.getTime() + 15 * 86400000),
              estado: 'Pendiente',
              created_at: new Date(),
              updated_at: new Date(),
            });
          }
        }

        if (cargosAInsertar.length > 0) {
          await Cargo.bulkCreate(cargosAInsertar);
        }
      }
    }

    return res.status(200).json({ asistencias, evento_concluido: eventoConcluido });
  } catch (error) {
    next(error);
  }
};

module.exports = { updateAsistencia, getAsistenciasByEvento, aplicarMultasEvento };
