const { Router } = require('express');
const {
  getTiposEgreso, getTipoEgreso, createTipoEgreso, updateTipoEgreso, deleteTipoEgreso,
} = require('../controllers/tipoEgresoController');
const { checkAuth } = require('../middleware/authMiddleware');

const router = Router();

router.use(checkAuth);

router.get('/',       getTiposEgreso);
router.get('/:id',    getTipoEgreso);
router.post('/',      createTipoEgreso);
router.put('/:id',    updateTipoEgreso);
router.delete('/:id', deleteTipoEgreso);

module.exports = router;
