const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { Usuario, Persona, Asociacion, sequelize } = require('../models');
const { generateJWT } = require('../helpers/token');

/**
 * Login: Autenticación con sanitización, anti-inyección, bloqueo por intentos fallidos (Lockout) y JWT.
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ mensaje: 'Username y password son requeridos.' });
    }

    // 1. Buscar usuario (con password e información de lockout)
    const usuario = await Usuario.scope('withPassword').findOne({
      where: { username, deleted_at: null },
      include: [
        { model: Persona, as: 'persona' },
        { model: Asociacion, as: 'asociacion' },
      ],
    });

    if (!usuario) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
    }

    // 2. CAPA DE SEGURIDAD: Verificar si la cuenta se encuentra bloqueada por fuerza bruta
    const ahora = new Date();
    if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > ahora) {
      const minutosRestantes = Math.ceil((new Date(usuario.bloqueado_hasta) - ahora) / (1000 * 60));
      return res.status(423).json({
        status: 'locked',
        mensaje: `Cuenta bloqueada temporalmente por exceso de intentos fallidos. Por favor espere ${minutosRestantes} minuto(s) o restablezca su contraseña.`,
        bloqueado_hasta: usuario.bloqueado_hasta,
      });
    }

    // 3. Verificar contraseña contra el hash de bcrypt
    const passwordValido = await bcrypt.compare(password, usuario.password);

    if (!passwordValido) {
      // Incrementar contador de intentos fallidos
      const nuevosIntentos = (usuario.intentos_fallidos || 0) + 1;
      let nuevoBloqueo = null;

      if (nuevosIntentos >= 5) {
        // Bloqueo de cuenta por 15 minutos exactos tras 5 intentos erróneos
        nuevoBloqueo = new Date(Date.now() + 15 * 60 * 1000);
      }

      await usuario.update({
        intentos_fallidos: nuevosIntentos,
        bloqueado_hasta: nuevoBloqueo,
        updated_at: new Date(),
      });

      if (nuevosIntentos >= 5) {
        return res.status(423).json({
          status: 'locked',
          mensaje: 'Cuenta bloqueada temporalmente por alcanzar 5 intentos fallidos. Su cuenta permanecerá bloqueada por 15 minutos.',
          bloqueado_hasta: nuevoBloqueo,
        });
      }

      const intentosRestantes = 5 - nuevosIntentos;
      return res.status(401).json({
        mensaje: 'Credenciales inválidas.',
        intentos_fallidos: nuevosIntentos,
        intentos_restantes: intentosRestantes,
      });
    }

    // 4. Contraseña correcta: Resetear contador de fallos y desbloquear si estaba bloqueado
    if (usuario.intentos_fallidos > 0 || usuario.bloqueado_hasta) {
      await usuario.update({
        intentos_fallidos: 0,
        bloqueado_hasta: null,
        updated_at: new Date(),
      });
    }

    // 5. Verificar si el usuario está activo (403 si despedido/inactivo)
    if (!usuario.estado) {
      return res.status(403).json({ mensaje: 'Acceso denegado: El usuario se encuentra deshabilitado.' });
    }

    // 6. Verificar si la asociación del usuario está activa (403 si corte de suscripción SaaS)
    if (usuario.asociacion && !usuario.asociacion.estado) {
      return res.status(403).json({ mensaje: 'Acceso denegado: La asociación o mercado se encuentra inactiva o con suscripción vencida.' });
    }

    // 7. Generar token JWT con payload financiero multi-tenant seguro
    const token = generateJWT(usuario.id_usuario, usuario.rol, usuario.id_asociacion);

    const userData = {
      id_usuario: usuario.id_usuario,
      username: usuario.username,
      rol: usuario.rol,
      id_asociacion: usuario.id_asociacion,
      nombre_asociacion: usuario.asociacion?.nombre_mercado || 'Mi Asociación',
      asociacion: usuario.asociacion,
      nombres: usuario.persona?.nombres,
      apellidos: usuario.persona?.apellidos,
    };

    return res.status(200).json({
      status: true,
      token,
      usuario: userData,
      user: {
        access_token: token,
        user: userData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * olvidePassword: Genera un token criptográfico seguro de 1 hora para restablecer contraseña.
 * POST /api/auth/olvide-password
 */
const olvidePassword = async (req, res, next) => {
  try {
    const identificador = (req.body.identificador || req.body.username || req.body.email || '').trim();

    if (!identificador) {
      return res.status(400).json({ mensaje: 'Debe ingresar su nombre de usuario o carnet/email.' });
    }

    // Buscar usuario por username o CI de persona
    const usuario = await Usuario.findOne({
      where: {
        [Op.or]: [
          { username: identificador },
        ],
        deleted_at: null,
      },
      include: [{ model: Persona, as: 'persona' }],
    });

    if (!usuario) {
      // Mensaje ambiguo deliberado por seguridad para prevenir enumeración de usuarios
      return res.status(200).json({
        mensaje: 'Si el usuario existe en el sistema, se ha generado el enlace de recuperación seguro.',
      });
    }

    // Generar token criptográfico de alta entropía (64 caracteres hex) con crypto nativo
    const tokenRecuperacion = crypto.randomBytes(32).toString('hex');
    const expiracionToken = new Date(Date.now() + 60 * 60 * 1000); // 1 hora de validez

    await usuario.update({
      token_recuperacion: tokenRecuperacion,
      expiracion_token: expiracionToken,
      updated_at: new Date(),
    });

    // Simulación de envío por Email / WhatsApp Gremial
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[RECUPERACIÓN SEGURA] Token emitido para ${usuario.username}: ${tokenRecuperacion} (Válido hasta: ${expiracionToken.toISOString()})`);
    } else {
      console.log(`[RECUPERACIÓN SEGURA] Token de recuperación emitido para el usuario ID: ${usuario.id_usuario}`);
    }

    return res.status(200).json({
      mensaje: 'Instrucciones y enlace de recuperación generados exitosamente. Válido por 1 hora.',
      // Incluido para pruebas y desarrollo
      token_demo: process.env.NODE_ENV !== 'production' ? tokenRecuperacion : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * resetPassword: Valida el token, encripta la nueva clave, resetea intentos fallidos y desbloquea la cuenta.
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.body;
    const nuevaPassword = req.body.nueva_password || req.body.password;

    if (!token || !nuevaPassword) {
      return res.status(400).json({ mensaje: 'El token y la nueva contraseña son obligatorios.' });
    }

    if (String(nuevaPassword).length < 6) {
      return res.status(400).json({ mensaje: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    // Buscar usuario con el token de recuperación
    const usuario = await Usuario.scope(['withPassword', 'withRecoveryToken']).findOne({
      where: {
        token_recuperacion: token,
        deleted_at: null,
      },
    });

    if (!usuario) {
      return res.status(400).json({ mensaje: 'El token de recuperación no es válido o ya fue utilizado.' });
    }

    // Validar expiración del token
    const ahora = new Date();
    if (!usuario.expiracion_token || new Date(usuario.expiracion_token) < ahora) {
      // Limpiar token caducado
      await usuario.update({
        token_recuperacion: null,
        expiracion_token: null,
        updated_at: new Date(),
      });
      return res.status(400).json({ mensaje: 'El token de recuperación ha expirado. Solicite uno nuevo.' });
    }

    // Encriptar la nueva clave con bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(nuevaPassword, salt);

    // Restablecer clave, reiniciar intentos fallidos, limpiar bloqueo y anular el token usado
    await usuario.update({
      password: passwordHash,
      intentos_fallidos: 0,
      bloqueado_hasta: null, // Desbloqueo automático de la cuenta
      token_recuperacion: null,
      expiracion_token: null,
      updated_at: new Date(),
    });

    return res.status(200).json({
      status: true,
      mensaje: 'Contraseña actualizada exitosamente. Su cuenta ha sido desbloqueada. Ya puede iniciar sesión.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getMe: retornar el usuario actualmente autenticado
 */
const getMe = async (req, res, next) => {
  try {
    const usuario = await Usuario.findOne({
      where: { id_usuario: req.user.id_usuario, deleted_at: null },
      include: [
        { model: Persona, as: 'persona' },
        { model: Asociacion, as: 'asociacion' },
      ],
      attributes: { exclude: ['password', 'token_recuperacion'] },
    });

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    const userJson = usuario.toJSON();
    return res.status(200).json({
      ...userJson,
      usuario: userJson,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * register: crear una nueva persona + usuario
 */
const register = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      nombres, apellidos, domicilio, telefono, ci,
      username, password, rol, id_asociacion,
    } = req.body;

    // Aislamiento Multi-tenant estricto: administradores de asociación solo pueden crear usuarios en su asociación
    const targetAsocId = (req.user && req.user.rol === 'SUPERADMIN_SAAS')
      ? (id_asociacion || req.user.id_asociacion)
      : (req.user ? req.user.id_asociacion : id_asociacion);

    const usuarioExistente = await Usuario.findOne({
      where: { username, deleted_at: null },
      transaction: t,
    });
    if (usuarioExistente) {
      await t.rollback();
      return res.status(400).json({ mensaje: 'El username ya está en uso.' });
    }

    const persona = await Persona.create({
      nombres,
      apellidos,
      domicilio,
      telefono,
      ci,
      created_at: new Date(),
      updated_at: new Date(),
    }, { transaction: t });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const usuario = await Usuario.create({
      id_persona: persona.id_persona,
      id_asociacion: targetAsocId,
      username,
      password: passwordHash,
      rol,
      estado: true,
      intentos_fallidos: 0,
      bloqueado_hasta: null,
      created_at: new Date(),
      updated_at: new Date(),
    }, { transaction: t });

    await t.commit();

    return res.status(201).json({
      mensaje: 'Usuario registrado exitosamente.',
      usuario: {
        id_usuario: usuario.id_usuario,
        username: usuario.username,
        rol: usuario.rol,
        id_asociacion: usuario.id_asociacion,
        persona: { nombres, apellidos, ci },
      },
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

module.exports = {
  login,
  olvidePassword,
  resetPassword,
  getMe,
  register,
};
