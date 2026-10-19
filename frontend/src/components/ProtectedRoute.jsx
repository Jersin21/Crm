import React from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../hooks/authHooks";
import styled from "styled-components";
import theme from "../styles/theme";

const LoadingContainer = styled.div`
  display: flex;
  height: 100vh;
  justify-content: center;
  align-items: center;
  background-color: ${theme.colors.bgDark};
  color: ${theme.colors.textMain};
  font-size: 1.25rem;
  font-weight: 600;
  gap: 0.75rem;

  .spinner {
    width: 28px;
    height: 28px;
    border: 3px solid rgba(14, 165, 233, 0.2);
    border-top-color: ${theme.colors.primary};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// Mapeo de equivalencias de roles (consistente con backend roleMiddleware)
const EQUIVALENCIAS = {
  SUPERADMIN_SAAS: ["SUPERADMIN_SAAS", "ADMIN_ASOCIACION", "PRESIDENTE", "CAJERO", "SEC_HACIENDA", "LECTURADOR", "SEC_NACIONAL"],
  ADMIN_ASOCIACION: ["ADMIN_ASOCIACION", "PRESIDENTE", "CAJERO", "SEC_HACIENDA"],
  PRESIDENTE: ["PRESIDENTE", "ADMIN_ASOCIACION", "CAJERO", "SEC_HACIENDA"],
  CAJERO: ["CAJERO", "SEC_HACIENDA"],
  SEC_HACIENDA: ["SEC_HACIENDA", "CAJERO"],
  LECTURADOR: ["LECTURADOR", "SEC_NACIONAL"],
  SEC_NACIONAL: ["SEC_NACIONAL", "LECTURADOR"],
};

/**
 * Componente que protege rutas según autenticación y rol.
 * @param {string[]} allowedRoles - Roles permitidos para acceder a la ruta.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { auth, isLoading } = useAuth();

  if (isLoading) {
    return (
      <LoadingContainer>
        <div className="spinner" />
        <span>Cargando sesión...</span>
      </LoadingContainer>
    );
  }

  // Verifica si el usuario tiene sesión activa
  if (!auth || (!auth.id_usuario && !auth.id)) {
    return <Navigate to="/login" replace />;
  }

  // Si se definieron roles permitidos, verifica si el rol del usuario o sus equivalentes coinciden
  if (allowedRoles && allowedRoles.length > 0) {
    if (auth.rol === "SUPERADMIN_SAAS") return children;
    const userRole = auth.rol;
    const userEquivs = EQUIVALENCIAS[userRole] || [userRole];
    const tienePermiso = allowedRoles.some((r) => userEquivs.includes(r));
    if (!tienePermiso) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
