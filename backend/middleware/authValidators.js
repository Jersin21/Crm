const { body, validationResult } = require('express-validator');

/**
 * Middleware para validar resultados de express-validator
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      mensaje: errors.array()[0].msg,
      errores: errors.array(),
    });
  }
  next();
};

/**
 * Sanitización y validación estricta de Login (Anti-Inyección HTTP/SQL)
 */
const validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('El nombre de usuario es obligatorio.')
    .isLength({ min: 3, max: 50 }).withMessage('El username debe tener entre 3 y 50 caracteres.')
    .matches(/^[a-zA-Z0-9_.-]+$/).withMessage('El username contiene caracteres no permitidos.')
    .escape(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria.')
    .isLength({ min: 4, max: 100 }).withMessage('La contraseña debe tener al menos 4 caracteres.')
    .custom((value) => {
      // Bloquear intentos obvios de inyección SQL o payloads maliciosos comunes
      const sqlInjectionPatterns = [/(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|WAITFOR)\b)/i, /--/, /;\s*$/];
      for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(value)) {
          throw new Error('Formato de credencial no válido.');
        }
      }
      return true;
    }),
  handleValidationErrors,
];

/**
 * Validación para solicitud de recuperación de contraseña
 */
const validateForgotPassword = [
  body('identificador')
    .optional()
    .trim()
    .escape(),
  body('username')
    .optional()
    .trim()
    .escape(),
  (req, res, next) => {
    const ident = req.body.identificador || req.body.username || req.body.email;
    if (!ident || !String(ident).trim()) {
      return res.status(400).json({ mensaje: 'Debe proporcionar el username, CI o email para recuperar la cuenta.' });
    }
    next();
  },
  handleValidationErrors,
];

/**
 * Validación para restablecimiento de contraseña
 */
const validateResetPassword = [
  body('token')
    .trim()
    .notEmpty().withMessage('El token de recuperación es obligatorio.')
    .isLength({ min: 10, max: 255 }).withMessage('Token de recuperación inválido.')
    .matches(/^[a-fA-F0-9]+$/).withMessage('Token de recuperación con formato no válido.'),
  body('nueva_password')
    .optional()
    .isLength({ min: 6, max: 100 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres.'),
  body('password')
    .optional()
    .isLength({ min: 6, max: 100 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres.'),
  (req, res, next) => {
    const pass = req.body.nueva_password || req.body.password;
    if (!pass || String(pass).length < 6) {
      return res.status(400).json({ mensaje: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }
    next();
  },
  handleValidationErrors,
];

module.exports = {
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
};
