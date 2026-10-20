const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');

// Modelo de Aporte Extraordinario / Pro-Mejora (obras grandes, cerámicas, extintores, remodelaciones)
const AporteExtraordinario = sequelize.define('aporte_extraordinario', {
  id_aporte: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_asociacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'asociaciones', key: 'id_asociacion' },
  },
  id_concepto: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'conceptos_cobro', key: 'id_concepto' },
  },
  nombre_proyecto: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  monto_por_socio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  fecha_emision: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  fecha_limite: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  monto_multa_mora: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 20.00,
  },
  estado: {
    type: DataTypes.STRING(30),
    defaultValue: 'Activo',
    validate: {
      isIn: [['Activo', 'Concluido', 'Anulado']],
    },
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
  tableName: 'aportes_extraordinarios',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    {
      name: 'idx_aportes_asoc_estado',
      fields: ['id_asociacion', 'estado'],
    },
  ],
});

module.exports = AporteExtraordinario;
