const { Router } = require('express');
const {
  getTiposEgreso, getTipoEgreso, createTipoEgreso, updateTipoEgreso, deleteTipoEgreso,
} = require('../controllers/tipoEgresoController');
const { checkAuth, checkRole } = require('../middleware/authMiddleware');

const router = Router();

router.use(checkAuth);

router.get('/',       getTiposEgreso);
router.get('/:id',    getTipoEgreso);
router.post('/',      checkRole(['PRESIDENTE', 'ADMIN_ASOCIACION']), createTipoEgreso);
router.put('/:id',    checkRole(['PRESIDENTE', 'ADMIN_ASOCIACION']), updateTipoEgreso);
router.delete('/:id', checkRole(['PRESIDENTE', 'ADMIN_ASOCIACION']), deleteTipoEgreso);

module.exports = router;
