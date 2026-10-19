import React, { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
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
  ViewButton,
  SearchInput,
} from "../styles/commonStyles";
import { eventosRoute } from "../utils/APIroutes";
import { formatDate } from "../utils/dateUtils";

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
  max-width: 540px;
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
    line-height: 1;
    &:hover { color: ${theme.colors.textMain}; }
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1rem;
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
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
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
  cursor: pointer;

  option { background-color: ${theme.colors.bgCard}; }
`;

const Textarea = styled.textarea`
  padding: 0.75rem 1rem;
  background-color: ${theme.colors.bgInput};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  font-size: 0.875rem;
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 80px;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
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

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: ${theme.colors.textMain};
  }
`;

const estadoInicial = {
  nombre_evento: "",
  tipo_evento: "Asamblea",
  fecha: new Date().toISOString().split("T")[0],
  monto_multa: "30.00",
  descripcion: "",
};

function EventosPage() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formData, setFormData] = useState(estadoInicial);
  const [guardando, setGuardando] = useState(false);

  const fetchEventos = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(eventosRoute, auth.config);
      setEventos(Array.isArray(data) ? data : data.eventos || []);
    } catch (err) {
      toast.error("Error al cargar los eventos", toastOptions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.config) fetchEventos();
  }, [auth]);

  const handleTipoEventoChange = (nuevoTipo) => {
    let sugerenciaMulta = "30.00";
    if (nuevoTipo === "Marcha") sugerenciaMulta = "50.00";
    else if (nuevoTipo === "Asamblea") sugerenciaMulta = "30.00";
    else if (nuevoTipo === "Reunion") sugerenciaMulta = "20.00";

    setFormData({
      ...formData,
      tipo_evento: nuevoTipo,
      monto_multa: sugerenciaMulta,
    });
  };

  const eventosFiltrados = eventos.filter((e) =>
    (e.nombre_evento || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (e.tipo_evento || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre_evento.trim() || !formData.fecha) {
      toast.error("Por favor completa los campos requeridos", toastOptions);
      return;
    }
    try {
      setGuardando(true);
      const payload = {
        ...formData,
        monto_multa: formData.monto_multa ? parseFloat(formData.monto_multa) : 0,
        monto_aporte: null,
      };
      await axios.post(eventosRoute, payload, auth.config);
      toast.success("Evento creado y lista de asistencia pre-registrada", toastOptions);
      setModalAbierto(false);
      setFormData(estadoInicial);
      fetchEventos();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al crear evento", toastOptions);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (evento) => {
    if (!window.confirm(`¿Eliminar evento "${evento.nombre_evento}"?`)) return;
    try {
      await axios.delete(`${eventosRoute}/${evento.id_evento}`, auth.config);
      toast.success("Evento eliminado", toastOptions);
      fetchEventos();
    } catch (err) {
      toast.error("Error al eliminar evento", toastOptions);
    }
  };

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        <SectionHeader>
          <div className="titles">
            <h1>Eventos, Asambleas y Marchas</h1>
            <p>Control de asistencia y sanciones por inasistencia en asambleas, marchas y reuniones</p>
          </div>
          <div className="actions">
            <CreateButton onClick={() => setModalAbierto(true)}>+ Nuevo Evento</CreateButton>
          </div>
        </SectionHeader>

        <TableCard>
          <TableToolbar>
            <SearchInput
              placeholder="Buscar evento o tipo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <span style={{ color: theme.colors.textMuted, fontSize: "0.875rem" }}>
              {eventosFiltrados.length} evento(s)
            </span>
          </TableToolbar>
          <TableResponsiveWrapper>
            <TableWrapper>
              <TableHead>
                <tr>
                  <th>Nombre del Evento</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Multa Inasistencia</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                      Cargando eventos...
                    </TableCell>
                  </TableRow>
                ) : eventosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                      No hay eventos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  eventosFiltrados.map((ev) => {
                    const fechaEv = new Date(ev.fecha);
                    const hoy = new Date();
                    hoy.setHours(0, 0, 0, 0);
                    const concluyo = fechaEv < hoy;
                    return (
                      <TableRow key={ev.id_evento}>
                        <TableCell>
                          <strong>{ev.nombre_evento}</strong>
                          {ev.descripcion && (
                            <div style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                              {ev.descripcion}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge $status={ev.tipo_evento === "Marcha" ? "Suspendido" : "Iniciado"}>
                            {ev.tipo_evento}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>{formatDate(ev.fecha)}</TableCell>
                        <TableCell style={{ fontWeight: 700, color: theme.colors.danger }}>
                          {ev.monto_multa ? `${parseFloat(ev.monto_multa).toFixed(2)} Bs` : "0.00 Bs"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge $status={concluyo ? "Inactivo" : "Activo"}>
                            {concluyo ? "Concluido" : "Próximo"}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <ViewButton onClick={() => navigate(`/eventos/${ev.id_evento}/asistencia`)}>
                              📝 Tomar Lista
                            </ViewButton>
                            <DeleteButton onClick={() => handleEliminar(ev)}>🗑️ Eliminar</DeleteButton>
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

      {modalAbierto && (
        <ModalOverlay onClick={(e) => e.target === e.currentTarget && setModalAbierto(false)}>
          <ModalCard>
            <ModalHeader>
              <h2>Nuevo Evento / Asamblea</h2>
              <button onClick={() => setModalAbierto(false)}>×</button>
            </ModalHeader>
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Label>Nombre del Evento *</Label>
                <Input
                  name="nombre_evento"
                  placeholder="Ej. Asamblea General Ordinaria / Marcha Central / Reunión de Sector"
                  value={formData.nombre_evento}
                  onChange={(e) => setFormData({ ...formData, nombre_evento: e.target.value })}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Tipo de Evento *</Label>
                <Select
                  value={formData.tipo_evento}
                  onChange={(e) => handleTipoEventoChange(e.target.value)}
                >
                  <option value="Asamblea">Asamblea General (Multa sugerida 30 Bs)</option>
                  <option value="Marcha">Marcha / Movilización (Multa sugerida 50 Bs)</option>
                  <option value="Reunion">Reunión de Sector (Multa sugerida 20 Bs)</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Fecha del Evento *</Label>
                <Input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Multa por Inasistencia / Falta (Bs) *</Label>
                <Input
                  type="number"
                  step="0.50"
                  min="0"
                  placeholder="Ej. 50.00"
                  value={formData.monto_multa}
                  onChange={(e) => setFormData({ ...formData, monto_multa: e.target.value })}
                  required
                />
                <span style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                  Esta multa variable se generará automáticamente a los socios marcados con Falta o si ya concluyó el evento.
                </span>
              </FormGroup>
              <FormGroup>
                <Label>Descripción / Orden del Día</Label>
                <Textarea
                  placeholder="Detalles sobre los puntos a tratar o motivo de la marcha/asamblea..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                />
              </FormGroup>
              <FormActions>
                <CancelButton type="button" onClick={() => setModalAbierto(false)}>Cancelar</CancelButton>
                <CreateButton type="submit" disabled={guardando}>
                  {guardando ? "Creando..." : "Crear y Generar Lista"}
                </CreateButton>
              </FormActions>
            </form>
          </ModalCard>
        </ModalOverlay>
      )}
    </PageContainer>
  );
}

export default EventosPage;
