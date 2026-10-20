const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');

// Modelo de Tipo de Egreso (categorías de gasto de la asociación: Oficina, Viáticos, Mantenimiento, Limpieza)
const TipoEgreso = sequelize.define('tipo_egreso', {
  id_tipo_egreso: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_asociacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'asociaciones', key: 'id_asociacion' },
  },
  nombre_categoria: {
    type: DataTypes.STRING(100),
    allowNull: false,
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
  tableName: 'tipos_egreso',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    {
      name: 'idx_tipos_egreso_asoc',
      fields: ['id_asociacion'],
    },
  ],
});

module.exports = TipoEgreso;
