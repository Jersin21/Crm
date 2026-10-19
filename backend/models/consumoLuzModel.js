const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');

// Modelo de Consumo de Luz (lectura de medidores de energía eléctrica por socio)
const ConsumoLuz = sequelize.define('consumo_luz', {
  id_consumo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_socio: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'socios', key: 'id_socio' },
  },
  mes_anio: {
    type: DataTypes.STRING(20),
    allowNull: false, // Formato: 'YYYY-MM'
  },
  lectura_anterior: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  lectura_actual: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  kwh_consumidos: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false, // Calculado: lectura_actual - lectura_anterior
  },
  monto_calculado: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false, // Calculado: kwh_consumidos * 2 Bs
  },
  fecha_lectura: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  id_usuario_registro: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'usuarios', key: 'id_usuario' },
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
  tableName: 'consumos_luz',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    {
      name: 'idx_consumo_socio_mes',
      fields: ['id_socio', 'mes_anio'],
    },
    {
      name: 'idx_consumo_socio_fecha',
      fields: ['id_socio', 'fecha_lectura'],
    },
  ],
});

module.exports = ConsumoLuz;
