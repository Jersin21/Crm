const { Router } = require('express');
const { updateAsistencia, getAsistenciasByEvento, aplicarMultasEvento } = require('../controllers/asistenciaController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

// PUT /api/asistencias/:id - Actualizar estado de asistencia (LECTURADOR, SEC_NACIONAL, ADMIN_ASOCIACION, PRESIDENTE)
router.put(
  '/:id',
  requireRole(['LECTURADOR', 'SEC_NACIONAL', 'ADMIN_ASOCIACION', 'PRESIDENTE']),
  updateAsistencia
);

// GET /api/asistencias/evento/:id_evento - Ver asistencias de un evento
router.get(
  '/evento/:id_evento',
  requireRole(['LECTURADOR', 'SEC_NACIONAL', 'ADMIN_ASOCIACION', 'PRESIDENTE', 'CAJERO', 'SEC_HACIENDA']),
  getAsistenciasByEvento
);

// POST /api/asistencias/evento/:id_evento/aplicar-multas - Aplicar multas a inasistentes (Exclusivo ADMIN)
router.post(
  '/evento/:id_evento/aplicar-multas',
  requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']),
  aplicarMultasEvento
);

module.exports = router;
