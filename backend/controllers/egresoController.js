const { Egreso, TipoEgreso, Usuario, Asociacion } = require('../models');

/**
 * createEgreso: registrar un nuevo gasto
 */
const createEgreso = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const id_usuario = req.user.id_usuario;
    const { id_tipo_egreso, monto, fecha_gasto, detalle } = req.body;

    if (!id_tipo_egreso || !monto || !fecha_gasto) {
      return res.status(400).json({ mensaje: 'Tipo, monto y fecha del gasto son requeridos.' });
    }

    const egreso = await Egreso.create({
      id_asociacion, id_tipo_egreso, id_usuario, monto, fecha_gasto, detalle,
      created_at: new Date(), updated_at: new Date(),
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
    const id_asociacion = req.user.id_asociacion;
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
    const id_asociacion = req.user.id_asociacion;
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
 * updateEgreso: actualizar un egreso
 */
const updateEgreso = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;
    const egreso = await Egreso.findOne({ where: { id_egreso: id, id_asociacion, deleted_at: null } });
    if (!egreso) return res.status(404).json({ mensaje: 'Egreso no encontrado.' });
    const { id_tipo_egreso, monto, fecha_gasto, detalle } = req.body;
    await egreso.update({ id_tipo_egreso, monto, fecha_gasto, detalle, updated_at: new Date() });
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
    const id_asociacion = req.user.id_asociacion;
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
