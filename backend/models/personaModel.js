const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');

// Modelo de Persona (datos personales compartidos por socios y usuarios directivos)
const Persona = sequelize.define('persona', {
  id_persona: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombres: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  apellidos: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  domicilio: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  telefono: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  ci: {
    type: DataTypes.STRING(30),
    allowNull: true, // Cédula de identidad
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
  tableName: 'personas',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
});

module.exports = Persona;
