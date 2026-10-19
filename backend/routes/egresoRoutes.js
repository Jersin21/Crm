const { Router } = require('express');
const { createEgreso, getEgresos, getEgreso, updateEgreso, deleteEgreso } = require('../controllers/egresoController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { egresoSchema } = require('../validators/schemas');

const router = Router();

router.use(authMiddleware);

// Consulta de egresos (Cajeros y Administradores)
router.get('/', getEgresos);
router.get('/:id', getEgreso);

// Registro y modificación de egresos (Exclusivo ADMIN_ASOCIACION / PRESIDENTE)
router.post(
  '/',
  requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']),
  validate(egresoSchema),
  createEgreso
);

router.put(
  '/:id',
  requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']),
  updateEgreso
);

// Anulación / Eliminación lógica de egresos (Exclusivo ADMIN_ASOCIACION / PRESIDENTE)
router.delete(
  '/:id',
  requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']),
  deleteEgreso
);

module.exports = router;
