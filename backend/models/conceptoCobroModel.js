const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');

// Modelo de Concepto de Cobro (reglas de facturación: Luz, Serenaje, Multas, Aniversario, etc.)
const ConceptoCobro = sequelize.define('concepto_cobro', {
  id_concepto: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_asociacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'asociaciones', key: 'id_asociacion' },
  },
  nombre_concepto: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  monto_fijo: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true, // Null para cobros variables (como consumo eléctrico)
  },
  aplica_mora: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  tasa_mora_mensual: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true, // Tasa mensual (ej. 0.0200 = 2% mensual)
  },
  dias_gracia: {
    type: DataTypes.INTEGER,
    defaultValue: 0, // Días de tolerancia antes de empezar a devengar mora
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
  tableName: 'conceptos_cobro',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    {
      name: 'idx_conceptos_asoc_nombre',
      fields: ['id_asociacion', 'nombre_concepto'],
    },
  ],
});

module.exports = ConceptoCobro;
