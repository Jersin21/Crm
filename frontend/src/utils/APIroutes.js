// Rutas de la API del backend de MercadoCRM
export const host = (import.meta.env?.VITE_API_URL || "http://localhost:3031").replace(/\/$/, "");

// Autenticación y Usuarios
export const loginRoute = `${host}/api/auth/login`;
export const registerRoute = `${host}/api/auth/register`;
export const getMeRoute = `${host}/api/auth/me`;
export const usuariosRoute = `${host}/api/usuarios`;
export const serenajeRoute = `${host}/api/cargos/generar-serenaje`;

// Módulos principales
export const asociacionesRoute = `${host}/api/asociaciones`;
export const sociosRoute = `${host}/api/socios`;
export const consumoLuzRoute = `${host}/api/consumo-luz`;
export const eventosRoute = `${host}/api/eventos`;
export const asistenciasRoute = `${host}/api/asistencias`;
export const cargosRoute = `${host}/api/cargos`;
export const cargosResumenSociosRoute = `${host}/api/cargos/resumen-socios`;
export const cargosSocioRoute = (id_socio) => `${host}/api/cargos/socio/${id_socio}`;
export const ingresosRoute = `${host}/api/ingresos`;
export const ingresoDirectoRoute = `${host}/api/ingresos/directo`;
export const egresosRoute = `${host}/api/egresos`;
export const tipoEgresoRoute = `${host}/api/tipo-egreso`;
export const conceptosRoute = `${host}/api/conceptos`;
export const reportesRoute = `${host}/api/reportes`;
export const aplicarMultasEventoRoute = (id_evento) => `${host}/api/asistencias/evento/${id_evento}/aplicar-multas`;
export const aportesRoute = `${host}/api/aportes`;
export const aportesSociosRoute = (id_aporte) => `${host}/api/aportes/${id_aporte}/socios`;
export const aplicarMoraAporteRoute = (id_aporte) => `${host}/api/aportes/${id_aporte}/aplicar-mora`;
export const asociacionConfigRoute = `${host}/api/asociaciones/configuracion`;
export const consumoLuzTarifaRoute = `${host}/api/consumo-luz/tarifa`;
export const sociosDuenosRoute = `${host}/api/socios/duenos`;


