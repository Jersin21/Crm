const { Router } = require('express');
const {
  getAsociaciones,
  getAsociacion,
  createAsociacion,
  updateAsociacion,
  deleteAsociacion,
  getConfiguracion,
  updateConfiguracion,
} = require('../controllers/asociacionController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { configAsociacionSchema } = require('../validators/schemas');

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Configuración institucional del mercado (MicroSaaS): Exclusivo ADMIN_ASOCIACION / PRESIDENTE
router.get('/configuracion', requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']), getConfiguracion);
router.put(
  '/configuracion',
  requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']),
  validate(configAsociacionSchema),
  updateConfiguracion
);

// Gestión de asociaciones (Superadmin o Admin de Mercado)
router.get('/',     getAsociaciones);
router.get('/:id',  getAsociacion);
router.post('/',    requireRole(['SUPERADMIN_SAAS']), createAsociacion);
router.put('/:id',  requireRole(['SUPERADMIN_SAAS', 'ADMIN_ASOCIACION', 'PRESIDENTE']), updateAsociacion);
router.delete('/:id', requireRole(['SUPERADMIN_SAAS']), deleteAsociacion);

module.exports = router;
