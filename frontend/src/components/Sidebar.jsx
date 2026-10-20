import React, { useState } from "react";
import styled from "styled-components";
import Logout from "./Logout";
import useAuth from "../hooks/authHooks";
import { NavLink, Link } from "react-router-dom";
import {
  Menu,
  Home,
  Users,
  CreditCard,
  DollarSign,
  TrendingDown,
  Hammer,
  Zap,
  FileText,
  Calendar,
  Settings,
  UserCheck
} from "lucide-react";
import ROLES from "../utils/roles";
import theme from "../styles/theme";
import LogoImg from "../assets/logo.svg";

// ─── Estilos del Sidebar ──────────────────────────────────────────────────────

const MobileHeader = styled.div`
  display: none;
  background-color: ${theme.colors.bgSidebar};
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${theme.colors.border};
  justify-content: space-between;
  align-items: center;

  @media screen and (max-width: 900px) {
    display: flex;
    position: sticky;
    top: 0;
    z-index: 999;
  }
`;

const MenuButton = styled.button`
  background: none;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
`;

const SidebarContainer = styled.aside`
  width: 260px;
  min-width: 260px;
  height: 100vh;
  background-color: ${theme.colors.bgSidebar};
  border-right: 1px solid ${theme.colors.border};
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  flex-shrink: 0;
  z-index: 100;
  transition: transform 0.3s ease;

  @media screen and (max-width: 900px) {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    transform: ${({ $isOpen }) => ($isOpen ? "translateX(0)" : "translateX(-100%)")};
    box-shadow: ${({ $isOpen }) => ($isOpen ? "0 0 50px rgba(0,0,0,0.7)" : "none")};
  }
`;

const SidebarHeader = styled.div`
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  border-bottom: 1px solid ${theme.colors.border};

  img {
    height: 2.75rem;
    filter: drop-shadow(0 2px 8px rgba(14, 165, 233, 0.3));
  }

  .brand-text {
    h1 {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: ${theme.colors.textMain};
      text-transform: uppercase;
    }
    span {
      font-size: 0.7rem;
      color: ${theme.colors.primary};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  }
`;

const UserProfileCard = styled.div`
  padding: 0.875rem 1.15rem;
  margin: 1rem 1rem 0 1rem;
  background-color: ${theme.colors.bgCard};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  display: flex;
  align-items: center;
  gap: 0.75rem;

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: ${theme.colors.primaryLight};
    color: ${theme.colors.primary};
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    border: 1px solid rgba(14, 165, 233, 0.3);
    flex-shrink: 0;
  }

  .user-info {
    overflow: hidden;
    h4 {
      font-size: 0.85rem;
      font-weight: 600;
      color: ${theme.colors.textMain};
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    span {
      font-size: 0.725rem;
      color: ${theme.colors.textMuted};
    }
  }
`;

const SidebarNav = styled.nav`
  flex: 1;
  padding: 0.875rem 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.border};
    border-radius: 3px;
  }
`;

const NavGroup = styled.div`
  margin-bottom: 0.5rem;
`;

const NavGroupLabel = styled.p`
  font-size: 0.675rem;
  font-weight: 700;
  color: ${theme.colors.textDim};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.5rem 0.75rem 0.25rem;
`;

const StyledNavLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.875rem;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMuted};
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &:hover {
    color: ${theme.colors.textMain};
    background-color: rgba(255, 255, 255, 0.05);
  }

  &.active {
    color: #ffffff;
    background-color: ${theme.colors.primary};
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.35);
  }
`;

const SidebarFooter = styled.div`
  padding: 1rem;
  border-top: 1px solid ${theme.colors.border};
`;

const Backdrop = styled.div`
  display: none;
  @media screen and (max-width: 900px) {
    display: ${({ $isOpen }) => ($isOpen ? "block" : "none")};
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.75);
    z-index: 999;
  }
`;

// ─── Componente Sidebar ──────────────────────────────────────────────────────

const Sidebar = () => {
  const { auth } = useAuth();
  const role = auth?.rol;
  const username = auth?.username || "Usuario";
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getRoleLabel = () => {
    switch (role) {
      case ROLES.SUPERADMIN_SAAS:
        return "Super Admin SaaS";
      case ROLES.ADMIN_ASOCIACION:
        return "Administrador de Mercado";
      case ROLES.PRESIDENTE:
        return "Presidente de Asociación";
      case ROLES.SEC_HACIENDA:
        return "Secretaria de Hacienda";
      case ROLES.CAJERO:
        return "Cajero de Ventanilla";
      case ROLES.SEC_NACIONAL:
        return "Secretaria Nacional";
      case ROLES.LECTURADOR:
        return "Lecturador de Medidores";
      default:
        return role || "Usuario";
    }
  };

  const closeMenu = () => setIsMobileOpen(false);

  return (
    <>
      {/* Header móvil */}
      <MobileHeader>
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <img src={LogoImg} alt="MiSocios" style={{ height: "2rem" }} />
          <span style={{ fontWeight: 800, fontSize: "1.1rem", textTransform: "uppercase" }}>
            MiSocios
          </span>
        </Link>
        <MenuButton onClick={() => setIsMobileOpen(!isMobileOpen)}>
          <Menu size={20} />
        </MenuButton>
      </MobileHeader>

      <Backdrop $isOpen={isMobileOpen} onClick={closeMenu} />

      <SidebarContainer $isOpen={isMobileOpen}>
        {/* Cabecera con logo oficial */}
        <SidebarHeader>
          <Link
            to="/"
            onClick={closeMenu}
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}
          >
            <img src={LogoImg} alt="MiSocios" />
            <div className="brand-text">
              <h1>MiSocios</h1>
              <span>Gestión de Asociaciones</span>
            </div>
          </Link>
        </SidebarHeader>

        {/* Tarjeta de usuario */}
        <UserProfileCard>
          <div className="avatar">{username.charAt(0).toUpperCase()}</div>
          <div className="user-info">
            <h4>{username}</h4>
            <span>{getRoleLabel()}</span>
          </div>
        </UserProfileCard>

        {/* Menú de navegación condicional por rol */}
        <SidebarNav>
          {/* Módulo General - Accesible por Todos */}
          <NavGroup>
            <NavGroupLabel>General</NavGroupLabel>
            <StyledNavLink to="/" end onClick={closeMenu}>
              <Home size={18} />
              <span>Inicio</span>
            </StyledNavLink>
            <StyledNavLink to="/socios" onClick={closeMenu}>
              <Users size={18} />
              <span>Socios</span>
            </StyledNavLink>
          </NavGroup>

          {/* Módulo Finanzas - CAJERO, SEC_HACIENDA, ADMIN_ASOCIACION, PRESIDENTE, SUPERADMIN */}
          {[ROLES.SEC_HACIENDA, ROLES.CAJERO, ROLES.PRESIDENTE, ROLES.ADMIN_ASOCIACION, ROLES.SUPERADMIN_SAAS].includes(role) && (
            <NavGroup>
              <NavGroupLabel>Caja y Finanzas</NavGroupLabel>
              <StyledNavLink to="/caja" onClick={closeMenu}>
                <CreditCard size={18} />
                <span>Caja y Cobranza (Luz, Serenaje, Multas)</span>
              </StyledNavLink>
              <StyledNavLink to="/ingresos" onClick={closeMenu}>
                <DollarSign size={18} />
                <span>Ingresos (Traspasos 10%, Afiliación)</span>
              </StyledNavLink>
              <StyledNavLink to="/egresos" onClick={closeMenu}>
                <TrendingDown size={18} />
                <span>Egresos y Gastos</span>
              </StyledNavLink>
              <StyledNavLink to="/aportes" onClick={closeMenu}>
                <Hammer size={18} />
                <span>Aportes Pro-Mejoras</span>
              </StyledNavLink>
              <StyledNavLink to="/consumo-luz" onClick={closeMenu}>
                <Zap size={18} />
                <span>Toma y Lecturas de Luz</span>
              </StyledNavLink>
              <StyledNavLink to="/reportes" onClick={closeMenu}>
                <FileText size={18} />
                <span>Reportes y Balance</span>
              </StyledNavLink>
            </NavGroup>
          )}

          {/* Módulo Servicios y Medidores - Exclusivo para LECTURADOR */}
          {role === ROLES.LECTURADOR && (
            <NavGroup>
              <NavGroupLabel>Servicios y Medidores</NavGroupLabel>
              <StyledNavLink to="/consumo-luz" onClick={closeMenu}>
                <Zap size={18} />
                <span>Toma y Lecturas de Luz</span>
              </StyledNavLink>
            </NavGroup>
          )}

          {/* Módulo Organización - SEC_NACIONAL, LECTURADOR, ADMIN_ASOCIACION, PRESIDENTE, SUPERADMIN */}
          {[ROLES.SEC_NACIONAL, ROLES.LECTURADOR, ROLES.PRESIDENTE, ROLES.ADMIN_ASOCIACION, ROLES.SUPERADMIN_SAAS].includes(role) && (
            <NavGroup>
              <NavGroupLabel>Organización</NavGroupLabel>
              <StyledNavLink to="/eventos" onClick={closeMenu}>
                <Calendar size={18} />
                <span>Eventos y Asambleas</span>
              </StyledNavLink>
            </NavGroup>
          )}

          {/* Módulo Administración - ADMIN_ASOCIACION, PRESIDENTE, SUPERADMIN */}
          {[ROLES.PRESIDENTE, ROLES.ADMIN_ASOCIACION, ROLES.SUPERADMIN_SAAS].includes(role) && (
            <NavGroup>
              <NavGroupLabel>Administración</NavGroupLabel>
              <StyledNavLink to="/configuracion" onClick={closeMenu}>
                <Settings size={18} />
                <span>Configuración y Tarifas</span>
              </StyledNavLink>
              <StyledNavLink to="/usuarios" onClick={closeMenu}>
                <UserCheck size={18} />
                <span>Directiva y Usuarios</span>
              </StyledNavLink>
            </NavGroup>
          )}
        </SidebarNav>

        <SidebarFooter>
          <Logout />
        </SidebarFooter>
      </SidebarContainer>
    </>
  );
};

export default Sidebar;
