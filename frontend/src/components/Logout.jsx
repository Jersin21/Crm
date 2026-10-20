import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import useAuth from "../hooks/authHooks";
import styled from "styled-components";
import theme from "../styles/theme";

const StyledLogoutButton = styled.button`
  width: 100%;
  padding: 0.65rem 1rem;
  cursor: pointer;
  background-color: transparent;
  border-radius: ${theme.radius.md};
  border: 1px solid ${theme.colors.border};
  color: ${theme.colors.textMuted};
  font-weight: 600;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(239, 68, 68, 0.1);
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.3);
  }
`;

function Logout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <StyledLogoutButton onClick={handleLogout}>
      <LogOut size={16} />
      <span>Cerrar Sesión</span>
    </StyledLogoutButton>
  );
}

export default Logout;
