const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');

// Modelo de Egreso (salidas de caja de la asociación: viáticos, oficina, reparaciones, etc.)
const Egreso = sequelize.define('egreso', {
  id_egreso: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_asociacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'asociaciones', key: 'id_asociacion' },
  },
  id_tipo_egreso: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tipos_egreso', key: 'id_tipo_egreso' },
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'usuarios', key: 'id_usuario' }, // Directivo que registra o autoriza el gasto
  },
  monto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  fecha_gasto: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  detalle: {
    type: DataTypes.STRING(255),
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
  tableName: 'egresos',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
});

module.exports = Egreso;
