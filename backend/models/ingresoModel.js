const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');

// Modelo de Ingreso (recibo oficial emitido por caja al cobrar a un socio)
const Ingreso = sequelize.define('ingreso', {
  id_ingreso: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nro_recibo: {
    type: DataTypes.INTEGER,
    allowNull: true, // Correlativo independiente por asociación: 1, 2, 3...
  },
  id_asociacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'asociaciones', key: 'id_asociacion' },
  },
  id_socio: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'socios', key: 'id_socio' },
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'usuarios', key: 'id_usuario' }, // Directivo o cajero responsable
  },
  id_concepto: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'conceptos_cobro', key: 'id_concepto' },
  },
  concepto: {
    type: DataTypes.STRING(100),
    allowNull: true, // Ej. "Traspaso de Caseta (10%)", "Afiliación de Nuevo Socio"
  },
  tipo_origen: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'cargos', // 'cargos', 'traspaso', 'afiliacion', 'directo', 'alquiler', 'donacion'
  },
  pagador: {
    type: DataTypes.STRING(150),
    allowNull: true, // Nombre de quien entrega el dinero (comprador, nuevo socio, tercero)
  },
  monto_total_recibido: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  fecha_pago: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  estado: {
    type: DataTypes.STRING(20),
    defaultValue: 'Valido',
    validate: {
      isIn: [['Valido', 'Anulado']],
    },
  },
  observacion: {
    type: DataTypes.TEXT,
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
  tableName: 'ingresos',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    {
      name: 'idx_ingresos_asoc_recibo',
      fields: ['id_asociacion', 'nro_recibo'],
    },
    {
      name: 'idx_ingresos_asoc_socio',
      fields: ['id_asociacion', 'id_socio'],
    },
    {
      name: 'idx_ingresos_asoc_fecha',
      fields: ['id_asociacion', 'fecha_pago'],
    },
    {
      name: 'idx_ingresos_asoc_estado',
      fields: ['id_asociacion', 'estado'],
    },
    {
      name: 'idx_ingresos_asoc_cajero',
      fields: ['id_asociacion', 'id_usuario'],
    },
  ],
});

module.exports = Ingreso;
