import React, { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import Sidebar from "../components/Sidebar";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import useAuth from "../hooks/authHooks";
import toastOptions from "../utils/toastOptions";
import theme from "../styles/theme";
import {
  PageContainer,
  ContentContainer,
  SectionHeader,
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

  &.full {
    grid-column: 1 / -1;
  }
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
  border: 1px solid ${({ $hasError }) => ($hasError ? theme.colors.danger : theme.colors.border)};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  font-size: 0.875rem;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${({ $hasError }) => ($hasError ? theme.colors.danger : theme.colors.primary)};
    box-shadow: 0 0 0 3px ${({ $hasError }) => ($hasError ? "rgba(239, 68, 68, 0.2)" : "rgba(14, 165, 233, 0.15)")};
  }
`;

const ErrorText = styled.span`
  color: ${theme.colors.danger};
  font-size: 0.75rem;
  font-weight: 500;
  margin-top: 0.15rem;
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

  option {
    background-color: ${theme.colors.bgCard};
  }
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const CancelButton = styled.button`
  padding: 0.65rem 1.25rem;
  border-radius: ${theme.radius.md};
  border: 1px solid ${theme.colors.border};
  background: transparent;
  color: ${theme.colors.textMuted};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: ${theme.colors.textMain};
  }
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

const getRolBadge = (rol) => {
  switch (rol) {
    case "PRESIDENTE":
      return {
        label: "Presidente",
        bg: "rgba(14, 165, 233, 0.15)",
        color: theme.colors.primary,
      };
    case "SEC_HACIENDA":
      return {
        label: "Sec. Hacienda",
        bg: "rgba(16, 185, 129, 0.15)",
        color: theme.colors.success,
      };
    case "SEC_NACIONAL":
      return {
        label: "Sec. General",
        bg: "rgba(245, 158, 11, 0.15)",
        color: theme.colors.warning,
      };
    case "LECTURADOR":
      return {
        label: "Lecturador Luz",
        bg: "rgba(139, 92, 246, 0.15)",
        color: "#a78bfa",
      };
    case "CAJERO":
      return {
        label: "Cajero",
        bg: "rgba(236, 72, 153, 0.15)",
        color: "#f472b6",
      };
    default:
      return {
        label: rol || "Usuario",
        bg: "rgba(148, 163, 184, 0.15)",
        color: theme.colors.textMuted,
      };
  }
};

function UsuariosPage() {
  const { auth } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formData, setFormData] = useState(estadoInicial);
  const [guardando, setGuardando] = useState(false);
  const [errors, setErrors] = useState({});

  // Estado para confirmación de eliminación accesible
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const validateForm = () => {
    const errs = {};
    if (!formData.nombres || formData.nombres.trim().length < 2) {
      errs.nombres = "El nombre es obligatorio (mínimo 2 caracteres)";
    }
    if (!formData.apellidos || formData.apellidos.trim().length < 2) {
      errs.apellidos = "Los apellidos son obligatorios (mínimo 2 caracteres)";
    }
    if (!formData.username || formData.username.trim().length < 3) {
      errs.username = "El nombre de usuario debe tener al menos 3 caracteres";
    } else if (/\s/.test(formData.username)) {
      errs.username = "No debe contener espacios en blanco";
    }
    if (!formData.password || formData.password.length < 6) {
      errs.password = "La contraseña debe tener al menos 6 caracteres";
    }
    if (formData.ci && formData.ci.trim().length > 0 && formData.ci.trim().length < 4) {
      errs.ci = "El CI debe tener al menos 4 caracteres";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(usuariosRoute, auth.config);
      setUsuarios(Array.isArray(data) ? data : data.usuarios || []);
    } catch (err) {
      toast.error(
        err.response?.data?.mensaje || "Error al cargar los usuarios directivos",
        toastOptions
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.config) fetchUsuarios();
  }, [auth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Por favor completa los campos marcados en rojo", toastOptions);
      return;
    }
    try {
      setGuardando(true);
      await axios.post(usuariosRoute, formData, auth.config);
      toast.success("Usuario registrado con éxito en el sistema", toastOptions);
      setModalAbierto(false);
      setFormData(estadoInicial);
      setErrors({});
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
      toast.success(
        `Usuario @${u.username} ${u.estado ? "desactivado" : "activado"} correctamente`,
        toastOptions
      );
      fetchUsuarios();
    } catch (err) {
      toast.error(
        err.response?.data?.mensaje || "Error al cambiar el estado del usuario",
        toastOptions
      );
    }
  };

  const confirmarEliminacion = async () => {
    if (!usuarioAEliminar) return;
    try {
      setEliminando(true);
      await axios.delete(`${usuariosRoute}/${usuarioAEliminar.id_usuario}`, auth.config);
      toast.success(`Usuario @${usuarioAEliminar.username} eliminado correctamente`, toastOptions);
      setUsuarioAEliminar(null);
      fetchUsuarios();
    } catch (err) {
      toast.error(
        err.response?.data?.mensaje || "Error al eliminar el usuario del sistema",
        toastOptions
      );
    } finally {
      setEliminando(false);
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const nombre = `${u.persona?.nombres || ""} ${u.persona?.apellidos || ""}`.toLowerCase();
    const username = (u.username || "").toLowerCase();
    const ci = (u.persona?.ci || "").toLowerCase();
    const q = busqueda.trim().toLowerCase();
    return nombre.includes(q) || username.includes(q) || ci.includes(q);
  });

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        <SectionHeader>
          <div className="titles">
            <h1>Directiva y Usuarios del Sistema</h1>
            <p>Administración de roles, permisos y credenciales operativas del mercado</p>
          </div>
          <div className="actions">
            <CreateButton onClick={() => setModalAbierto(true)}>+ Nuevo Operador</CreateButton>
          </div>
        </SectionHeader>

        <TableCard>
          <TableToolbar>
            <SearchInput
              placeholder="Buscar por nombre, usuario o CI..."
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
                      No se encontraron usuarios registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  usuariosFiltrados.map((u) => {
                    const badge = getRolBadge(u.rol);
                    const esElMismoUsuario = auth?.id_usuario === u.id_usuario;

                    return (
                      <TableRow key={u.id_usuario}>
                        <TableCell>
                          <strong>@{u.username}</strong>
                          {esElMismoUsuario && (
                            <span style={{
                              marginLeft: "0.5rem",
                              fontSize: "0.7rem",
                              color: theme.colors.primary,
                              fontWeight: 600,
                            }}>
                              (Tú)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.persona
                            ? `${u.persona.nombres || ""} ${u.persona.apellidos || ""}`.trim() || "-"
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <span
                            style={{
                              padding: "0.25rem 0.6rem",
                              borderRadius: theme.radius.sm,
                              fontWeight: 700,
                              fontSize: "0.78rem",
                              background: badge.bg,
                              color: badge.color,
                            }}
                          >
                            {badge.label}
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
                                padding: "0.35rem 0.65rem",
                                borderRadius: theme.radius.sm,
                                fontSize: "0.8rem",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                              }}
                              onClick={() => handleToggleEstado(u)}
                            >
                              {u.estado ? "Desactivar" : "Activar"}
                            </button>
                            {!esElMismoUsuario && (
                              <DeleteButton onClick={() => setUsuarioAEliminar(u)}>
                                Eliminar
                              </DeleteButton>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </TableWrapper>
          </TableResponsiveWrapper>
        </TableCard>
      </ContentContainer>

      {/* Modal Crear Usuario */}
      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title="Registrar Operador Directivo"
        maxWidth="560px"
      >
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormGroup>
              <Label>Nombres *</Label>
              <Input
                value={formData.nombres}
                $hasError={!!errors.nombres}
                onChange={(e) => {
                  setFormData({ ...formData, nombres: e.target.value });
                  if (errors.nombres) setErrors((p) => ({ ...p, nombres: undefined }));
                }}
                placeholder="Ej. Juan"
              />
              {errors.nombres && <ErrorText>{errors.nombres}</ErrorText>}
            </FormGroup>
            <FormGroup>
              <Label>Apellidos *</Label>
              <Input
                value={formData.apellidos}
                $hasError={!!errors.apellidos}
                onChange={(e) => {
                  setFormData({ ...formData, apellidos: e.target.value });
                  if (errors.apellidos) setErrors((p) => ({ ...p, apellidos: undefined }));
                }}
                placeholder="Ej. Pérez Quispe"
              />
              {errors.apellidos && <ErrorText>{errors.apellidos}</ErrorText>}
            </FormGroup>
            <FormGroup>
              <Label>Cédula de Identidad (CI)</Label>
              <Input
                value={formData.ci}
                $hasError={!!errors.ci}
                onChange={(e) => {
                  setFormData({ ...formData, ci: e.target.value });
                  if (errors.ci) setErrors((p) => ({ ...p, ci: undefined }));
                }}
                placeholder="Ej. 6543210 LP"
              />
              {errors.ci && <ErrorText>{errors.ci}</ErrorText>}
            </FormGroup>
            <FormGroup>
              <Label>Teléfono de Contacto</Label>
              <Input
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="Ej. 70123456"
              />
            </FormGroup>
            <FormGroup>
              <Label>Nombre de Usuario *</Label>
              <Input
                value={formData.username}
                $hasError={!!errors.username}
                onChange={(e) => {
                  setFormData({ ...formData, username: e.target.value });
                  if (errors.username) setErrors((p) => ({ ...p, username: undefined }));
                }}
                placeholder="Ej. jperez"
                autoComplete="new-username"
              />
              {errors.username && <ErrorText>{errors.username}</ErrorText>}
            </FormGroup>
            <FormGroup>
              <Label>Contraseña de Acceso *</Label>
              <Input
                type="password"
                value={formData.password}
                $hasError={!!errors.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                }}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
              {errors.password && <ErrorText>{errors.password}</ErrorText>}
            </FormGroup>
            <FormGroup className="full">
              <Label>Cargo / Rol de Permisos *</Label>
              <Select
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
              >
                <option value="PRESIDENTE">Presidente (Acceso Total + Usuarios)</option>
                <option value="SEC_HACIENDA">Secretaria de Hacienda (Caja, Ingresos, Luz, Egresos, Reportes)</option>
                <option value="SEC_NACIONAL">Secretaria General / Nacional (Eventos, Asistencias, Socios)</option>
                <option value="LECTURADOR">Lecturador (Toma de lecturas de luz y medidores)</option>
                <option value="CAJERO">Cajero (Cobranzas en ventanilla)</option>
              </Select>
            </FormGroup>
            <FormGroup className="full">
              <Label>Domicilio</Label>
              <Input
                value={formData.domicilio}
                onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                placeholder="Dirección o puesto de referencia"
              />
            </FormGroup>
          </FormGrid>
          <FormActions>
            <CancelButton type="button" onClick={() => { setModalAbierto(false); setErrors({}); }}>
              Cancelar
            </CancelButton>
            <CreateButton type="submit" disabled={guardando}>
              {guardando ? "Creando..." : "Registrar Usuario"}
            </CreateButton>
          </FormActions>
        </form>
      </Modal>

      {/* Modal Confirmar Eliminación */}
      <ConfirmModal
        isOpen={Boolean(usuarioAEliminar)}
        onClose={() => setUsuarioAEliminar(null)}
        onConfirm={confirmarEliminacion}
        title="¿Eliminar Operador?"
        message={`¿Está seguro de eliminar al usuario @${usuarioAEliminar?.username}? Esta acción revocará de inmediato todos sus accesos al sistema.`}
        confirmText="Eliminar Usuario"
        isDanger={true}
        loading={eliminando}
      />
    </PageContainer>
  );
}

export default UsuariosPage;
