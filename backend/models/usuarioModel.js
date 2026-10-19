const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');

// Modelo de Usuario del sistema (Presidente, Sec. Hacienda, Sec. Nacional)
const Usuario = sequelize.define('usuario', {
  id_usuario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_persona: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'personas', key: 'id_persona' },
  },
  id_asociacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'asociaciones', key: 'id_asociacion' },
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  rol: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: {
      isIn: [['SUPERADMIN_SAAS', 'ADMIN_ASOCIACION', 'CAJERO', 'LECTURADOR', 'PRESIDENTE', 'SEC_HACIENDA', 'SEC_NACIONAL']],
    },
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  intentos_fallidos: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  bloqueado_hasta: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  token_recuperacion: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  expiracion_token: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'usuarios',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  defaultScope: {
    attributes: { exclude: ['password', 'token_recuperacion'] },
  },
  scopes: {
    withPassword: {
      attributes: { include: ['password'] },
    },
    withRecoveryToken: {
      attributes: { include: ['token_recuperacion', 'expiracion_token'] },
    },
  },
});

module.exports = Usuario;
