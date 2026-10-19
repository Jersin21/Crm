const { sequelize } = require('../models');
const { DataTypes } = require('sequelize');

async function migrateSecurityColumns() {
  console.log('--- Iniciando migración de columnas de seguridad para Usuarios ---');
  await sequelize.authenticate();
  const queryInterface = sequelize.getQueryInterface();

  const tableInfo = await queryInterface.describeTable('usuarios');

  // 1. intentos_fallidos
  if (!tableInfo.intentos_fallidos) {
    await queryInterface.addColumn('usuarios', 'intentos_fallidos', {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    });
    console.log('✅ Columna agregada: usuarios.intentos_fallidos');
  } else {
    console.log('ℹ️ Columna ya existe: usuarios.intentos_fallidos');
  }

  // 2. bloqueado_hasta
  if (!tableInfo.bloqueado_hasta) {
    await queryInterface.addColumn('usuarios', 'bloqueado_hasta', {
      type: DataTypes.DATE,
      allowNull: true,
    });
    console.log('✅ Columna agregada: usuarios.bloqueado_hasta');
  } else {
    console.log('ℹ️ Columna ya existe: usuarios.bloqueado_hasta');
  }

  // 3. token_recuperacion
  if (!tableInfo.token_recuperacion) {
    await queryInterface.addColumn('usuarios', 'token_recuperacion', {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
    console.log('✅ Columna agregada: usuarios.token_recuperacion');
  } else {
    console.log('ℹ️ Columna ya existe: usuarios.token_recuperacion');
  }

  // 4. expiracion_token
  if (!tableInfo.expiracion_token) {
    await queryInterface.addColumn('usuarios', 'expiracion_token', {
      type: DataTypes.DATE,
      allowNull: true,
    });
    console.log('✅ Columna agregada: usuarios.expiracion_token');
  } else {
    console.log('ℹ️ Columna ya existe: usuarios.expiracion_token');
  }

  console.log('--- Migración de columnas de seguridad finalizada con éxito ---');
}

if (require.main === module) {
  migrateSecurityColumns()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error fatal al migrar columnas de seguridad:', err);
      process.exit(1);
    });
}

module.exports = { migrateSecurityColumns };
