const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');

// Modelo de Cargo - Motor financiero del sistema (obligaciones económicas individuales)
const Cargo = sequelize.define('cargo', {
  id_cargo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_socio: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'socios', key: 'id_socio' },
  },
  id_asociacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'asociaciones', key: 'id_asociacion' },
  },
  id_concepto: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'conceptos_cobro', key: 'id_concepto' },
  },
  id_referencia_origen: {
    type: DataTypes.INTEGER,
    allowNull: true, // ID de consumo_luz, evento, asistencia o traspaso que originó este cargo
  },
  tipo_origen: {
    type: DataTypes.STRING(50),
    allowNull: true, // 'luz', 'serenaje', 'evento', 'multa_asistencia', 'traspaso', 'alquiler', 'manual'
  },
  periodo: {
    type: DataTypes.STRING(20),
    allowNull: true, // Formato: 'YYYY-MM'
  },
  detalle: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  monto_capital_inicial: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  saldo_capital_pendiente: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  monto_mora_acumulada: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  fecha_vencimiento: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  fecha_ultima_calc_mora: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  estado: {
    type: DataTypes.STRING(30),
    defaultValue: 'Pendiente',
    validate: {
      isIn: [['Pendiente', 'Pagado_Parcial', 'Pagado_Total', 'Anulado']],
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
  tableName: 'cargos',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    {
      name: 'idx_cargos_asoc_socio_estado',
      fields: ['id_asociacion', 'id_socio', 'estado'],
    },
    {
      name: 'idx_cargos_asoc_estado_venc',
      fields: ['id_asociacion', 'estado', 'fecha_vencimiento'],
    },
    {
      name: 'idx_cargos_asoc_concepto',
      fields: ['id_asociacion', 'id_concepto'],
    },
    {
      name: 'idx_cargos_asoc_periodo',
      fields: ['id_asociacion', 'periodo'],
    },
    {
      name: 'idx_cargos_origen',
      fields: ['tipo_origen', 'id_referencia_origen'],
    },
  ],
});

module.exports = Cargo;
