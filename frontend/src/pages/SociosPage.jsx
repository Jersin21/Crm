import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Tag, FileText, Edit, Trash2, UserPlus, Building, CheckCircle2, AlertCircle } from "lucide-react";
import Sidebar from "../components/Sidebar";
import useAuth from "../hooks/authHooks";
import { useSocios, useDuenos } from "../hooks/useSocios";
import useDebounce from "../hooks/useDebounce";
import toastOptions from "../utils/toastOptions";
import theme from "../styles/theme";
import ConfirmModal from "../components/ConfirmModal";
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
  EditButton,
  DeleteButton,
  ViewButton,
  SearchInput,
} from "../styles/commonStyles";
import { sociosRoute, sociosDuenosRoute } from "../utils/APIroutes";

// ─── Estilos adicionales ──────────────────────────────────────────────────────

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

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;

  h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: ${theme.colors.textMain};
  }

  button {
    background: none;
    border: none;
    color: ${theme.colors.textMuted};
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    &:hover { color: ${theme.colors.textMain}; }
  }
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
  border: 1px solid ${({ $hasError }) => ($hasError ? theme.colors.danger : theme.colors.border)};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  font-size: 0.875rem;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ $hasError }) => ($hasError ? theme.colors.danger : theme.colors.primary)};
    box-shadow: 0 0 0 3px ${({ $hasError }) => ($hasError ? "rgba(239, 68, 68, 0.2)" : "rgba(14, 165, 233, 0.15)")};
  }
`;

const Select = styled.select`
  padding: 0.75rem 1rem;
  background-color: ${theme.colors.bgInput};
  border: 1px solid ${({ $hasError }) => ($hasError ? theme.colors.danger : theme.colors.border)};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  font-size: 0.875rem;
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ $hasError }) => ($hasError ? theme.colors.danger : theme.colors.primary)};
  }

  option { background-color: ${theme.colors.bgCard}; }
`;

const ErrorText = styled.span`
  color: ${theme.colors.danger};
  font-size: 0.75rem;
  font-weight: 500;
  margin-top: 0.15rem;
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const CancelButton = styled.button`
  padding: 0.625rem 1.25rem;
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

// ─── Estado inicial del formulario ───────────────────────────────────────────

const estadoInicial = {
  nro_caseta: "",
  // Datos de Persona
  id_persona: "",
  nombres: "",
  apellidos: "",
  ci: "",
  telefono: "",
  direccion: "",
  estado_socio: "Activo",
};

// ─── Componente de fila memoizado para evitar re-renderizados innecesarios ───
const SocioRow = React.memo(function SocioRow({ socio, onNavigate, onEditar, onEliminar }) {
  const p = socio.persona || socio.Persona || {};
  return (
    <TableRow>
      <TableCell>
        <strong>Caseta #{socio.nro_caseta}</strong>
        {socio.total_casetas_dueno > 1 && (
          <div style={{ marginTop: "0.25rem" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.68rem",
                fontWeight: 700,
                backgroundColor: "rgba(14, 165, 233, 0.15)",
                color: theme.colors.primary,
                border: `1px solid ${theme.colors.primaryLight}`,
                borderRadius: "4px",
                padding: "2px 6px",
              }}
              title={`El propietario posee ${socio.total_casetas_dueno} casetas: ${socio.todas_casetas?.join(", ")}`}
            >
              <Tag size={12} /> {socio.total_casetas_dueno} Casetas ({socio.todas_casetas?.join(", ")})
            </span>
          </div>
        )}
      </TableCell>
      <TableCell>{p.nombres || "-"}</TableCell>
      <TableCell>{p.apellidos || "-"}</TableCell>
      <TableCell>{p.ci || "-"}</TableCell>
      <TableCell>{p.telefono || "-"}</TableCell>
      <TableCell>
        <StatusBadge $status={socio.estado_socio}>{socio.estado_socio}</StatusBadge>
      </TableCell>
      <TableCell>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <ViewButton onClick={() => onNavigate(`/socios/${socio.id_socio}/estado-cuenta`)} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <FileText size={13} /> Kardex
          </ViewButton>
          <EditButton onClick={() => onEditar(socio)} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Edit size={13} /> Editar
          </EditButton>
          <DeleteButton onClick={() => onEliminar(socio)} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Trash2 size={13} /> Baja
          </DeleteButton>
        </div>
      </TableCell>
    </TableRow>
  );
});

// ─── Componente principal ─────────────────────────────────────────────────────

function SociosPage() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  // Consumo mediante TanStack Query v5 (Caché inteligente por 5 min, cero spam 429)
  const { socios, isLoading: loadingSocios, invalidateSocios } = useSocios();
  const { duenos, isLoading: loadingDuenos, invalidateDuenos, refetch: refetchDuenos } = useDuenos();
  const loading = loadingSocios || loadingDuenos;

  const [esDuenoExistente, setEsDuenoExistente] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  // Modo Tostadora: debounce de 300ms para evitar congelar CPUs antiguas al filtrar listas grandes
  const debouncedBusqueda = useDebounce(busqueda, 300);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [socioEditando, setSocioEditando] = useState(null);
  const [formData, setFormData] = useState(estadoInicial);
  const [guardando, setGuardando] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, socio: null });

  // Memoización estratégica del filtro usando el valor con debounce
  const sociosFiltrados = useMemo(() => {
    const q = debouncedBusqueda.toLowerCase().trim();
    if (!q) return socios;
    return socios.filter((s) => {
      const p = s.persona || s.Persona || {};
      const nombre = `${p.nombres || ""} ${p.apellidos || ""}`.toLowerCase();
      const caseta = String(s.nro_caseta || "").toLowerCase();
      const ci = String(p.ci || "").toLowerCase();
      return nombre.includes(q) || caseta.includes(q) || ci.includes(q);
    });
  }, [socios, debouncedBusqueda]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nro_caseta || !String(formData.nro_caseta).trim()) {
      newErrors.nro_caseta = "El número de caseta es obligatorio";
    }
    if (!socioEditando && esDuenoExistente) {
      if (!formData.id_persona) {
        newErrors.id_persona = "Debe seleccionar un propietario registrado";
      }
    } else {
      if (!formData.nombres || formData.nombres.trim().length < 2) {
        newErrors.nombres = "El nombre es obligatorio (mínimo 2 caracteres)";
      }
      if (!formData.apellidos || formData.apellidos.trim().length < 2) {
        newErrors.apellidos = "Los apellidos son obligatorios (mínimo 2 caracteres)";
      }
      if (formData.ci && formData.ci.trim().length > 0 && formData.ci.trim().length < 4) {
        newErrors.ci = "El CI debe contener al menos 4 caracteres";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const abrirCrear = () => {
    setSocioEditando(null);
    setEsDuenoExistente(false);
    setFormData(estadoInicial);
    setErrors({});
    if (refetchDuenos) refetchDuenos();
    setModalAbierto(true);
  };

  const abrirEditar = (socio) => {
    const p = socio.persona || socio.Persona || {};
    setSocioEditando(socio);
    setEsDuenoExistente(false);
    setErrors({});
    setFormData({
      id_persona: p.id_persona || "",
      nro_caseta: socio.nro_caseta || "",
      nombres: p.nombres || "",
      apellidos: p.apellidos || "",
      ci: p.ci || "",
      telefono: p.telefono || "",
      direccion: p.domicilio || p.direccion || "",
      estado_socio: socio.estado_socio || "Activo",
    });
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setSocioEditando(null);
    setEsDuenoExistente(false);
    setFormData(estadoInicial);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Por favor completa los campos obligatorios correctamente", toastOptions);
      return;
    }

    try {
      setGuardando(true);
      if (socioEditando) {
        await axios.put(`${sociosRoute}/${socioEditando.id_socio}`, formData, auth.config);
        toast.success("Socio actualizado correctamente", toastOptions);
      } else {
        const payload = esDuenoExistente
          ? {
              id_persona: formData.id_persona,
              nro_caseta: formData.nro_caseta,
              estado_socio: formData.estado_socio || "Activo",
            }
          : formData;
        const res = await axios.post(sociosRoute, payload, auth.config);
        toast.success(res.data?.mensaje || "Socio creado correctamente", toastOptions);
      }
      cerrarModal();
      invalidateSocios();
      invalidateDuenos();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || err.response?.data?.msg || "Error al guardar el socio", toastOptions);
    } finally {
      setGuardando(false);
    }
  };

  const solicitarEliminar = (socio) => {
    setConfirmDelete({ isOpen: true, socio });
  };

  const handleConfirmarEliminar = async () => {
    if (!confirmDelete.socio) return;
    try {
      await axios.delete(`${sociosRoute}/${confirmDelete.socio.id_socio}`, auth.config);
      toast.success("Socio desactivado correctamente", toastOptions);
      invalidateSocios();
      invalidateDuenos();
    } catch (err) {
      toast.error("Error al desactivar el socio", toastOptions);
    } finally {
      setConfirmDelete({ isOpen: false, socio: null });
    }
  };

  const handleNavigate = useCallback((path) => navigate(path), [navigate]);
  const handleAbrirEditar = useCallback((socio) => abrirEditar(socio), []);
  const handleEliminarCallback = useCallback((socio) => solicitarEliminar(socio), []);

  const parentRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: sociosFiltrados.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 58,
    overscan: 10,
  });

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        <SectionHeader>
          <div className="titles">
            <h1>Socios y Padrón de Casetas</h1>
            <p>Padrón oficial de comerciantes activos. Las nuevas afiliaciones y traspasos se gestionan en Ingresos.</p>
          </div>
          <div className="actions">
            <CreateButton onClick={abrirCrear}>+ Nuevo Socio</CreateButton>
          </div>
        </SectionHeader>

        <TableCard>
          <TableToolbar>
            <SearchInput
              placeholder="Buscar por nombre o caseta..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <span style={{ color: theme.colors.textMuted, fontSize: "0.875rem" }}>
              {sociosFiltrados.length} socio(s)
            </span>
          </TableToolbar>
          <TableResponsiveWrapper ref={parentRef} style={{ maxHeight: "680px", overflow: "auto" }}>
            <TableWrapper>
              <TableHead style={{ position: "sticky", top: 0, zIndex: 10, background: theme.colors.bgCard }}>
                <tr>
                  <th>Caseta</th>
                  <th>Nombres</th>
                  <th>Apellidos</th>
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
                      Cargando socios...
                    </TableCell>
                  </TableRow>
                ) : sociosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                      No se encontraron socios
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {rowVirtualizer.getVirtualItems().length > 0 && (
                      <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}>
                        <td colSpan={7} style={{ padding: 0, border: 0 }} />
                      </tr>
                    )}
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const s = sociosFiltrados[virtualRow.index];
                      return (
                        <SocioRow
                          key={s.id_socio}
                          socio={s}
                          onNavigate={handleNavigate}
                          onEditar={handleAbrirEditar}
                          onEliminar={handleEliminarCallback}
                        />
                      );
                    })}
                    {rowVirtualizer.getVirtualItems().length > 0 && (
                      <tr
                        style={{
                          height: `${
                            rowVirtualizer.getTotalSize() -
                            rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end
                          }}px`,
                        }}
                      >
                        <td colSpan={7} style={{ padding: 0, border: 0 }} />
                      </tr>
                    )}
                  </>
                )}
              </TableBody>
            </TableWrapper>
          </TableResponsiveWrapper>
        </TableCard>
      </ContentContainer>

      {/* Modal Crear/Editar */}
      {modalAbierto && (
        <ModalOverlay onClick={(e) => e.target === e.currentTarget && cerrarModal()}>
          <ModalCard>
            <ModalHeader>
              <h2>{socioEditando ? "Editar Socio" : "Nuevo Socio"}</h2>
              <button onClick={cerrarModal}>×</button>
            </ModalHeader>
            <form onSubmit={handleGuardar}>
              {!socioEditando && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginBottom: "1.25rem",
                    padding: "0.25rem",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setEsDuenoExistente(false);
                      setFormData((f) => ({ ...f, id_persona: "" }));
                    }}
                    style={{
                      flex: 1,
                      padding: "0.6rem 0.75rem",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                      background: !esDuenoExistente ? theme.colors.primary : "transparent",
                      color: !esDuenoExistente ? "#ffffff" : theme.colors.textMuted,
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <UserPlus size={15} /> Nuevo Propietario
                  </button>
                  <button
                    type="button"
                    onClick={() => setEsDuenoExistente(true)}
                    style={{
                      flex: 1,
                      padding: "0.6rem 0.75rem",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                      background: esDuenoExistente ? theme.colors.primary : "transparent",
                      color: esDuenoExistente ? "#ffffff" : theme.colors.textMuted,
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <Building size={15} /> Asignar a Dueño Existente
                  </button>
                </div>
              )}

              <FormGrid>
                {!socioEditando && esDuenoExistente && (
                  <FormGroup className="full">
                    <Label>Seleccionar Propietario del Mercado *</Label>
                    <Select
                      name="id_persona"
                      value={formData.id_persona || ""}
                      $hasError={!!errors.id_persona}
                      onChange={(e) => {
                        const idp = e.target.value;
                        const dueno = duenos.find((d) => String(d.id_persona) === String(idp));
                        setFormData((prev) => ({
                          ...prev,
                          id_persona: idp,
                          nombres: dueno?.nombres || "",
                          apellidos: dueno?.apellidos || "",
                          ci: dueno?.ci || "",
                          telefono: dueno?.telefono || "",
                          direccion: dueno?.domicilio || "",
                        }));
                        if (errors.id_persona) setErrors((prev) => ({ ...prev, id_persona: undefined }));
                      }}
                    >
                      <option value="">-- Seleccionar de los {duenos.length} propietarios registrados --</option>
                      {duenos.map((d) => (
                        <option key={d.id_persona} value={d.id_persona}>
                          {d.nombres} {d.apellidos} {d.ci ? `(CI: ${d.ci})` : ""} - Casetas actuales: #{d.casetas?.join(", ") || "Ninguna"}
                        </option>
                      ))}
                    </Select>
                    {errors.id_persona && <ErrorText>{errors.id_persona}</ErrorText>}
                  </FormGroup>
                )}

                {!socioEditando && esDuenoExistente && formData.id_persona && (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      padding: "0.75rem 1rem",
                      background: "rgba(14, 165, 233, 0.08)",
                      border: `1px solid ${theme.colors.primaryLight}`,
                      borderRadius: theme.radius.md,
                      fontSize: "0.82rem",
                      color: theme.colors.textMain,
                      marginBottom: "0.5rem",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: theme.colors.primary, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <CheckCircle2 size={16} /> Propietario Seleccionado:
                    </div>
                    <div><strong>Nombre:</strong> {formData.nombres} {formData.apellidos}</div>
                    <div><strong>CI:</strong> {formData.ci || "S/D"} | <strong>Tel:</strong> {formData.telefono || "S/D"}</div>
                    <div style={{ color: theme.colors.textMuted, marginTop: "0.25rem" }}>
                      Esta nueva caseta se vinculará a la misma persona física sin duplicar su identidad en el padrón.
                    </div>
                  </div>
                )}

                <FormGroup>
                  <Label>Nro. Caseta *</Label>
                  <Input
                    type="text"
                    name="nro_caseta"
                    value={formData.nro_caseta}
                    onChange={handleChange}
                    placeholder="Ej. 12"
                    $hasError={!!errors.nro_caseta}
                  />
                  {errors.nro_caseta && <ErrorText>{errors.nro_caseta}</ErrorText>}
                </FormGroup>
                <FormGroup>
                  <Label>Estado</Label>
                  <Select name="estado_socio" value={formData.estado_socio} onChange={handleChange}>
                    <option value="Activo">Activo</option>
                    <option value="Suspendido">Suspendido</option>
                    <option value="Inactivo">Inactivo</option>
                  </Select>
                </FormGroup>

                {(!esDuenoExistente || socioEditando) && (
                  <>
                    <FormGroup>
                      <Label>Nombres *</Label>
                      <Input name="nombres" value={formData.nombres} onChange={handleChange} $hasError={!!errors.nombres} />
                      {errors.nombres && <ErrorText>{errors.nombres}</ErrorText>}
                    </FormGroup>
                    <FormGroup>
                      <Label>Apellidos *</Label>
                      <Input name="apellidos" value={formData.apellidos} onChange={handleChange} $hasError={!!errors.apellidos} />
                      {errors.apellidos && <ErrorText>{errors.apellidos}</ErrorText>}
                    </FormGroup>
                    <FormGroup>
                      <Label>CI</Label>
                      <Input name="ci" value={formData.ci} onChange={handleChange} $hasError={!!errors.ci} />
                      {errors.ci && <ErrorText>{errors.ci}</ErrorText>}
                    </FormGroup>
                    <FormGroup>
                      <Label>Teléfono</Label>
                      <Input name="telefono" value={formData.telefono} onChange={handleChange} />
                    </FormGroup>
                    <FormGroup className="full">
                      <Label>Dirección</Label>
                      <Input name="direccion" value={formData.direccion} onChange={handleChange} />
                    </FormGroup>
                  </>
                )}
              </FormGrid>
              <FormActions>
                <CancelButton type="button" onClick={cerrarModal}>Cancelar</CancelButton>
                <CreateButton type="submit" disabled={guardando}>
                  {guardando ? "Guardando..." : socioEditando ? "Actualizar" : "Crear Socio"}
                </CreateButton>
              </FormActions>
            </form>
          </ModalCard>
        </ModalOverlay>
      )}

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Confirmar Baja de Socio"
        message={`¿Está seguro de dar de baja al socio de la Caseta #${confirmDelete.socio?.nro_caseta}? Esta acción cambiará su estado a Inactivo en el padrón.`}
        confirmText="Dar de Baja"
        confirmColor={theme.colors.danger}
        onConfirm={handleConfirmarEliminar}
        onCancel={() => setConfirmDelete({ isOpen: false, socio: null })}
      />
    </PageContainer>
  );
}

export default SociosPage;
