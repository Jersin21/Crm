const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');

// Modelo de Socio (propietario o adjudicatario de caseta en el mercado)
const Socio = sequelize.define('socio', {
  id_socio: {
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
  nro_caseta: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  estado_socio: {
    type: DataTypes.STRING(30),
    defaultValue: 'Activo',
    validate: {
      isIn: [['Activo', 'Suspendido', 'Inactivo']],
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
  tableName: 'socios',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    {
      name: 'idx_socios_asoc_estado',
      fields: ['id_asociacion', 'estado_socio'],
    },
    {
      name: 'idx_socios_asoc_persona',
      fields: ['id_asociacion', 'id_persona'],
    },
    {
      name: 'idx_socios_asoc_caseta',
      fields: ['id_asociacion', 'nro_caseta'],
    },
  ],
});

module.exports = Socio;
