const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET no está configurado en las variables de entorno para producción.');
    }
    return 'mercado_crm_secret_2024';
  }
  return secret;
};

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
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

/**
 * Verifica y decodifica un token JWT
 * @param {string} token
 * @returns {object} Payload decodificado
 */
const verifyJWT = (token) => {
  return jwt.verify(token, getJwtSecret());
};

module.exports = { generateJWT, verifyJWT, getJwtSecret };
