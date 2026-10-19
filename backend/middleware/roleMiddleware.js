const { ROLES } = require('../constants/roles');

// Mapeo de equivalencias para compatibilidad bidireccional entre roles SaaS y directiva tradicional
const EQUIVALENCIAS_ROLES = {
  SUPERADMIN_SAAS: ['SUPERADMIN_SAAS'],
  ADMIN_ASOCIACION: ['ADMIN_ASOCIACION', 'PRESIDENTE', 'SUPERADMIN_SAAS'],
  PRESIDENTE: ['PRESIDENTE', 'ADMIN_ASOCIACION', 'SUPERADMIN_SAAS'],
  CAJERO: ['CAJERO', 'SEC_HACIENDA', 'ADMIN_ASOCIACION', 'PRESIDENTE', 'SUPERADMIN_SAAS'],
  SEC_HACIENDA: ['SEC_HACIENDA', 'CAJERO', 'ADMIN_ASOCIACION', 'PRESIDENTE', 'SUPERADMIN_SAAS'],
  LECTURADOR: ['LECTURADOR', 'SEC_NACIONAL', 'ADMIN_ASOCIACION', 'PRESIDENTE', 'SUPERADMIN_SAAS'],
  SEC_NACIONAL: ['SEC_NACIONAL', 'LECTURADOR', 'ADMIN_ASOCIACION', 'PRESIDENTE', 'SUPERADMIN_SAAS'],
};

/**
 * Middleware RBAC para validar roles requeridos
 * @param {string[]|string} rolesPermitidos - Lista de roles con permiso de acceso
 */
const requireRole = (rolesPermitidos = []) => {
  const allowed = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ mensaje: 'No autorizado. Se requiere iniciar sesión.' });
    }

    const userRol = req.user.rol;

    // SUPERADMIN_SAAS tiene acceso total
    if (userRol === 'SUPERADMIN_SAAS') {
      return next();
    }

    // Verificar si el rol directo o alguno de sus equivalentes está en la lista permitida
    const esPermitido = allowed.some((rolReq) => {
      if (rolReq === userRol) return true;
      const equivalentes = EQUIVALENCIAS_ROLES[rolReq] || [];
      return equivalentes.includes(userRol);
    });

    if (!esPermitido) {
      return res.status(403).json({
        mensaje: `Acceso restringido. Su rol (${userRol}) no tiene autorización para esta acción.`,
      });
    }

    next();
  };
};

module.exports = {
  requireRole,
  checkRole: requireRole,
};
