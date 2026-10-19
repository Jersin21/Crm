// Roles oficiales del sistema Micro-SaaS MercadoCRM
const ROLES = {
  SUPERADMIN_SAAS: 'SUPERADMIN_SAAS',
  ADMIN_ASOCIACION: 'ADMIN_ASOCIACION',
  CAJERO: 'CAJERO',
  LECTURADOR: 'LECTURADOR',
  // Roles tradicionales de la Directiva del Mercado (compatibilidad 100%):
  PRESIDENTE: 'PRESIDENTE',
  SEC_HACIENDA: 'SEC_HACIENDA',
  SEC_NACIONAL: 'SEC_NACIONAL',
};

// Agrupaciones de permisos para RBAC
const GRUPOS_ROLES = {
  // Administradores con potestad máxima sobre la asociación
  ADMINISTRADORES: [ROLES.SUPERADMIN_SAAS, ROLES.ADMIN_ASOCIACION, ROLES.PRESIDENTE],
  // Operadores de cobranza y caja
  CAJEROS: [ROLES.SUPERADMIN_SAAS, ROLES.ADMIN_ASOCIACION, ROLES.PRESIDENTE, ROLES.CAJERO, ROLES.SEC_HACIENDA],
  // Operadores de campo (lecturación de medidores y toma de asistencias)
  LECTURADORES: [ROLES.SUPERADMIN_SAAS, ROLES.ADMIN_ASOCIACION, ROLES.PRESIDENTE, ROLES.LECTURADOR, ROLES.SEC_NACIONAL],
};

module.exports = { ROLES, GRUPOS_ROLES, ...ROLES };
