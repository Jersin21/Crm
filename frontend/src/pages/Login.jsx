import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Flip, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { loginRoute } from "../utils/APIroutes";
import useAuth from "../hooks/authHooks";
import toastOptions from "../utils/toastOptions";
import theme from "../styles/theme";

// ─── Estilos de la página de Login ───────────────────────────────────────────

const Container = styled.div`
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  box-sizing: border-box;
  background: radial-gradient(circle at 50% 20%, #1e293b 0%, #0b132b 60%, #050a17 100%);
`;

const LoginCard = styled.div`
  width: 100%;
  max-width: 440px;
  background: rgba(28, 37, 65, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: ${theme.borderRadius.lg};
  padding: 2.5rem;
  box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.4);
  box-sizing: border-box;

  @media (max-width: 480px) {
    padding: 1.75rem;
  }
`;

const BrandSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 2rem;

  .brand-icon {
    font-size: 3.5rem;
    margin-bottom: 0.75rem;
    filter: drop-shadow(0 0 16px rgba(14, 165, 233, 0.4));
  }

  h1 {
    margin: 0;
    font-size: 1.75rem;
    color: ${theme.colors.textLight};
    font-weight: 800;
    letter-spacing: 0.05em;
  }

  p {
    margin: 0.35rem 0 0;
    color: ${theme.colors.textMuted};
    font-size: ${theme.fontSize.sm};
    max-width: 300px;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const Label = styled.label`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1px solid ${theme.colors.borderDark};
  border-radius: ${theme.borderRadius.sm};
  background-color: ${theme.colors.bgInput};
  color: ${theme.colors.textLight};
  font-size: ${theme.fontSize.sm};
  box-sizing: border-box;
  transition: all ${theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
  }

  &::placeholder {
    color: ${theme.colors.textMuted};
    opacity: 0.5;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 0.875rem;
  margin-top: 0.5rem;
  background: linear-gradient(135deg, ${theme.colors.primary} 0%, #0284c7 100%);
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  box-shadow: ${theme.shadows.md};

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, ${theme.colors.primaryHover} 0%, #0369a1 100%);
    transform: translateY(-1px);
    box-shadow: 0 10px 20px -5px rgba(14, 165, 233, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// ─── Componente ───────────────────────────────────────────────────────────────

function Login() {
  const navigate = useNavigate();
  const { auth, loginUser } = useAuth();
  const [values, setValues] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  // Si ya está autenticado, redirige al inicio
  useEffect(() => {
    if (auth && auth.rol) {
      navigate("/");
    }
  }, [auth, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!handleValidation()) return;

    const { username, password } = values;
    try {
      setLoading(true);
      const { data } = await axios.post(loginRoute, { username, password });

      if (data.status === false) {
        toast.error(data.msg, toastOptions);
        return;
      }

      if (data.status === true) {
        // El backend devuelve { status, user: { access_token, user: {...datos} } }
        loginUser(data.user.access_token, data.user.user);
        navigate("/");
      }
    } catch (err) {
      toast.error(
        err.response?.data?.msg || "Error al iniciar sesión",
        toastOptions
      );
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = () => {
    const { username, password } = values;
    if (!username.trim() || !password.trim()) {
      toast.error("Por favor, completa todos los campos", toastOptions);
      return false;
    }
    return true;
  };

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  return (
    <Container>
      <LoginCard>
        <BrandSection>
          <span className="brand-icon">🏪</span>
          <h1>MiSocios</h1>
          <p>Sistema de Gestión de Asociaciones y Mercados</p>
        </BrandSection>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              type="text"
              placeholder="Ingresa tu usuario"
              name="username"
              value={values.username}
              onChange={handleChange}
              autoComplete="username"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              name="password"
              value={values.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </FormGroup>

          <SubmitButton type="submit" disabled={loading}>
            {loading ? "Accediendo..." : "Iniciar Sesión"}
          </SubmitButton>
        </Form>
      </LoginCard>
      <ToastContainer transition={Flip} />
    </Container>
  );
}

export default Login;
