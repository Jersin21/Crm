const { Router } = require('express');
const {
  createAporte,
  getAportes,
  getAporteDetalleSocios,
  aplicarMoraAporte,
  deleteAporte,
} = require('../controllers/aporteController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

// Consulta de aportes pro-mejoras
router.get('/', getAportes);
router.get('/:id/socios', getAporteDetalleSocios);

// Creación, sanción de mora y eliminación (Exclusivo ADMIN_ASOCIACION / PRESIDENTE)
router.post('/', requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']), createAporte);
router.post('/:id/aplicar-mora', requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']), aplicarMoraAporte);
router.delete('/:id', requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']), deleteAporte);

module.exports = router;
