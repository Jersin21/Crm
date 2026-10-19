const { ConceptoCobro, Asociacion } = require('../models');

/**
 * getConceptos: listar conceptos de cobro de la asociación
 */
const getConceptos = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const conceptos = await ConceptoCobro.findAll({
      where: { id_asociacion, deleted_at: null },
      order: [['nombre_concepto', 'ASC']],
    });
    return res.status(200).json({ conceptos });
  } catch (error) {
    next(error);
  }
};

/**
 * getConcepto: obtener un concepto por id
 */
const getConcepto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;
    const concepto = await ConceptoCobro.findOne({ where: { id_concepto: id, id_asociacion, deleted_at: null } });
    if (!concepto) return res.status(404).json({ mensaje: 'Concepto de cobro no encontrado.' });
    return res.status(200).json({ concepto });
  } catch (error) {
    next(error);
  }
};

/**
 * createConcepto: crear un nuevo concepto de cobro
 */
const createConcepto = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const { nombre_concepto, monto_fijo, aplica_mora, tasa_mora_mensual, dias_gracia } = req.body;

    if (!nombre_concepto) {
      return res.status(400).json({ mensaje: 'El nombre del concepto es requerido.' });
    }

    const concepto = await ConceptoCobro.create({
      id_asociacion,
      nombre_concepto,
      monto_fijo: monto_fijo || null,
      aplica_mora: aplica_mora || false,
      tasa_mora_mensual: tasa_mora_mensual || null,
      dias_gracia: dias_gracia || 0,
      created_at: new Date(), updated_at: new Date(),
    });
    return res.status(201).json({ mensaje: 'Concepto creado.', concepto });
  } catch (error) {
    next(error);
  }
};

/**
 * updateConcepto: actualizar un concepto de cobro
 */
const updateConcepto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;
    const concepto = await ConceptoCobro.findOne({ where: { id_concepto: id, id_asociacion, deleted_at: null } });
    if (!concepto) return res.status(404).json({ mensaje: 'Concepto no encontrado.' });
    const { nombre_concepto, monto_fijo, aplica_mora, tasa_mora_mensual, dias_gracia } = req.body;
    await concepto.update({ nombre_concepto, monto_fijo, aplica_mora, tasa_mora_mensual, dias_gracia, updated_at: new Date() });
    return res.status(200).json({ mensaje: 'Concepto actualizado.', concepto });
  } catch (error) {
    next(error);
  }
};

/**
 * deleteConcepto: soft delete
 */
const deleteConcepto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;
    const concepto = await ConceptoCobro.findOne({ where: { id_concepto: id, id_asociacion, deleted_at: null } });
    if (!concepto) return res.status(404).json({ mensaje: 'Concepto no encontrado.' });
    await concepto.update({ deleted_at: new Date(), updated_at: new Date() });
    return res.status(200).json({ mensaje: 'Concepto eliminado.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getConceptos, getConcepto, createConcepto, updateConcepto, deleteConcepto };
