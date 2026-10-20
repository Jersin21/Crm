const { Egreso, TipoEgreso, Usuario, Asociacion } = require('../models');

/**
 * createEgreso: registrar un nuevo gasto
 */
const createEgreso = async (req, res, next) => {
  try {
    const id_asociacion =
      req.user.rol === 'SUPERADMIN_SAAS' && (req.body.id_asociacion || req.query.id_asociacion)
        ? req.body.id_asociacion || req.query.id_asociacion
        : req.user.id_asociacion;
    const id_usuario = req.user.id_usuario;

    if (!id_asociacion) {
      return res.status(400).json({ mensaje: 'Debe especificar la asociación.' });
    }

    const { id_tipo_egreso, monto, fecha_gasto, detalle } = req.body;

    if (!id_tipo_egreso || monto === undefined || monto === null || !fecha_gasto) {
      return res.status(400).json({ mensaje: 'Tipo, monto y fecha del gasto son requeridos.' });
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return res.status(400).json({ mensaje: 'El monto del egreso debe ser mayor a 0 Bs.' });
    }

    // Validar que la categoría de egreso pertenezca a la misma asociación
    const tipoEgreso = await TipoEgreso.findOne({
      where: { id_tipo_egreso, id_asociacion, deleted_at: null },
    });
    if (!tipoEgreso) {
      return res.status(400).json({ mensaje: 'La categoría de egreso especificada no existe en esta asociación.' });
    }

    const egreso = await Egreso.create({
      id_asociacion,
      id_tipo_egreso,
      id_usuario,
      monto: montoNum,
      fecha_gasto,
      detalle: detalle ? String(detalle).trim() : '',
      created_at: new Date(),
      updated_at: new Date(),
    });

    return res.status(201).json({ mensaje: 'Egreso registrado.', egreso });
  } catch (error) {
    next(error);
  }
};

/**
 * getEgresos: listar egresos de la asociación
 */
const getEgresos = async (req, res, next) => {
  try {
    const id_asociacion =
      req.user.rol === 'SUPERADMIN_SAAS' && (req.query.id_asociacion || req.body.id_asociacion)
        ? req.query.id_asociacion || req.body.id_asociacion
        : req.user.id_asociacion;

    if (!id_asociacion) {
      return res.status(400).json({ mensaje: 'Debe especificar la asociación.' });
    }

    const egresos = await Egreso.findAll({
      where: { id_asociacion, deleted_at: null },
      include: [
        { model: TipoEgreso, as: 'tipo_egreso' },
        { model: Usuario, as: 'usuario', attributes: { exclude: ['password'] } },
      ],
      order: [['fecha_gasto', 'DESC']],
    });
    return res.status(200).json({ egresos });
  } catch (error) {
    next(error);
  }
};

/**
 * getEgreso: obtener un egreso por id
 */
const getEgreso = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion =
      req.user.rol === 'SUPERADMIN_SAAS' && (req.query.id_asociacion || req.body.id_asociacion)
        ? req.query.id_asociacion || req.body.id_asociacion
        : req.user.id_asociacion;

    if (!id_asociacion) {
      return res.status(400).json({ mensaje: 'Debe especificar la asociación.' });
    }

    const egreso = await Egreso.findOne({
      where: { id_egreso: id, id_asociacion, deleted_at: null },
      include: [
        { model: TipoEgreso, as: 'tipo_egreso' },
        { model: Usuario, as: 'usuario', attributes: { exclude: ['password'] } },
      ],
    });
    if (!egreso) return res.status(404).json({ mensaje: 'Egreso no encontrado.' });
    return res.status(200).json({ egreso });
  } catch (error) {
    next(error);
  }
};

/**
 * updateEgreso: actualizar un egreso protegiendo campos parciales
 */
const updateEgreso = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion =
      req.user.rol === 'SUPERADMIN_SAAS' && (req.query.id_asociacion || req.body.id_asociacion)
        ? req.query.id_asociacion || req.body.id_asociacion
        : req.user.id_asociacion;

    if (!id_asociacion) {
      return res.status(400).json({ mensaje: 'Debe especificar la asociación.' });
    }

    const egreso = await Egreso.findOne({
      where: { id_egreso: id, id_asociacion, deleted_at: null },
    });
    if (!egreso) return res.status(404).json({ mensaje: 'Egreso no encontrado.' });

    const { id_tipo_egreso, monto, fecha_gasto, detalle } = req.body;
    const updateData = {};

    if (id_tipo_egreso !== undefined) {
      const tipoEgreso = await TipoEgreso.findOne({
        where: { id_tipo_egreso, id_asociacion, deleted_at: null },
      });
      if (!tipoEgreso) {
        return res.status(400).json({ mensaje: 'La categoría de egreso especificada no existe en esta asociación.' });
      }
      updateData.id_tipo_egreso = id_tipo_egreso;
    }

    if (monto !== undefined) {
      const montoNum = parseFloat(monto);
      if (isNaN(montoNum) || montoNum <= 0) {
        return res.status(400).json({ mensaje: 'El monto del egreso debe ser mayor a 0 Bs.' });
      }
      updateData.monto = montoNum;
    }

    if (fecha_gasto !== undefined) {
      updateData.fecha_gasto = fecha_gasto;
    }

    if (detalle !== undefined) {
      updateData.detalle = String(detalle).trim();
    }

    updateData.updated_at = new Date();
    await egreso.update(updateData);

    return res.status(200).json({ mensaje: 'Egreso actualizado.', egreso });
  } catch (error) {
    next(error);
  }
};

/**
 * deleteEgreso: Anulación / Soft delete de egreso con trazabilidad contable
 */
const deleteEgreso = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion =
      req.user.rol === 'SUPERADMIN_SAAS' && (req.query.id_asociacion || req.body.id_asociacion)
        ? req.query.id_asociacion || req.body.id_asociacion
        : req.user.id_asociacion;

    if (!id_asociacion) {
      return res.status(400).json({ mensaje: 'Debe especificar la asociación.' });
    }

    const egreso = await Egreso.findOne({
      where: { id_egreso: id, id_asociacion, deleted_at: null },
    });
    if (!egreso) return res.status(404).json({ mensaje: 'Egreso no encontrado en esta asociación.' });

    // Soft delete (paranoid: true asigna deleted_at sin destruir el registro físico)
    await egreso.destroy();
    return res.status(200).json({ mensaje: 'Egreso anulado/eliminado correctamente.', id_egreso: id });
  } catch (error) {
    next(error);
  }
};

module.exports = { createEgreso, getEgresos, getEgreso, updateEgreso, deleteEgreso };

