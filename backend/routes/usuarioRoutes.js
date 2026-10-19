const { Router } = require('express');
const {
  getUsuarios,
  getUsuario,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  toggleEstadoUsuario,
} = require('../controllers/usuarioController');
const { checkAuth, checkRole } = require('../middleware/authMiddleware');
const ROLES = require('../constants/roles');

const router = Router();

router.use(checkAuth);

// Solo PRESIDENTE puede administrar usuarios
router.get('/',               checkRole([ROLES.PRESIDENTE]), getUsuarios);
router.get('/:id',            checkRole([ROLES.PRESIDENTE]), getUsuario);
router.post('/',              checkRole([ROLES.PRESIDENTE]), createUsuario);
router.put('/:id',            checkRole([ROLES.PRESIDENTE]), updateUsuario);
router.put('/:id/estado',     checkRole([ROLES.PRESIDENTE]), toggleEstadoUsuario);
router.delete('/:id',         checkRole([ROLES.PRESIDENTE]), deleteUsuario);

module.exports = router;
