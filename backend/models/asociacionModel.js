const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');

// Modelo de Asociación de Mercado
const Asociacion = sequelize.define('asociacion', {
  id_asociacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre_mercado: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  direccion: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  precio_kwh: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 2.00,
    allowNull: false,
  },
  monto_serenaje: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 20.00,
    allowNull: false,
  },
  dia_corte_serenaje: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    allowNull: false,
  },
  multa_asamblea: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 30.00,
    allowNull: false,
  },
  multa_marcha: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 50.00,
    allowNull: false,
  },
  telefono: {
    type: DataTypes.STRING(50),
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
  tableName: 'asociaciones',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
});

module.exports = Asociacion;
