const bcrypt = require('bcrypt');
const { Usuario, Persona, Asociacion } = require('../models');

const getUsuarios = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const usuarios = await Usuario.findAll({
      where: { id_asociacion },
      include: [
        { model: Persona, as: 'persona' },
        { model: Asociacion, as: 'asociacion' },
      ],
      attributes: { exclude: ['password'] },
      order: [['id_usuario', 'ASC']],
    });
    return res.status(200).json({ usuarios });
  } catch (error) {
    next(error);
  }
};

const getUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;

    const usuario = await Usuario.findOne({
      where: { id_usuario: id, id_asociacion },
      include: [
        { model: Persona, as: 'persona' },
        { model: Asociacion, as: 'asociacion' },
      ],
      attributes: { exclude: ['password'] },
    });

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado en esta asociación.' });
    }

    return res.status(200).json({ usuario });
  } catch (error) {
    next(error);
  }
};

const createUsuario = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const {
      nombres,
      apellidos,
      domicilio,
      telefono,
      ci,
      username,
      password,
      rol,
    } = req.body;

    if (!username || !password || !rol || !nombres || !apellidos) {
      return res.status(400).json({ mensaje: 'Todos los campos obligatorios deben ser completados.' });
    }

    const existente = await Usuario.findOne({ where: { username } });
    if (existente) {
      return res.status(400).json({ mensaje: 'El nombre de usuario ya está registrado en el sistema.' });
    }

    const persona = await Persona.create({
      nombres,
      apellidos,
      domicilio,
      telefono,
      ci,
    });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const usuario = await Usuario.create({
      id_persona: persona.id_persona,
      id_asociacion,
      username,
      password: passwordHash,
      rol,
      estado: true,
    });

    const respuesta = usuario.toJSON();
    delete respuesta.password;

    return res.status(201).json({
      mensaje: 'Usuario directivo creado exitosamente.',
      usuario: { ...respuesta, persona: persona.toJSON() },
    });
  } catch (error) {
    next(error);
  }
};

const updateUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;

    const usuario = await Usuario.findOne({
      where: { id_usuario: id, id_asociacion },
      include: [{ model: Persona, as: 'persona' }],
    });

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    const {
      nombres,
      apellidos,
      domicilio,
      telefono,
      ci,
      username,
      password,
      rol,
      estado,
    } = req.body;

    if (username && username !== usuario.username) {
      const otro = await Usuario.findOne({ where: { username } });
      if (otro) {
        return res.status(400).json({ mensaje: 'El nuevo nombre de usuario ya está en uso.' });
      }
      usuario.username = username;
    }

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      usuario.password = await bcrypt.hash(password, salt);
    }

    if (rol) usuario.rol = rol;
    if (estado !== undefined) usuario.estado = estado;

    await usuario.save();

    if (usuario.persona) {
      await usuario.persona.update({
        nombres: nombres !== undefined ? nombres : usuario.persona.nombres,
        apellidos: apellidos !== undefined ? apellidos : usuario.persona.apellidos,
        domicilio: domicilio !== undefined ? domicilio : usuario.persona.domicilio,
        telefono: telefono !== undefined ? telefono : usuario.persona.telefono,
        ci: ci !== undefined ? ci : usuario.persona.ci,
      });
    }

    const respuesta = usuario.toJSON();
    delete respuesta.password;

    return res.status(200).json({
      mensaje: 'Usuario actualizado exitosamente.',
      usuario: respuesta,
    });
  } catch (error) {
    next(error);
  }
};

const deleteUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;

    if (parseInt(id) === req.user.id_usuario) {
      return res.status(400).json({ mensaje: 'No puede eliminar su propia cuenta de usuario en sesión activa.' });
    }

    const usuario = await Usuario.findOne({ where: { id_usuario: id, id_asociacion } });
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    await usuario.destroy();

    return res.status(200).json({ mensaje: 'Usuario eliminado correctamente (soft delete).' });
  } catch (error) {
    next(error);
  }
};

const toggleEstadoUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;

    const usuario = await Usuario.findOne({ where: { id_usuario: id, id_asociacion } });
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    usuario.estado = !usuario.estado;
    await usuario.save();

    return res.status(200).json({
      mensaje: `Usuario ${usuario.estado ? 'activado' : 'desactivado'} con éxito.`,
      estado: usuario.estado,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsuarios,
  getUsuario,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  toggleEstadoUsuario,
};
