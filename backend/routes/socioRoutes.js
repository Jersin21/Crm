const { Router } = require('express');
const {
  getSocios, getSocio, createSocio, updateSocio, deleteSocio, getEstadoCuenta, getDuenosExistentes,
} = require('../controllers/socioController');
const { checkAuth } = require('../middleware/authMiddleware');

const router = Router();

router.use(checkAuth);

router.get('/duenos',            getDuenosExistentes);
router.get('/',                  getSocios);
router.get('/:id',               getSocio);
router.post('/',                 createSocio);
router.put('/:id',               updateSocio);
router.delete('/:id',            deleteSocio);
router.get('/:id/estado-cuenta', getEstadoCuenta);

module.exports = router;
