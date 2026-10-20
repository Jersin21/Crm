const { Router } = require('express');
const { createEvento, getEventos, getEvento, updateEvento, deleteEvento } = require('../controllers/eventoController');
const { checkAuth, checkRole } = require('../middleware/authMiddleware');

const router = Router();

router.use(checkAuth);

router.get('/',       getEventos);
router.get('/:id',    getEvento);
router.post('/',      checkRole(['PRESIDENTE', 'ADMIN_ASOCIACION', 'SEC_NACIONAL']), createEvento);
router.put('/:id',    checkRole(['PRESIDENTE', 'ADMIN_ASOCIACION', 'SEC_NACIONAL']), updateEvento);
router.delete('/:id', checkRole(['PRESIDENTE', 'ADMIN_ASOCIACION']), deleteEvento);

module.exports = router;
