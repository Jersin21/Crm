const { Evento, Asociacion, Asistencia, Socio, ConceptoCobro, sequelize } = require('../models');

/**
 * createEvento: crear evento y pre-crear asistencias para todos los socios activos
 * si el tipo es 'Evento_Cobro' o 'Asamblea'
 */
const createEvento = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const id_asociacion = req.user.id_asociacion;
    const { nombre_evento, tipo_evento, fecha, monto_aporte, monto_multa, descripcion, id_concepto } = req.body;

    if (!nombre_evento || !tipo_evento || !fecha) {
      await t.rollback();
      return res.status(400).json({ mensaje: 'Nombre, tipo y fecha del evento son requeridos.' });
    }

    // Resolver o auto-asignar concepto según la naturaleza del evento si no se pasó id_concepto
    let conceptoId = id_concepto;
    if (!conceptoId) {
      let nombreConceptoSugerido = 'Multa por Inasistencia';
      let montoConcepto = parseFloat(monto_multa || monto_aporte || 30.00);
      if (tipo_evento === 'Marcha') {
        nombreConceptoSugerido = 'Multa Marcha';
        montoConcepto = parseFloat(monto_multa || 50.00);
      } else if (tipo_evento === 'Asamblea') {
        nombreConceptoSugerido = 'Multa Asamblea';
        montoConcepto = parseFloat(monto_multa || 30.00);
      } else if (tipo_evento === 'Evento_Cobro') {
        nombreConceptoSugerido = 'Cuota Evento / Aniversario';
        montoConcepto = parseFloat(monto_aporte || 20.00);
      }

      const [conceptoAuto] = await ConceptoCobro.findOrCreate({
        where: { id_asociacion, nombre_concepto: nombreConceptoSugerido, deleted_at: null },
        defaults: {
          id_asociacion,
          nombre_concepto: nombreConceptoSugerido,
          monto_fijo: montoConcepto,
          aplica_mora: true,
          tasa_mora_mensual: 0.05,
          dias_gracia: 5,
          created_at: new Date(),
          updated_at: new Date(),
        },
        transaction: t,
      });
      conceptoId = conceptoAuto.id_concepto;
    }

    const evento = await Evento.create({
      id_asociacion,
      nombre_evento,
      tipo_evento,
      fecha,
      monto_aporte: monto_aporte ? parseFloat(monto_aporte) : null,
      monto_multa: monto_multa ? parseFloat(monto_multa) : null,
      descripcion,
      id_concepto: conceptoId,
      created_at: new Date(),
      updated_at: new Date(),
    }, { transaction: t });

    let asistenciasCreadas = 0;

    // Pre-crear asistencias si el tipo requiere control de asistencia
    if (['Evento_Cobro', 'Asamblea', 'Reunion', 'Marcha'].includes(tipo_evento)) {
      const socios = await Socio.findAll({
        where: { id_asociacion, estado_socio: 'Activo', deleted_at: null },
        transaction: t,
      });

      const registrosAsistencia = socios.map(s => ({
        id_evento: evento.id_evento,
        id_socio: s.id_socio,
        estado_asistencia: 'Falta', // Por defecto todos son 'Falta' hasta que se registre
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await Asistencia.bulkCreate(registrosAsistencia, { transaction: t });
      asistenciasCreadas = registrosAsistencia.length;
    }

    await t.commit();

    return res.status(201).json({
      mensaje: `Evento creado. Se generaron ${asistenciasCreadas} registros de asistencia.`,
      evento,
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * getEventos: listar eventos de la asociación
 */
const getEventos = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const eventos = await Evento.findAll({
      where: { id_asociacion, deleted_at: null },
      include: [{ model: ConceptoCobro, as: 'concepto' }],
      order: [['fecha', 'DESC']],
    });
    return res.status(200).json({ eventos });
  } catch (error) {
    next(error);
  }
};

/**
 * getEvento: obtener un evento con sus asistencias
 */
const getEvento = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;

    const evento = await Evento.findOne({
      where: { id_evento: id, id_asociacion, deleted_at: null },
      include: [
        {
          model: Asistencia,
          as: 'asistencias',
          where: { deleted_at: null },
          required: false,
          include: [{ model: Socio, as: 'socio' }],
        },
        { model: ConceptoCobro, as: 'concepto' },
      ],
    });

    if (!evento) return res.status(404).json({ mensaje: 'Evento no encontrado.' });
    return res.status(200).json({ evento });
  } catch (error) {
    next(error);
  }
};

/**
 * updateEvento: actualizar datos de un evento
 */
const updateEvento = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;

    const evento = await Evento.findOne({ where: { id_evento: id, id_asociacion, deleted_at: null } });
    if (!evento) return res.status(404).json({ mensaje: 'Evento no encontrado.' });

    const { nombre_evento, tipo_evento, fecha, monto_aporte, monto_multa, descripcion, id_concepto } = req.body;
    await evento.update({
      nombre_evento,
      tipo_evento,
      fecha,
      monto_aporte: monto_aporte !== undefined ? (monto_aporte ? parseFloat(monto_aporte) : null) : evento.monto_aporte,
      monto_multa: monto_multa !== undefined ? (monto_multa ? parseFloat(monto_multa) : null) : evento.monto_multa,
      descripcion,
      id_concepto,
      updated_at: new Date(),
    });

    return res.status(200).json({ mensaje: 'Evento actualizado.', evento });
  } catch (error) {
    next(error);
  }
};

/**
 * deleteEvento: soft delete
 */
const deleteEvento = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;
    const evento = await Evento.findOne({ where: { id_evento: id, id_asociacion, deleted_at: null } });
    if (!evento) return res.status(404).json({ mensaje: 'Evento no encontrado.' });
    await evento.destroy();
    return res.status(200).json({ mensaje: 'Evento eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createEvento, getEventos, getEvento, updateEvento, deleteEvento };
