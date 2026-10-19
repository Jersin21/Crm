const { Router } = require('express');
const { login, getMe, register, olvidePassword, resetPassword } = require('../controllers/authController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const { validateLogin, validateForgotPassword, validateResetPassword } = require('../middleware/authValidators');

const router = Router();

// POST /api/auth/login - Iniciar sesión (con sanitización express-validator y control de bloqueo)
router.post('/login', validateLogin, login);

// POST /api/auth/olvide-password - Solicitar token criptográfico de recuperación
router.post('/olvide-password', validateForgotPassword, olvidePassword);

// POST /api/auth/reset-password - Restablecer contraseña con token seguro y desbloqueo
router.post('/reset-password', validateResetPassword, resetPassword);

// POST /api/auth/register - Registrar nuevo usuario (solo Administradores autenticados)
router.post(
  '/register',
  authMiddleware,
  requireRole(['SUPERADMIN_SAAS', 'ADMIN_ASOCIACION', 'PRESIDENTE']),
  register
);

// GET /api/auth/me - Obtener usuario actual autenticado
router.get('/me', authMiddleware, getMe);

module.exports = router;
