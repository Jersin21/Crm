import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "./provider/auth.provider";
import ProtectedRoute from "./components/ProtectedRoute";
import ROLES from "./utils/roles";

// Carga Perezosa (Code Splitting) para reducir el tamaño del bundle inicial y acelerar First Contentful Paint
const Login = lazy(() => import("./pages/Login"));
const HomePage = lazy(() => import("./pages/HomePage"));
const SociosPage = lazy(() => import("./pages/SociosPage"));
const EstadoCuentaSocioPage = lazy(() => import("./pages/EstadoCuentaSocioPage"));
const ConsumoLuzPage = lazy(() => import("./pages/ConsumoLuzPage"));
const SerenajePage = lazy(() => import("./pages/SerenajePage"));
const EventosPage = lazy(() => import("./pages/EventosPage"));
const AsistenciaPage = lazy(() => import("./pages/AsistenciaPage"));
const CargosPage = lazy(() => import("./pages/CargosPage"));
const AportesPage = lazy(() => import("./pages/AportesPage"));
const CajaCobranzaPage = lazy(() => import("./pages/CajaCobranzaPage"));
const IngresosPage = lazy(() => import("./pages/IngresosPage"));
const EgresosPage = lazy(() => import("./pages/EgresosPage"));
const ReportesPage = lazy(() => import("./pages/ReportesPage"));
const ConfiguracionPage = lazy(() => import("./pages/ConfiguracionPage"));
const UsuariosPage = lazy(() => import("./pages/UsuariosPage"));

function LoadingFallback() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      backgroundColor: "#0b1120",
      color: "#38bdf8",
      fontFamily: "sans-serif",
      fontSize: "1.1rem",
      fontWeight: 600
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "42px",
          height: "42px",
          border: "4px solid rgba(56, 189, 248, 0.2)",
          borderTopColor: "#38bdf8",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 1rem"
        }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        Cargando módulo...
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Rutas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/Login" element={<Navigate to="/login" replace />} />

          {/* Rutas Protegidas - Todos los Roles */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/socios"
            element={
              <ProtectedRoute>
                <SociosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/socios/:id/estado-cuenta"
            element={
              <ProtectedRoute>
                <EstadoCuentaSocioPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cargos"
            element={<Navigate to="/caja" replace />}
          />
          <Route
            path="/serenaje"
            element={<Navigate to="/caja" replace />}
          />

          {/* Módulo Caja, Luz, Aportes y Finanzas (SEC_HACIENDA y PRESIDENTE) */}
          <Route
            path="/caja"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SEC_HACIENDA, ROLES.PRESIDENTE]}>
                <CajaCobranzaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cobranza"
            element={<Navigate to="/caja" replace />}
          />
          <Route
            path="/aportes"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SEC_HACIENDA, ROLES.PRESIDENTE]}>
                <AportesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consumo-luz"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SEC_HACIENDA, ROLES.PRESIDENTE]}>
                <ConsumoLuzPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ingresos"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SEC_HACIENDA, ROLES.PRESIDENTE]}>
                <IngresosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/egresos"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SEC_HACIENDA, ROLES.PRESIDENTE]}>
                <EgresosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reportes"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SEC_HACIENDA, ROLES.PRESIDENTE]}>
                <ReportesPage />
              </ProtectedRoute>
            }
          />

          {/* Módulo Eventos, Asambleas y Configuración (SEC_NACIONAL y PRESIDENTE) */}
          <Route
            path="/eventos"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SEC_NACIONAL, ROLES.PRESIDENTE]}>
                <EventosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/eventos/:id/asistencia"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SEC_NACIONAL, ROLES.PRESIDENTE]}>
                <AsistenciaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracion"
            element={
              <ProtectedRoute allowedRoles={[ROLES.PRESIDENTE]}>
                <ConfiguracionPage />
              </ProtectedRoute>
            }
          />

          {/* Módulo Usuarios y Operadores (Exclusivo PRESIDENTE) */}
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute allowedRoles={[ROLES.PRESIDENTE]}>
                <UsuariosPage />
              </ProtectedRoute>
            }
          />

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ToastContainer position="bottom-right" autoClose={3000} theme="dark" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
