const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');

// Modelo de Detalle de Ingreso (desglose del pago aplicado a cada cargo: capital y mora)
const IngresoDetalle = sequelize.define('ingreso_detalle', {
  id_detalle: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_ingreso: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'ingresos', key: 'id_ingreso' },
  },
  id_cargo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'cargos', key: 'id_cargo' },
  },
  monto_abonado_capital: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  monto_abonado_mora: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
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
  tableName: 'ingresos_detalle',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
});

module.exports = IngresoDetalle;
