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

    if (!nombre_concepto || !String(nombre_concepto).trim()) {
      return res.status(400).json({ mensaje: 'El nombre del concepto es requerido.' });
    }

    const nombreLimpio = String(nombre_concepto).trim();
    const existe = await ConceptoCobro.findOne({
      where: { id_asociacion, nombre_concepto: nombreLimpio, deleted_at: null },
    });
    if (existe) {
      return res.status(400).json({ mensaje: `El concepto de cobro "${nombreLimpio}" ya existe en esta asociación.` });
    }

    const concepto = await ConceptoCobro.create({
      id_asociacion,
      nombre_concepto: nombreLimpio,
      monto_fijo: monto_fijo !== undefined && monto_fijo !== '' ? monto_fijo : null,
      aplica_mora: Boolean(aplica_mora),
      tasa_mora_mensual: tasa_mora_mensual !== undefined && tasa_mora_mensual !== '' ? tasa_mora_mensual : null,
      dias_gracia: dias_gracia !== undefined && dias_gracia !== '' ? parseInt(dias_gracia, 10) : 0,
      created_at: new Date(),
      updated_at: new Date(),
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

    const updateData = { updated_at: new Date() };
    if (nombre_concepto !== undefined) updateData.nombre_concepto = String(nombre_concepto).trim();
    if (monto_fijo !== undefined) updateData.monto_fijo = monto_fijo !== '' ? monto_fijo : null;
    if (aplica_mora !== undefined) updateData.aplica_mora = Boolean(aplica_mora);
    if (tasa_mora_mensual !== undefined) updateData.tasa_mora_mensual = tasa_mora_mensual !== '' ? tasa_mora_mensual : null;
    if (dias_gracia !== undefined) updateData.dias_gracia = dias_gracia !== '' ? parseInt(dias_gracia, 10) : 0;

    await concepto.update(updateData);
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
    await concepto.destroy();
    return res.status(200).json({ mensaje: 'Concepto eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getConceptos, getConcepto, createConcepto, updateConcepto, deleteConcepto };
