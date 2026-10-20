const { TipoEgreso } = require('../models');

/**
 * getTiposEgreso: listar categorías de egreso de la asociación
 */
const getTiposEgreso = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const tipos = await TipoEgreso.findAll({
      where: { id_asociacion, deleted_at: null },
      order: [['nombre_categoria', 'ASC']],
    });
    return res.status(200).json({ tipos });
  } catch (error) {
    next(error);
  }
};

/**
 * getTipoEgreso: obtener una categoría por id
 */
const getTipoEgreso = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;
    const tipo = await TipoEgreso.findOne({ where: { id_tipo_egreso: id, id_asociacion, deleted_at: null } });
    if (!tipo) return res.status(404).json({ mensaje: 'Tipo de egreso no encontrado.' });
    return res.status(200).json({ tipo });
  } catch (error) {
    next(error);
  }
};

/**
 * createTipoEgreso: crear nueva categoría
 */
const createTipoEgreso = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const { nombre_categoria } = req.body;
    if (!nombre_categoria || !String(nombre_categoria).trim()) {
      return res.status(400).json({ mensaje: 'El nombre de la categoría es requerido.' });
    }

    const nombreLimpio = String(nombre_categoria).trim();
    const existe = await TipoEgreso.findOne({
      where: { id_asociacion, nombre_categoria: nombreLimpio, deleted_at: null },
    });
    if (existe) {
      return res.status(400).json({ mensaje: `La categoría de egreso "${nombreLimpio}" ya existe en esta asociación.` });
    }

    const tipo = await TipoEgreso.create({
      id_asociacion,
      nombre_categoria: nombreLimpio,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return res.status(201).json({ mensaje: 'Tipo de egreso creado exitosamente.', tipo });
  } catch (error) {
    next(error);
  }
};

/**
 * updateTipoEgreso: actualizar una categoría
 */
const updateTipoEgreso = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;
    const tipo = await TipoEgreso.findOne({ where: { id_tipo_egreso: id, id_asociacion, deleted_at: null } });
    if (!tipo) return res.status(404).json({ mensaje: 'Tipo de egreso no encontrado.' });

    const { nombre_categoria } = req.body;
    if (nombre_categoria !== undefined) {
      await tipo.update({ nombre_categoria: String(nombre_categoria).trim(), updated_at: new Date() });
    }
    return res.status(200).json({ mensaje: 'Tipo de egreso actualizado.', tipo });
  } catch (error) {
    next(error);
  }
};

/**
 * deleteTipoEgreso: soft delete
 */
const deleteTipoEgreso = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;
    const tipo = await TipoEgreso.findOne({ where: { id_tipo_egreso: id, id_asociacion, deleted_at: null } });
    if (!tipo) return res.status(404).json({ mensaje: 'Tipo de egreso no encontrado.' });
    await tipo.destroy();
    return res.status(200).json({ mensaje: 'Tipo de egreso eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTiposEgreso, getTipoEgreso, createTipoEgreso, updateTipoEgreso, deleteTipoEgreso };
