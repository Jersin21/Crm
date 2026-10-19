const { Router } = require('express');
const { createEvento, getEventos, getEvento, updateEvento, deleteEvento } = require('../controllers/eventoController');
const { checkAuth } = require('../middleware/authMiddleware');

const router = Router();

router.use(checkAuth);

router.get('/',     getEventos);
router.get('/:id',  getEvento);
router.post('/',    createEvento);
router.put('/:id',  updateEvento);
router.delete('/:id', deleteEvento);

module.exports = router;
