const jwt = require('jsonwebtoken');
const { Usuario, Persona, Asociacion } = require('../models');
const { requireRole, checkRole } = require('./roleMiddleware');
require('dotenv').config();

/**
 * Middleware para validar token JWT y garantizar aislamiento Multi-tenant estricto.
 * Verifica la validez del token y que tanto el usuario como su asociación de mercado
 * estén activos (estado === true / 1). Si alguno está inactivo, rechaza con 403 Forbidden.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ mensaje: 'No autorizado. Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mercado_crm_secret_2024');

    // Buscar usuario en base de datos con su persona y asociación
    const usuario = await Usuario.findOne({
      where: {
        id_usuario: decoded.id_usuario,
        deleted_at: null,
      },
      include: [
        { model: Persona, as: 'persona' },
        { model: Asociacion, as: 'asociacion' },
      ],
    });

    if (!usuario) {
      return res.status(401).json({ mensaje: 'No autorizado. Usuario no existe o ha sido eliminado.' });
    }

    // 1. REGLA: Si el usuario está deshabilitado / inactivo (estado === 0 o false), 403 Forbidden
    if (!usuario.estado) {
      return res.status(403).json({
        mensaje: 'Acceso denegado: Su cuenta de usuario se encuentra suspendida o deshabilitada.',
      });
    }

    // 2. REGLA: Si la asociación de mercado está suspendida / inactiva, 403 Forbidden
    // (Permite suspender el servicio si el mercado no paga la suscripción)
    if (usuario.asociacion && !usuario.asociacion.estado) {
      return res.status(403).json({
        mensaje: 'Acceso denegado: La asociación o mercado se encuentra inactiva o con suscripción suspendida.',
      });
    }

    // Adjuntar datos oficiales del usuario a req.user (REGLA DE ORO DE AISLAMIENTO MULTI-TENANT)
    req.user = {
      id_usuario: usuario.id_usuario,
      rol: usuario.rol,
      id_asociacion: usuario.id_asociacion,
      username: usuario.username,
      persona: usuario.persona,
      asociacion: usuario.asociacion,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ mensaje: 'Token expirado. Por favor inicie sesión de nuevo.' });
    }
    return res.status(401).json({ mensaje: 'Token inválido o corrupto.' });
  }
};

module.exports = {
  authMiddleware,
  checkAuth: authMiddleware,
  requireRole,
  checkRole,
};
