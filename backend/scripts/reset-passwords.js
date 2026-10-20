const db = require('../db/db');
const bcrypt = require('bcrypt');
const { QueryTypes } = require('sequelize');

async function run() {
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_RESET !== 'true') {
    console.error('⛔ SEGURIDAD: reset-passwords está bloqueado en entorno de producción sin FORCE_RESET=true');
    process.exit(1);
  }

  const newPass = process.env.RESET_TO_PASSWORD || 'misocios2024';
  const hash = await bcrypt.hash(newPass, 10);
  await db.query(
    'UPDATE usuarios SET password = ?, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE deleted_at IS NULL',
    { replacements: [hash], type: QueryTypes.UPDATE }
  );
  console.log('Contraseñas restablecidas correctamente.');

  const users = await db.query(
    'SELECT id_usuario, username, rol, id_asociacion FROM usuarios WHERE deleted_at IS NULL ORDER BY id_usuario',
    { type: QueryTypes.SELECT }
  );
  console.log('\nUsuarios del sistema:');
  users.forEach(u => console.log(u.id_usuario, u.username, u.rol, 'asoc:' + u.id_asociacion));
  process.exit(0);
}

if (require.main === module) {
  run().catch(e => { console.error(e.message); process.exit(1); });
}

module.exports = { run };
