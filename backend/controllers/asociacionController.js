const { Asociacion } = require('../models');

/**
 * getAsociaciones: listar todas las asociaciones activas
 */
const getAsociaciones = async (req, res, next) => {
  try {
    const asociaciones = await Asociacion.findAll({
      where: { deleted_at: null },
      order: [['id_asociacion', 'ASC']],
    });
    return res.status(200).json({ asociaciones });
  } catch (error) {
    next(error);
  }
};

/**
 * getAsociacion: obtener una asociación por id
 */
const getAsociacion = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.rol !== 'SUPERADMIN_SAAS' && parseInt(id, 10) !== parseInt(req.user.id_asociacion, 10)) {
      return res.status(403).json({ mensaje: 'Acceso denegado: No tiene permisos para consultar otra asociación.' });
    }

    const asociacion = await Asociacion.findOne({
      where: { id_asociacion: id, deleted_at: null },
    });
    if (!asociacion) {
      return res.status(404).json({ mensaje: 'Asociación no encontrada.' });
    }
    return res.status(200).json({ asociacion });
  } catch (error) {
    next(error);
  }
};

/**
 * createAsociacion: crear una nueva asociación
 */
const createAsociacion = async (req, res, next) => {
  try {
    const { nombre_mercado, direccion } = req.body;
    if (!nombre_mercado) {
      return res.status(400).json({ mensaje: 'El nombre del mercado es requerido.' });
    }
    const asociacion = await Asociacion.create({
      nombre_mercado,
      direccion,
      estado: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return res.status(201).json({ mensaje: 'Asociación creada exitosamente.', asociacion });
  } catch (error) {
    next(error);
  }
};

/**
 * updateAsociacion: actualizar datos de una asociación
 */
const updateAsociacion = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.rol !== 'SUPERADMIN_SAAS' && parseInt(id, 10) !== parseInt(req.user.id_asociacion, 10)) {
      return res.status(403).json({ mensaje: 'Acceso denegado: No tiene permisos para modificar otra asociación.' });
    }

    const asociacion = await Asociacion.findOne({ where: { id_asociacion: id, deleted_at: null } });
    if (!asociacion) {
      return res.status(404).json({ mensaje: 'Asociación no encontrada.' });
    }
    const { nombre_mercado, direccion, estado } = req.body;
    const updatePayload = {
      ...(nombre_mercado !== undefined ? { nombre_mercado } : {}),
      ...(direccion !== undefined ? { direccion } : {}),
      updated_at: new Date(),
    };
    if (req.user.rol === 'SUPERADMIN_SAAS' && estado !== undefined) {
      updatePayload.estado = estado;
    }

    await asociacion.update(updatePayload);
    return res.status(200).json({ mensaje: 'Asociación actualizada.', asociacion });
  } catch (error) {
    next(error);
  }
};

/**
 * deleteAsociacion: soft delete (marcar deleted_at)
 */
const deleteAsociacion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const asociacion = await Asociacion.findOne({ where: { id_asociacion: id, deleted_at: null } });
    if (!asociacion) {
      return res.status(404).json({ mensaje: 'Asociación no encontrada.' });
    }
    await asociacion.update({ deleted_at: new Date(), updated_at: new Date() });
    return res.status(200).json({ mensaje: 'Asociación eliminada correctamente.' });
  } catch (error) {
    next(error);
  }
};

/**
 * getConfiguracion: obtener parámetros de configuración de la asociación del usuario autenticado
 */
const getConfiguracion = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const asociacion = await Asociacion.findOne({
      where: { id_asociacion, deleted_at: null },
    });
    if (!asociacion) {
      return res.status(404).json({ mensaje: 'Asociación no encontrada.' });
    }
    const configuracionData = {
      id_asociacion: asociacion.id_asociacion,
      nombre_mercado: asociacion.nombre_mercado,
      direccion: asociacion.direccion,
      telefono: asociacion.telefono,
      precio_kwh: parseFloat(asociacion.precio_kwh || 2.00),
      monto_serenaje: parseFloat(asociacion.monto_serenaje || 20.00),
      dia_corte_serenaje: asociacion.dia_corte_serenaje || 5,
      multa_asamblea: parseFloat(asociacion.multa_asamblea || 30.00),
      multa_marcha: parseFloat(asociacion.multa_marcha || 50.00),
    };
    return res.status(200).json({
      configuracion: configuracionData,
      asociacion: configuracionData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * updateConfiguracion: actualizar parámetros de configuración (exclusivo para rol PRESIDENTE)
 */
const updateConfiguracion = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const asociacion = await Asociacion.findOne({
      where: { id_asociacion, deleted_at: null },
    });
    if (!asociacion) {
      return res.status(404).json({ mensaje: 'Asociación no encontrada.' });
    }

    const {
      precio_kwh,
      monto_serenaje,
      dia_corte_serenaje,
      multa_asamblea,
      multa_marcha,
      nombre_mercado,
      direccion,
      telefono,
    } = req.body;

    const updateData = {};
    if (precio_kwh !== undefined && precio_kwh !== null && precio_kwh !== '') {
      updateData.precio_kwh = parseFloat(precio_kwh);
    }
    if (monto_serenaje !== undefined && monto_serenaje !== null && monto_serenaje !== '') {
      updateData.monto_serenaje = parseFloat(monto_serenaje);
    }
    if (dia_corte_serenaje !== undefined && dia_corte_serenaje !== null && dia_corte_serenaje !== '') {
      updateData.dia_corte_serenaje = parseInt(dia_corte_serenaje);
    }
    if (multa_asamblea !== undefined && multa_asamblea !== null && multa_asamblea !== '') {
      updateData.multa_asamblea = parseFloat(multa_asamblea);
    }
    if (multa_marcha !== undefined && multa_marcha !== null && multa_marcha !== '') {
      updateData.multa_marcha = parseFloat(multa_marcha);
    }
    if (nombre_mercado !== undefined) updateData.nombre_mercado = nombre_mercado;
    if (direccion !== undefined) updateData.direccion = direccion;
    if (telefono !== undefined) updateData.telefono = telefono;

    updateData.updated_at = new Date();
    await asociacion.update(updateData);

    // Sincronizar concepto de cobro 'Serenaje' si se cambió el monto
    if (monto_serenaje !== undefined) {
      const { ConceptoCobro } = require('../models');
      await ConceptoCobro.update(
        { monto_fijo: parseFloat(monto_serenaje), updated_at: new Date() },
        { where: { id_asociacion, nombre_concepto: 'Serenaje', deleted_at: null } }
      );
    }

    return res.status(200).json({
      mensaje: 'Parámetros del mercado actualizados exitosamente.',
      configuracion: asociacion,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAsociaciones,
  getAsociacion,
  createAsociacion,
  updateAsociacion,
  deleteAsociacion,
  getConfiguracion,
  updateConfiguracion,
};
