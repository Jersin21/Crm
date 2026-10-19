const { Router } = require('express');
const {
  getConceptos, getConcepto, createConcepto, updateConcepto, deleteConcepto,
} = require('../controllers/conceptoCobroController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

// Consulta de conceptos (todos los directivos autenticados de la asociación)
router.get('/',       getConceptos);
router.get('/:id',    getConcepto);

// Modificación de conceptos (Exclusivo para ADMIN_ASOCIACION / PRESIDENTE)
router.post('/',      requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']), createConcepto);
router.put('/:id',    requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']), updateConcepto);
router.delete('/:id', requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']), deleteConcepto);

module.exports = router;
