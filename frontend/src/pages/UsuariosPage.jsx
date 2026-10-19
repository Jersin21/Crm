import React, { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import Sidebar from "../components/Sidebar";
import useAuth from "../hooks/authHooks";
import toastOptions from "../utils/toastOptions";
import theme from "../styles/theme";
import {
  PageContainer,
  ContentContainer,
  SectionHeader,
  Card,
  TableCard,
  TableToolbar,
  TableResponsiveWrapper,
  TableWrapper,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  StatusBadge,
  CreateButton,
  DeleteButton,
  SearchInput,
} from "../styles/commonStyles";
import { host } from "../utils/APIroutes";

const usuariosRoute = `${host}/api/usuarios`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(5, 10, 23, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
`;

const ModalCard = styled(Card)`
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;

  &.full { grid-column: 1 / -1; }
`;

const Label = styled.label`
  font-size: 0.75rem;
  color: ${theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
`;

const Input = styled.input`
  padding: 0.75rem 1rem;
  background-color: ${theme.colors.bgInput};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  font-size: 0.875rem;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
`;

const Select = styled.select`
  padding: 0.75rem 1rem;
  background-color: ${theme.colors.bgInput};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  font-size: 0.875rem;
  width: 100%;
  box-sizing: border-box;

  option { background-color: ${theme.colors.bgCard}; }
`;

const estadoInicial = {
  nombres: "",
  apellidos: "",
  ci: "",
  telefono: "",
  domicilio: "",
  username: "",
  password: "",
  rol: "SEC_HACIENDA",
};

function UsuariosPage() {
  const { auth } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formData, setFormData] = useState(estadoInicial);
  const [guardando, setGuardando] = useState(false);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(usuariosRoute, auth.config);
      setUsuarios(Array.isArray(data) ? data : data.usuarios || []);
    } catch (err) {
      toast.error("Error al cargar la directiva y cajeros", toastOptions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.config) fetchUsuarios();
  }, [auth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim() || !formData.nombres.trim()) {
      toast.error("Completa los campos obligatorios", toastOptions);
      return;
    }
    try {
      setGuardando(true);
      await axios.post(usuariosRoute, formData, auth.config);
      toast.success("Usuario directivo registrado con éxito", toastOptions);
      setModalAbierto(false);
      setFormData(estadoInicial);
      fetchUsuarios();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al crear usuario", toastOptions);
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (u) => {
    try {
      await axios.put(`${usuariosRoute}/${u.id_usuario}/estado`, {}, auth.config);
      toast.success("Estado de usuario actualizado", toastOptions);
      fetchUsuarios();
    } catch (err) {
      toast.error("Error al cambiar estado", toastOptions);
    }
  };

  const handleEliminar = async (u) => {
    if (!window.confirm(`¿Eliminar al usuario ${u.username}?`)) return;
    try {
      await axios.delete(`${usuariosRoute}/${u.id_usuario}`, auth.config);
      toast.success("Usuario eliminado", toastOptions);
      fetchUsuarios();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al eliminar usuario", toastOptions);
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const nombre = `${u.persona?.nombres || ""} ${u.persona?.apellidos || ""}`.toLowerCase();
    const username = (u.username || "").toLowerCase();
    const q = busqueda.toLowerCase();
    return nombre.includes(q) || username.includes(q);
  });

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        <SectionHeader>
          <div className="titles">
            <h1>Directiva y Usuarios del Sistema</h1>
            <p>Administración de cuentas para Presidente, Secretaria de Hacienda y Secretaria Nacional</p>
          </div>
          <div className="actions">
            <CreateButton onClick={() => setModalAbierto(true)}>+ Nuevo Operador</CreateButton>
          </div>
        </SectionHeader>

        <TableCard>
          <TableToolbar>
            <SearchInput
              placeholder="Buscar por nombre o usuario..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <span style={{ color: theme.colors.textMuted, fontSize: "0.875rem" }}>
              {usuariosFiltrados.length} usuario(s)
            </span>
          </TableToolbar>
          <TableResponsiveWrapper>
            <TableWrapper>
              <TableHead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombres y Apellidos</th>
                  <th>Cargo / Rol</th>
                  <th>CI</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                      Cargando usuarios...
                    </TableCell>
                  </TableRow>
                ) : usuariosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                      No hay usuarios registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  usuariosFiltrados.map((u) => (
                    <TableRow key={u.id_usuario}>
                      <TableCell><strong>@{u.username}</strong></TableCell>
                      <TableCell>{u.persona ? `${u.persona.nombres} ${u.persona.apellidos}` : "-"}</TableCell>
                      <TableCell>
                        <span style={{
                          padding: "0.25rem 0.6rem",
                          borderRadius: theme.radius.sm,
                          fontWeight: 700,
                          fontSize: "0.78rem",
                          background: u.rol === "PRESIDENTE" ? "rgba(14, 165, 233, 0.15)" : u.rol === "SEC_HACIENDA" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: u.rol === "PRESIDENTE" ? theme.colors.primary : u.rol === "SEC_HACIENDA" ? theme.colors.success : theme.colors.warning,
                        }}>
                          {u.rol === "PRESIDENTE" ? "Presidente" : u.rol === "SEC_HACIENDA" ? "Sec. Hacienda" : "Sec. Nacional"}
                        </span>
                      </TableCell>
                      <TableCell>{u.persona?.ci || "-"}</TableCell>
                      <TableCell>{u.persona?.telefono || "-"}</TableCell>
                      <TableCell>
                        <StatusBadge $status={u.estado ? "Activo" : "Inactivo"}>
                          {u.estado ? "Activo" : "Inactivo"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            type="button"
                            style={{
                              background: "rgba(255, 255, 255, 0.08)",
                              border: "none",
                              color: theme.colors.textMain,
                              padding: "0.3rem 0.6rem",
                              borderRadius: theme.radius.sm,
                              fontSize: "0.8rem",
                              cursor: "pointer",
                            }}
                            onClick={() => handleToggleEstado(u)}
                          >
                            {u.estado ? "Desactivar" : "Activar"}
                          </button>
                          {auth?.id_usuario !== u.id_usuario && (
                            <DeleteButton onClick={() => handleEliminar(u)}>Eliminar</DeleteButton>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </TableWrapper>
          </TableResponsiveWrapper>
        </TableCard>
      </ContentContainer>

      {/* Modal Crear Usuario */}
      {modalAbierto && (
        <ModalOverlay onClick={(e) => e.target === e.currentTarget && setModalAbierto(false)}>
          <ModalCard>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.25rem", color: theme.colors.textMain }}>Registrar Operador Directivo</h2>
              <button style={{ background: "none", border: "none", color: "#aaa", fontSize: "1.5rem", cursor: "pointer" }} onClick={() => setModalAbierto(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <FormGrid>
                <FormGroup>
                  <Label>Nombres *</Label>
                  <Input
                    value={formData.nombres}
                    onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Apellidos *</Label>
                  <Input
                    value={formData.apellidos}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Cédula de Identidad (CI)</Label>
                  <Input
                    value={formData.ci}
                    onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Teléfono de Contacto</Label>
                  <Input
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Nombre de Usuario *</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Contraseña de Acceso *</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </FormGroup>
                <FormGroup className="full">
                  <Label>Cargo / Rol de Permisos *</Label>
                  <Select
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                  >
                    <option value="PRESIDENTE">Presidente (Acceso Total + Usuarios)</option>
                    <option value="SEC_HACIENDA">Secretaria de Hacienda (Caja, Ingresos, Luz, Egresos, Reportes)</option>
                    <option value="SEC_NACIONAL">Secretaria Nacional (Eventos, Asistencias, Socios)</option>
                  </Select>
                </FormGroup>
                <FormGroup className="full">
                  <Label>Domicilio</Label>
                  <Input
                    value={formData.domicilio}
                    onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                  />
                </FormGroup>
              </FormGrid>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button
                  type="button"
                  style={{ background: "none", border: `1px solid ${theme.colors.border}`, color: "#aaa", padding: "0.6rem 1.2rem", borderRadius: theme.radius.md, cursor: "pointer" }}
                  onClick={() => setModalAbierto(false)}
                >
                  Cancelar
                </button>
                <CreateButton type="submit" disabled={guardando}>
                  {guardando ? "Creando..." : "Registrar Usuario"}
                </CreateButton>
              </div>
            </form>
          </ModalCard>
        </ModalOverlay>
      )}
    </PageContainer>
  );
}

export default UsuariosPage;
