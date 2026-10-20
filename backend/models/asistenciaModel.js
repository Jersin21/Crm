const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');

// Modelo de Asistencia a eventos asociativos
const Asistencia = sequelize.define('asistencia', {
  id_asistencia: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_evento: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'eventos', key: 'id_evento' },
  },
  id_socio: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'socios', key: 'id_socio' },
  },
  estado_asistencia: {
    type: DataTypes.STRING(30),
    defaultValue: 'Falta',
    validate: {
      isIn: [['Presente', 'Falta', 'Licencia']],
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
  tableName: 'asistencias',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    {
      name: 'idx_asistencias_evento_socio',
      fields: ['id_evento', 'id_socio'],
    },
    {
      name: 'idx_asistencias_socio',
      fields: ['id_socio'],
    },
  ],
});

module.exports = Asistencia;
