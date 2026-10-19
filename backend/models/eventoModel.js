const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');

// Modelo de Evento (asambleas, marchas, reuniones, aniversarios o eventos de cobro)
const Evento = sequelize.define('evento', {
  id_evento: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_asociacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'asociaciones', key: 'id_asociacion' },
  },
  nombre_evento: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  tipo_evento: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['Reunion', 'Marcha', 'Asamblea', 'Evento_Cobro']],
    },
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  monto_aporte: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true, // Cuota obligatoria del evento (ej. 20 Bs aniversario)
  },
  monto_multa: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true, // Multa variable por falta o mora pasado el evento
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  id_concepto: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'conceptos_cobro', key: 'id_concepto' },
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
  tableName: 'eventos',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
});

module.exports = Evento;
