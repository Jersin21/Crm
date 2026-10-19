const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Genera un token JWT para autenticación del directivo
 * @param {number} id_usuario
 * @param {string} rol
 * @param {number} id_asociacion
 * @returns {string} Token JWT firmado
 */
const generateJWT = (id_usuario, rol, id_asociacion) => {
  return jwt.sign(
    { id_usuario, rol, id_asociacion },
    process.env.JWT_SECRET || 'mercado_crm_secret_2024',
    { expiresIn: '30d' }
  );
};

module.exports = { generateJWT };
