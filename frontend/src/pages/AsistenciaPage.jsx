import React, { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";
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
  SearchInput,
  ActionButton,
} from "../styles/commonStyles";
import { eventosRoute, asistenciasRoute, aplicarMultasEventoRoute } from "../utils/APIroutes";
import { formatDate } from "../utils/dateUtils";

const EventSummaryCard = styled(Card)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, ${theme.colors.bgCard} 0%, rgba(14, 165, 233, 0.08) 100%);
`;

const AttendanceSelect = styled.select`
  padding: 0.4rem 0.75rem;
  border-radius: ${theme.radius.sm};
  border: 1px solid ${theme.colors.border};
  background-color: ${theme.colors.bgInput};
  color: ${theme.colors.textMain};
  font-size: 0.85rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }

  option { background-color: ${theme.colors.bgCard}; }
`;

function AsistenciaPage() {
  const { id } = useParams();
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [evento, setEvento] = useState(null);
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [guardandoId, setGuardandoId] = useState(null);
  const [aplicandoMultas, setAplicandoMultas] = useState(false);

  const fetchDatos = async () => {
    try {
      setLoading(true);
      const resEvento = await axios.get(`${eventosRoute}/${id}`, auth.config);
      const ev = resEvento.data.evento || resEvento.data;
      setEvento(ev);

      const resAsist = await axios.get(`${asistenciasRoute}/evento/${id}`, auth.config);
      const lista = Array.isArray(resAsist.data) ? resAsist.data : resAsist.data.asistencias || [];
      setAsistencias(lista);
    } catch (err) {
      toast.error("Error al cargar la asistencia del evento", toastOptions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.config && id) fetchDatos();
  }, [auth, id]);

  const handleEstadoChange = async (idAsistencia, nuevoEstado) => {
    try {
      setGuardandoId(idAsistencia);
      const multaBs = evento?.monto_multa ? parseFloat(evento.monto_multa).toFixed(2) : "30.00";
      await axios.put(
        `${asistenciasRoute}/${idAsistencia}`,
        { estado_asistencia: nuevoEstado },
        auth.config
      );
      setAsistencias((prev) =>
        prev.map((a) =>
          a.id_asistencia === idAsistencia ? { ...a, estado_asistencia: nuevoEstado } : a
        )
      );
      toast.success(
        `Asistencia: ${nuevoEstado}${nuevoEstado === "Falta" ? ` (Multa de ${multaBs} Bs registrada en caja)` : ""}`,
        toastOptions
      );
    } catch (err) {
      toast.error("Error al actualizar asistencia", toastOptions);
    } finally {
      setGuardandoId(null);
    }
  };

  const handleAplicarMultas = async () => {
    if (!window.confirm(`¿Confirmar y liquidar multas a los inasistentes de "${evento.nombre_evento}"? Se generarán los cargos exigibles en caja.`)) return;
    try {
      setAplicandoMultas(true);
      const { data } = await axios.post(aplicarMultasEventoRoute(id), {}, auth.config);
      toast.success(data.mensaje || "Multas sincronizadas exitosamente en caja", toastOptions);
      fetchDatos();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al aplicar multas", toastOptions);
    } finally {
      setAplicandoMultas(false);
    }
  };

  const asistenciasFiltradas = asistencias.filter((a) => {
    const socio = a.socio || a.Socio || {};
    const persona = socio.persona || socio.Persona || {};
    const nombre = `${persona.nombres || ""} ${persona.apellidos || ""}`.toLowerCase();
    const caseta = String(socio.nro_caseta || "").toLowerCase();
    const q = busqueda.toLowerCase();
    return nombre.includes(q) || caseta.includes(q);
  });

  const presentesCount = asistencias.filter((a) => a.estado_asistencia === "Presente").length;
  const faltasCount = asistencias.filter((a) => a.estado_asistencia === "Falta").length;
  const licenciasCount = asistencias.filter((a) => a.estado_asistencia === "Licencia").length;

  const fechaEvento = evento ? new Date(evento.fecha) : new Date();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const eventoConcluido = fechaEvento < hoy;

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        <SectionHeader>
          <div className="titles">
            <h1>Control de Asistencia y Multas</h1>
            <p>Toma de lista obligatoria y generación de cargos por inasistencia</p>
          </div>
          <div className="actions" style={{ display: "flex", gap: "0.75rem" }}>
            <ActionButton $variant="outline" onClick={() => navigate("/eventos")}>
              ← Volver a Eventos
            </ActionButton>
            <ActionButton
              $variant="danger"
              onClick={handleAplicarMultas}
              disabled={aplicandoMultas || faltasCount === 0}
              title="Aplica o sincroniza las multas de todos los socios con Falta en la caja"
            >
              {aplicandoMultas ? "Liquidando..." : "⚡ Aplicar Multas a Inasistentes"}
            </ActionButton>
          </div>
        </SectionHeader>

        {evento && (
          <EventSummaryCard>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: theme.colors.textMain }}>
                  {evento.nombre_evento}
                </h2>
                <StatusBadge $status={eventoConcluido ? "Inactivo" : "Activo"}>
                  {eventoConcluido ? "Concluido" : "Próximo / En Curso"}
                </StatusBadge>
              </div>
              <p style={{ color: theme.colors.textMuted, fontSize: "0.9rem", marginTop: "0.35rem" }}>
                Tipo: <strong>{evento.tipo_evento}</strong> | Fecha: <strong>{formatDate(evento.fecha)}</strong> |
                {" "}Multa Inasistencia: <strong style={{ color: theme.colors.danger }}>{evento.monto_multa ? `${parseFloat(evento.monto_multa).toFixed(2)} Bs` : "30.00 Bs"}</strong>
                {evento.monto_aporte ? ` | Cuota Aporte: ${parseFloat(evento.monto_aporte).toFixed(2)} Bs` : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ textAlign: "center", padding: "0.5rem 1rem", background: "rgba(16, 185, 129, 0.1)", borderRadius: theme.radius.md }}>
                <span style={{ color: theme.colors.success, fontWeight: 800, fontSize: "1.25rem" }}>{presentesCount}</span>
                <p style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>Presentes</p>
              </div>
              <div style={{ textAlign: "center", padding: "0.5rem 1rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: theme.radius.md }}>
                <span style={{ color: theme.colors.danger, fontWeight: 800, fontSize: "1.25rem" }}>{faltasCount}</span>
                <p style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>Faltas (Multas)</p>
              </div>
              <div style={{ textAlign: "center", padding: "0.5rem 1rem", background: "rgba(245, 158, 11, 0.1)", borderRadius: theme.radius.md }}>
                <span style={{ color: theme.colors.warning, fontWeight: 800, fontSize: "1.25rem" }}>{licenciasCount}</span>
                <p style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>Licencias</p>
              </div>
            </div>
          </EventSummaryCard>
        )}

        {eventoConcluido && (
          <div
            style={{
              padding: "0.85rem 1.25rem",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: `1px solid rgba(239, 68, 68, 0.4)`,
              borderRadius: theme.radius.md,
              color: "#fca5a5",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "0.875rem",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>🔒</span>
            <div>
              <strong>Lista de Asistencia Cerrada:</strong> Este evento concluyó el{" "}
              {formatDate(evento?.fecha)}. No es posible modificar las asistencias y las multas a
              los inasistentes han sido liquidadas automáticamente en la ventanilla de cobranza.
            </div>
          </div>
        )}

        <TableCard>
          <TableToolbar>
            <SearchInput
              placeholder="Buscar socio por nombre o caseta..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <span style={{ color: theme.colors.textMuted, fontSize: "0.875rem" }}>
              {asistenciasFiltradas.length} socio(s) en lista
            </span>
          </TableToolbar>
          <TableResponsiveWrapper>
            <TableWrapper>
              <TableHead>
                <tr>
                  <th>Caseta</th>
                  <th>Socio (Nombres y Apellidos)</th>
                  <th>CI</th>
                  <th>Teléfono</th>
                  <th>Estado Actual</th>
                  <th>Marcar Asistencia</th>
                </tr>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                      Cargando lista de asistencia...
                    </TableCell>
                  </TableRow>
                ) : asistenciasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                      No hay socios registrados para este evento
                    </TableCell>
                  </TableRow>
                ) : (
                  asistenciasFiltradas.map((a) => {
                    const socio = a.socio || a.Socio || {};
                    const persona = socio.persona || socio.Persona || {};
                    return (
                      <TableRow key={a.id_asistencia}>
                        <TableCell><strong>Caseta #{socio.nro_caseta || "-"}</strong></TableCell>
                        <TableCell>{`${persona.nombres || ""} ${persona.apellidos || ""}`.trim() || "-"}</TableCell>
                        <TableCell>{persona.ci || "-"}</TableCell>
                        <TableCell>{persona.telefono || "-"}</TableCell>
                        <TableCell>
                          <StatusBadge $status={a.estado_asistencia}>
                            {a.estado_asistencia}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <AttendanceSelect
                            value={a.estado_asistencia}
                            disabled={guardandoId === a.id_asistencia || eventoConcluido}
                            title={eventoConcluido ? "Evento concluido, lista cerrada" : ""}
                            onChange={(e) => handleEstadoChange(a.id_asistencia, e.target.value)}
                          >
                            <option value="Presente">✅ Presente</option>
                            <option value="Falta">❌ Falta (Aplica Multa)</option>
                            <option value="Licencia">⚠️ Licencia Justificada</option>
                          </AttendanceSelect>
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
    </PageContainer>
  );
}

export default AsistenciaPage;
