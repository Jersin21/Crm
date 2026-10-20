import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { loginRoute } from "../utils/APIroutes";
import useAuth from "../hooks/authHooks";
import toastOptions from "../utils/toastOptions";
import theme from "../styles/theme";
import LogoImg from "../assets/logo.svg";

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

  .brand-logo {
    height: 4.5rem;
    margin-bottom: 0.75rem;
    filter: drop-shadow(0 4px 14px rgba(14, 165, 233, 0.45));
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
  border: 1px solid ${({ $hasError }) => ($hasError ? theme.colors.danger : theme.colors.borderDark)};
  border-radius: ${theme.borderRadius.sm};
  background-color: ${theme.colors.bgInput};
  color: ${theme.colors.textLight};
  font-size: ${theme.fontSize.sm};
  box-sizing: border-box;
  transition: all ${theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${({ $hasError }) => ($hasError ? theme.colors.danger : theme.colors.primary)};
    box-shadow: 0 0 0 3px ${({ $hasError }) => ($hasError ? "rgba(239, 68, 68, 0.25)" : "rgba(14, 165, 233, 0.2)")};
  }

  &::placeholder {
    color: ${theme.colors.textMuted};
    opacity: 0.5;
  }
`;

const ErrorText = styled.span`
  color: ${theme.colors.danger};
  font-size: 0.75rem;
  font-weight: 500;
  margin-top: 0.15rem;
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
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Si ya está autenticado, redirige al inicio
  useEffect(() => {
    if (auth && auth.rol) {
      navigate("/");
    }
  }, [auth, navigate]);

  const validate = () => {
    const errs = {};
    if (!values.username || !values.username.trim()) {
      errs.username = "El nombre de usuario es obligatorio.";
    } else if (values.username.trim().length < 3) {
      errs.username = "El usuario debe tener al menos 3 caracteres.";
    }

    if (!values.password || !values.password.trim()) {
      errs.password = "La contraseña es obligatoria.";
    } else if (values.password.length < 4) {
      errs.password = "La contraseña debe tener al menos 4 caracteres.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Por favor corrija los campos requeridos.", toastOptions);
      return;
    }

    const { username, password } = values;
    try {
      setLoading(true);
      const { data } = await axios.post(loginRoute, { username: username.trim(), password });

      if (data.status === false) {
        toast.error(data.msg, toastOptions);
        return;
      }

      if (data.status === true) {
        loginUser(data.user.access_token, data.user.user);
        navigate("/");
      }
    } catch (err) {
      const msg = err.response?.data?.mensaje || err.response?.data?.msg || "Error al iniciar sesión";
      toast.error(msg, toastOptions);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <Container>
      <LoginCard>
        <BrandSection>
          <img src={LogoImg} alt="MiSocios" className="brand-logo" />
          <h1>MiSocios</h1>
          <p>Sistema de Gestión de Asociaciones y Mercados</p>
        </BrandSection>

        <Form onSubmit={handleSubmit} noValidate>
          <FormGroup>
            <Label htmlFor="username">Usuario *</Label>
            <Input
              id="username"
              type="text"
              placeholder="Ingresa tu usuario"
              name="username"
              value={values.username}
              onChange={handleChange}
              $hasError={Boolean(errors.username)}
              autoComplete="username"
            />
            {errors.username && <ErrorText>{errors.username}</ErrorText>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">Contraseña *</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              name="password"
              value={values.password}
              onChange={handleChange}
              $hasError={Boolean(errors.password)}
              autoComplete="current-password"
            />
            {errors.password && <ErrorText>{errors.password}</ErrorText>}
          </FormGroup>

          <SubmitButton type="submit" disabled={loading}>
            {loading ? "Accediendo..." : "Iniciar Sesión"}
          </SubmitButton>
        </Form>
      </LoginCard>
    </Container>
  );
}

export default Login;

