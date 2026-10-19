import { useState, createContext, useEffect } from "react";
import axios from "axios";
import { getMeRoute } from "../utils/APIroutes";

// Contexto de autenticación global para MercadoCRM
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Cierra sesión y limpia almacenamiento local
  const logout = () => {
    localStorage.removeItem("token");
    setAuth({});
  };

  // Guarda token y datos del usuario en el estado y localStorage
  const loginUser = (token, userData) => {
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };
    localStorage.setItem("token", token);

    // Unifica la estructura del usuario (soporta userData plano o con clave usuario)
    const u = userData?.usuario || userData || {};
    setAuth({
      ...u,
      id_usuario: u.id_usuario || u.id,
      rol: u.rol,
      username: u.username,
      nombres: u.nombres || u.persona?.nombres,
      apellidos: u.apellidos || u.persona?.apellidos,
      id_asociacion: u.id_asociacion,
      asociacion: u.asociacion,
      persona: u.persona,
      config,
      token,
    });
  };

  // Valida el token persistente en localStorage al iniciar la aplicación
  useEffect(() => {
    (async () => {
      try {
        let token = localStorage.getItem("token");
        if (token) {
          try {
            const parsed = JSON.parse(token);
            if (typeof parsed === "string") token = parsed;
          } catch (e) {
            // Ya es string normal
          }

          const config = {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          };

          const { data } = await axios.get(getMeRoute, config);
          const u = data?.usuario || data || {};
          setAuth({
            ...u,
            id_usuario: u.id_usuario || u.id,
            rol: u.rol,
            username: u.username,
            nombres: u.nombres || u.persona?.nombres,
            apellidos: u.apellidos || u.persona?.apellidos,
            id_asociacion: u.id_asociacion,
            asociacion: u.asociacion,
            persona: u.persona,
            config,
            token,
          });
        }
      } catch (error) {
        console.error("Error al validar token de sesión:", error);
        localStorage.removeItem("token");
        setAuth({});
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <AuthContext.Provider
      value={{ auth, setAuth, isLoading, setIsLoading, logout, loginUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProvider };
export default AuthContext;
