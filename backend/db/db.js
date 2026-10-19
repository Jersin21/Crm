const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Sequelize } = require('sequelize');

// Conexión a la base de datos MySQL con Sequelize
const sequelize = new Sequelize(
  process.env.DATABASE || 'MiSocios',
  process.env.USER || 'root',
  process.env.PASSWORD || '',
  {
    host: process.env.HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20, // Conexiones concurrentes máximas (óptimo para VPS 2-4GB)
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,  // Pool caliente: previene latencia de handshake inicial
      acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000, // Tiempo máx (ms) antes de timeout
      idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,       // Tiempo máx (ms) antes de liberar conexión inactiva
      evict: 1000, // Limpieza periódica de conexiones muertas cada segundo
    },
    define: {
      timestamps: true,
      paranoid: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      underscored: true,
    },
  }
);

module.exports = sequelize;
