// Archivo índice de modelos: importa todos los modelos y establece las asociaciones relacionales completas
const { Sequelize } = require('sequelize');
const sequelize = require('../db/db');

const Asociacion     = require('./asociacionModel');
const Persona        = require('./personaModel');
const Usuario        = require('./usuarioModel');
const Socio          = require('./socioModel');
const ConceptoCobro  = require('./conceptoCobroModel');
const ConsumoLuz     = require('./consumoLuzModel');
const Evento         = require('./eventoModel');
const Asistencia     = require('./asistenciaModel');
const Cargo          = require('./cargoModel');
const Ingreso        = require('./ingresoModel');
const IngresoDetalle = require('./ingresoDetalleModel');
const TipoEgreso     = require('./tipoEgresoModel');
const Egreso         = require('./egresoModel');
const AporteExtraordinario = require('./aporteExtraordinarioModel');

// ===================================
// ASOCIACIONES RELACIONALES COMPLETAS
// ===================================

// --- Usuario ---
Usuario.belongsTo(Persona,    { foreignKey: 'id_persona',    as: 'persona' });
Usuario.belongsTo(Asociacion, { foreignKey: 'id_asociacion', as: 'asociacion' });
Persona.hasMany(Usuario,      { foreignKey: 'id_persona',    as: 'usuarios' });
Asociacion.hasMany(Usuario,   { foreignKey: 'id_asociacion', as: 'usuarios' });

// --- Socio ---
Socio.belongsTo(Persona,    { foreignKey: 'id_persona',    as: 'persona' });
Socio.belongsTo(Asociacion, { foreignKey: 'id_asociacion', as: 'asociacion' });
Persona.hasMany(Socio,      { foreignKey: 'id_persona',    as: 'socios' });
Asociacion.hasMany(Socio,   { foreignKey: 'id_asociacion', as: 'socios' });

// --- ConceptoCobro ---
ConceptoCobro.belongsTo(Asociacion, { foreignKey: 'id_asociacion', as: 'asociacion' });
Asociacion.hasMany(ConceptoCobro,   { foreignKey: 'id_asociacion', as: 'conceptos_cobro' });

// --- ConsumoLuz ---
ConsumoLuz.belongsTo(Socio,   { foreignKey: 'id_socio',            as: 'socio' });
ConsumoLuz.belongsTo(Usuario, { foreignKey: 'id_usuario_registro', as: 'usuario_registro' });
Socio.hasMany(ConsumoLuz,     { foreignKey: 'id_socio',            as: 'consumos_luz' });
Usuario.hasMany(ConsumoLuz,   { foreignKey: 'id_usuario_registro', as: 'consumos_registrados' });

// --- Evento ---
Evento.belongsTo(Asociacion,    { foreignKey: 'id_asociacion', as: 'asociacion' });
Evento.belongsTo(ConceptoCobro, { foreignKey: 'id_concepto',   as: 'concepto' });
Asociacion.hasMany(Evento,      { foreignKey: 'id_asociacion', as: 'eventos' });
ConceptoCobro.hasMany(Evento,   { foreignKey: 'id_concepto',   as: 'eventos' });

// --- Asistencia ---
Asistencia.belongsTo(Evento, { foreignKey: 'id_evento', as: 'evento' });
Asistencia.belongsTo(Socio,  { foreignKey: 'id_socio',  as: 'socio' });
Evento.hasMany(Asistencia,   { foreignKey: 'id_evento', as: 'asistencias' });
Socio.hasMany(Asistencia,    { foreignKey: 'id_socio',  as: 'asistencias' });

// --- Cargo ---
Cargo.belongsTo(Socio,         { foreignKey: 'id_socio',      as: 'socio' });
Cargo.belongsTo(Asociacion,    { foreignKey: 'id_asociacion', as: 'asociacion' });
Cargo.belongsTo(ConceptoCobro, { foreignKey: 'id_concepto',   as: 'concepto' });
Socio.hasMany(Cargo,           { foreignKey: 'id_socio',      as: 'cargos' });
Asociacion.hasMany(Cargo,      { foreignKey: 'id_asociacion', as: 'cargos' });
ConceptoCobro.hasMany(Cargo,   { foreignKey: 'id_concepto',   as: 'cargos' });

// --- Ingreso ---
Ingreso.belongsTo(Asociacion, { foreignKey: 'id_asociacion', as: 'asociacion' });
Ingreso.belongsTo(Socio,      { foreignKey: 'id_socio',      as: 'socio' });
Ingreso.belongsTo(Usuario,    { foreignKey: 'id_usuario',    as: 'cajero' });
Ingreso.belongsTo(ConceptoCobro, { foreignKey: 'id_concepto', as: 'concepto_cobro' });
Asociacion.hasMany(Ingreso,   { foreignKey: 'id_asociacion', as: 'ingresos' });
Socio.hasMany(Ingreso,        { foreignKey: 'id_socio',      as: 'ingresos' });
Usuario.hasMany(Ingreso,      { foreignKey: 'id_usuario',    as: 'ingresos_cobrados' });
ConceptoCobro.hasMany(Ingreso, { foreignKey: 'id_concepto',  as: 'ingresos' });

// --- IngresoDetalle ---
IngresoDetalle.belongsTo(Ingreso, { foreignKey: 'id_ingreso', as: 'ingreso' });
IngresoDetalle.belongsTo(Cargo,   { foreignKey: 'id_cargo',   as: 'cargo' });
Ingreso.hasMany(IngresoDetalle,   { foreignKey: 'id_ingreso', as: 'detalles' });
Cargo.hasMany(IngresoDetalle,     { foreignKey: 'id_cargo',   as: 'abonos' });

// --- TipoEgreso ---
TipoEgreso.belongsTo(Asociacion, { foreignKey: 'id_asociacion', as: 'asociacion' });
Asociacion.hasMany(TipoEgreso,   { foreignKey: 'id_asociacion', as: 'tipos_egreso' });

// --- Egreso ---
Egreso.belongsTo(Asociacion, { foreignKey: 'id_asociacion',  as: 'asociacion' });
Egreso.belongsTo(TipoEgreso, { foreignKey: 'id_tipo_egreso', as: 'tipo_egreso' });
Egreso.belongsTo(Usuario,    { foreignKey: 'id_usuario',     as: 'usuario' });
Asociacion.hasMany(Egreso,   { foreignKey: 'id_asociacion',  as: 'egresos' });
TipoEgreso.hasMany(Egreso,   { foreignKey: 'id_tipo_egreso', as: 'egresos' });
Usuario.hasMany(Egreso,      { foreignKey: 'id_usuario',     as: 'egresos_registrados' });
 
// --- AporteExtraordinario ---
AporteExtraordinario.belongsTo(Asociacion,    { foreignKey: 'id_asociacion', as: 'asociacion' });
AporteExtraordinario.belongsTo(ConceptoCobro, { foreignKey: 'id_concepto',   as: 'concepto' });
Asociacion.hasMany(AporteExtraordinario,      { foreignKey: 'id_asociacion', as: 'aportes_extraordinarios' });
ConceptoCobro.hasMany(AporteExtraordinario,   { foreignKey: 'id_concepto',   as: 'aportes_extraordinarios' });

module.exports = {
  sequelize,
  Sequelize,
  Asociacion,
  Persona,
  Usuario,
  Socio,
  ConceptoCobro,
  ConsumoLuz,
  Evento,
  Asistencia,
  Cargo,
  Ingreso,
  IngresoDetalle,
  TipoEgreso,
  Egreso,
  AporteExtraordinario,
};
