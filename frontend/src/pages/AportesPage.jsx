import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import Sidebar from "../components/Sidebar";
import useAuth from "../hooks/authHooks";
import toastOptions from "../utils/toastOptions";
import theme from "../styles/theme";
import Modal from "../components/Modal";
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
  ViewButton,
  DeleteButton,
  ActionButton,
  SearchInput,
} from "../styles/commonStyles";
import {
  aportesRoute,
  aportesSociosRoute,
  aplicarMoraAporteRoute,
} from "../utils/APIroutes";
import { formatDate } from "../utils/dateUtils";

// ─── Estilos Personalizados ──────────────────────────────────────────────────

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const MetricCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  span.label {
    font-size: 0.72rem;
    color: ${theme.colors.textMuted};
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  h2 {
    font-size: 1.6rem;
    font-weight: 800;
  }
  p.hint {
    font-size: 0.75rem;
    color: ${theme.colors.textDim};
  }
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  background-color: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  height: 8px;
  overflow: hidden;
  margin-top: 0.35rem;
`;

const ProgressBarFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.success});
  width: ${({ $percent }) => Math.min(100, Math.max(0, $percent))}%;
  border-radius: 999px;
  transition: width 0.4s ease;
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
  nombre_proyecto: "",
  descripcion: "",
  monto_por_socio: "50.00",
  fecha_emision: new Date().toISOString().split("T")[0],
  fecha_limite: "",
  monto_multa_mora: "20.00",
};

function AportesPage() {
  const { auth } = useAuth();
  const [aportes, setAportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [formData, setFormData] = useState(estadoInicial);
  const [guardando, setGuardando] = useState(false);

  // Modal detalle de socios
  const [modalSociosAbierto, setModalSociosAbierto] = useState(false);
  const [aporteSeleccionado, setAporteSeleccionado] = useState(null);
  const [sociosDetalle, setSociosDetalle] = useState([]);
  const [cargandoSocios, setCargandoSocios] = useState(false);
  const [filtroSocioEstado, setFiltroSocioEstado] = useState("todos");

  // Estado del modal de confirmación personalizado (sin alertas nativas de navegador)
  const [confirmModalData, setConfirmModalData] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirmar",
    onConfirm: null,
    loading: false,
  });

  const fetchAportes = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(aportesRoute, auth.config);
      setAportes(Array.isArray(data.aportes) ? data.aportes : []);
    } catch (err) {
      toast.error("Error al cargar los proyectos de aportes", toastOptions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.config) fetchAportes();
  }, [auth]);

  // Cálculos de métricas globales
  const metricasGlobales = useMemo(() => {
    let totalMeta = 0;
    let totalRecaudado = 0;
    let totalPendiente = 0;

    aportes.forEach((ap) => {
      const m = ap.metricas || {};
      totalMeta += m.meta_total || 0;
      totalRecaudado += m.total_recaudado || 0;
      totalPendiente += m.total_pendiente || 0;
    });

    const porcentajeGlobal = totalMeta > 0 ? (totalRecaudado / totalMeta) * 100 : 0;

    return {
      totalProyectos: aportes.length,
      totalMeta,
      totalRecaudado,
      totalPendiente,
      porcentajeGlobal,
    };
  }, [aportes]);

  const aportesFiltrados = aportes.filter((ap) =>
    (ap.nombre_proyecto || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (ap.descripcion || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleSubmitCrear = async (e) => {
    e.preventDefault();
    if (!formData.nombre_proyecto.trim() || !formData.monto_por_socio || !formData.fecha_emision) {
      toast.error("Completa los campos obligatorios", toastOptions);
      return;
    }
    try {
      setGuardando(true);
      const payload = {
        nombre_proyecto: formData.nombre_proyecto.trim(),
        descripcion: formData.descripcion.trim(),
        monto_por_socio: parseFloat(formData.monto_por_socio),
        fecha_emision: formData.fecha_emision,
        fecha_limite: formData.fecha_limite || undefined,
        monto_multa_mora: formData.monto_multa_mora ? parseFloat(formData.monto_multa_mora) : 20.00,
      };

      const { data } = await axios.post(aportesRoute, payload, auth.config);
      toast.success(data.mensaje || "Aporte Pro-Mejora registrado con éxito", toastOptions);
      setModalCrearAbierto(false);
      setFormData(estadoInicial);
      fetchAportes();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al crear el proyecto", toastOptions);
    } finally {
      setGuardando(false);
    }
  };

  const handleVerSocios = async (aporte) => {
    try {
      setAporteSeleccionado(aporte);
      setModalSociosAbierto(true);
      setCargandoSocios(true);
      const { data } = await axios.get(aportesSociosRoute(aporte.id_aporte), auth.config);
      setSociosDetalle(data.socios || []);
    } catch (err) {
      toast.error("Error al cargar la lista de socios del proyecto", toastOptions);
    } finally {
      setCargandoSocios(false);
    }
  };

  const handleAplicarMora = (aporte) => {
    setConfirmModalData({
      isOpen: true,
      title: "Aplicar Multa de Mora (+2 meses)",
      message: `¿Desea aplicar la sanción de multa por mora (${aporte.monto_multa_mora || 20} Bs) a todos los socios con cuotas pendientes en "${aporte.nombre_proyecto}" (+60 días transcurridos)?`,
      confirmText: "Aplicar Multas",
      onConfirm: async () => {
        try {
          setConfirmModalData((prev) => ({ ...prev, loading: true }));
          const { data } = await axios.post(
            aplicarMoraAporteRoute(aporte.id_aporte),
            { forzar: true },
            auth.config
          );
          toast.success(data.mensaje || "Multas por mora aplicadas correctamente", toastOptions);
          setConfirmModalData({ isOpen: false });
          fetchAportes();
          if (modalSociosAbierto && aporteSeleccionado?.id_aporte === aporte.id_aporte) {
            handleVerSocios(aporte);
          }
        } catch (err) {
          toast.error(err.response?.data?.mensaje || "Error al aplicar mora", toastOptions);
          setConfirmModalData((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  const handleEliminar = (aporte) => {
    setConfirmModalData({
      isOpen: true,
      title: "Anular Proyecto Pro-Mejora",
      message: `¿Está seguro de anular el proyecto "${aporte.nombre_proyecto}"? Se darán de baja automáticamente todas las cuotas pendientes de cobro asociadas.`,
      confirmText: "Sí, Anular Proyecto",
      onConfirm: async () => {
        try {
          setConfirmModalData((prev) => ({ ...prev, loading: true }));
          const { data } = await axios.delete(`${aportesRoute}/${aporte.id_aporte}`, auth.config);
          toast.success(data.mensaje || "Proyecto anulado", toastOptions);
          setConfirmModalData({ isOpen: false });
          fetchAportes();
        } catch (err) {
          toast.error(err.response?.data?.mensaje || "Error al anular proyecto", toastOptions);
          setConfirmModalData((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  const sociosDetalleFiltrados = sociosDetalle.filter((s) => {
    if (filtroSocioEstado === "pagados") return s.esta_pagado;
    if (filtroSocioEstado === "pendientes") return !s.esta_pagado;
    if (filtroSocioEstado === "con_mora") return s.tiene_mora_aplicada;
    return true;
  });

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        <SectionHeader>
          <div className="titles">
            <h1>🏗️ Aportes Pro-Mejoras (Obras y Proyectos del Mercado)</h1>
            <p>
              Proyectos especiales (cerámica de pisos, compra de extintores, techos) financiados con cobro único y sanción de mora si pasan 2 meses.
            </p>
          </div>
          <div className="actions">
            <CreateButton onClick={() => setModalCrearAbierto(true)}>
              + Nuevo Proyecto Pro-Mejora
            </CreateButton>
          </div>
        </SectionHeader>

        {/* Métricas Globales */}
        <MetricGrid>
          <MetricCard>
            <span className="label">Proyectos Registrados</span>
            <h2 style={{ color: theme.colors.primary }}>{metricasGlobales.totalProyectos}</h2>
            <p className="hint">Obras y compras extraordinarias</p>
          </MetricCard>

          <MetricCard>
            <span className="label">Meta Financiera Total</span>
            <h2 style={{ color: theme.colors.textMain }}>
              {metricasGlobales.totalMeta.toFixed(2)} Bs
            </h2>
            <p className="hint">Cálculo: cuota única × padrón de socios</p>
          </MetricCard>

          <MetricCard>
            <span className="label">Total Recaudado en Caja</span>
            <h2 style={{ color: theme.colors.success }}>
              {metricasGlobales.totalRecaudado.toFixed(2)} Bs
            </h2>
            <p className="hint">
              {metricasGlobales.porcentajeGlobal.toFixed(1)}% de la meta total
            </p>
            <ProgressBarContainer>
              <ProgressBarFill $percent={metricasGlobales.porcentajeGlobal} />
            </ProgressBarContainer>
          </MetricCard>

          <MetricCard>
            <span className="label">Saldo Pendiente por Cobrar</span>
            <h2 style={{ color: theme.colors.danger }}>
              {metricasGlobales.totalPendiente.toFixed(2)} Bs
            </h2>
            <p className="hint">Cuotas aún no canceladas en ventanilla</p>
          </MetricCard>
        </MetricGrid>

        {/* Tabla de Aportes */}
        <TableCard>
          <TableToolbar>
            <SearchInput
              placeholder="Buscar proyecto o motivo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <span style={{ color: theme.colors.textMuted, fontSize: "0.875rem" }}>
              {aportesFiltrados.length} proyecto(s)
            </span>
          </TableToolbar>

          <TableResponsiveWrapper>
            <TableWrapper>
              <TableHead>
                <tr>
                  <th>Proyecto / Obra</th>
                  <th>Cuota por Socio</th>
                  <th>Progreso de Recaudación</th>
                  <th>Emisión & Vencimiento</th>
                  <th>Regla de Mora (+2 Meses)</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                      Cargando proyectos de aportes...
                    </TableCell>
                  </TableRow>
                ) : aportesFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                      No hay proyectos de aportes pro-mejoras registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  aportesFiltrados.map((ap) => {
                    const m = ap.metricas || {};
                    const pct = m.porcentaje_recaudado || 0;
                    return (
                      <TableRow key={ap.id_aporte}>
                        <TableCell>
                          <strong>{ap.nombre_proyecto}</strong>
                          {ap.descripcion && (
                            <div style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                              {ap.descripcion}
                            </div>
                          )}
                        </TableCell>
                        <TableCell style={{ fontWeight: 700, color: theme.colors.primary }}>
                          {parseFloat(ap.monto_por_socio).toFixed(2)} Bs
                        </TableCell>
                        <TableCell style={{ minWidth: "170px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                            <span style={{ fontWeight: 700, color: theme.colors.success }}>
                              {m.total_recaudado?.toFixed(2) || "0.00"} Bs
                            </span>
                            <span style={{ color: theme.colors.textMuted }}>
                              de {m.meta_total?.toFixed(2) || "0.00"} Bs ({pct}%)
                            </span>
                          </div>
                          <ProgressBarContainer>
                            <ProgressBarFill $percent={pct} />
                          </ProgressBarContainer>
                          <div style={{ fontSize: "0.7rem", color: theme.colors.textDim, marginTop: "0.25rem" }}>
                            {m.socios_pagaron || 0} socio(s) pagaron | {m.socios_pendientes || 0} pendiente(s)
                          </div>
                        </TableCell>
                        <TableCell>
                          <div><strong>Emisión:</strong> {formatDate(ap.fecha_emision)}</div>
                          <div style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                            <strong>Límite:</strong> {formatDate(ap.fecha_limite)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {ap.vencido_dos_meses ? (
                            <div>
                              <StatusBadge $status="Suspendido">
                                ⏰ +2 Meses ({ap.dias_transcurridos} días)
                              </StatusBadge>
                              <div style={{ fontSize: "0.72rem", color: theme.colors.danger, marginTop: "0.2rem" }}>
                                Multa: +{parseFloat(ap.monto_multa_mora).toFixed(2)} Bs
                                {m.multas_mora_aplicadas > 0 && ` (${m.multas_mora_aplicadas} aplicadas)`}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <StatusBadge $status="Activo">
                                En Plazo ({ap.dias_transcurridos}/60 días)
                              </StatusBadge>
                              <div style={{ fontSize: "0.72rem", color: theme.colors.textDim, marginTop: "0.2rem" }}>
                                Mora tras 2 meses: {parseFloat(ap.monto_multa_mora).toFixed(2)} Bs
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge $status={ap.estado === "Activo" ? "Activo" : "Inactivo"}>
                            {ap.estado}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            <ViewButton onClick={() => handleVerSocios(ap)}>
                              👥 Socios ({m.socios_pagaron}/{m.total_socios})
                            </ViewButton>
                            {ap.vencido_dos_meses && m.socios_pendientes > 0 && (
                              <ActionButton
                                onClick={() => handleAplicarMora(ap)}
                                style={{ backgroundColor: "#ef4444", color: "#fff" }}
                              >
                                ⚠️ Aplicar Mora
                              </ActionButton>
                            )}
                            <DeleteButton onClick={() => handleEliminar(ap)}>
                              🗑️ Anular
                            </DeleteButton>
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

      {/* ─── MODAL 1: REGISTRAR NUEVO PROYECTO PRO-MEJORA ─── */}
      <Modal
        isOpen={modalCrearAbierto}
        onClose={() => setModalCrearAbierto(false)}
        title="🏗️ Nuevo Proyecto / Aporte Pro-Mejora"
        maxWidth="580px"
      >
        <form onSubmit={handleSubmitCrear}>
          <FormGroup>
            <Label>Nombre del Proyecto / Obra *</Label>
            <Input
              name="nombre_proyecto"
              placeholder="Ej. Instalación de Cerámica en Pasillos / Extintores de Incendio"
              value={formData.nombre_proyecto}
              onChange={(e) => setFormData({ ...formData, nombre_proyecto: e.target.value })}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label>Justificación o Detalle</Label>
            <Textarea
              name="descripcion"
              placeholder="Detalles aprobados en asamblea para la mejora del mercado (materiales, cotizaciones, etc.)..."
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            />
          </FormGroup>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormGroup>
              <Label>Monto Fijo Único por Socio (Bs) *</Label>
              <Input
                type="number"
                step="0.50"
                min="1"
                placeholder="Ej. 50.00"
                value={formData.monto_por_socio}
                onChange={(e) => setFormData({ ...formData, monto_por_socio: e.target.value })}
                required
              />
              <span style={{ fontSize: "0.72rem", color: theme.colors.textMuted }}>
                Se generará una cuota individual a cada socio activo.
              </span>
            </FormGroup>

            <FormGroup>
              <Label>Multa por Mora si no paga en 2 meses (Bs) *</Label>
              <Input
                type="number"
                step="0.50"
                min="0"
                placeholder="Ej. 20.00"
                value={formData.monto_multa_mora}
                onChange={(e) => setFormData({ ...formData, monto_multa_mora: e.target.value })}
                required
              />
              <span style={{ fontSize: "0.72rem", color: theme.colors.textMuted }}>
                Sanción automática que se cargará tras 60 días de atraso.
              </span>
            </FormGroup>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormGroup>
              <Label>Fecha de Emisión *</Label>
              <Input
                type="date"
                value={formData.fecha_emision}
                onChange={(e) => setFormData({ ...formData, fecha_emision: e.target.value })}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Fecha Límite / Vencimiento</Label>
              <Input
                type="date"
                value={formData.fecha_limite}
                onChange={(e) => setFormData({ ...formData, fecha_limite: e.target.value })}
              />
              <span style={{ fontSize: "0.72rem", color: theme.colors.textMuted }}>
                (Opcional, por defecto 60 días tras la emisión)
              </span>
            </FormGroup>
          </div>

          <FormActions>
            <CancelButton type="button" onClick={() => setModalCrearAbierto(false)}>
              Cancelar
            </CancelButton>
            <CreateButton type="submit" disabled={guardando}>
              {guardando ? "Registrando..." : "Crear y Generar Cuotas a Socios"}
            </CreateButton>
          </FormActions>
        </form>
      </Modal>

      {/* ─── MODAL 2: LISTADO DE SOCIOS DEL PROYECTO ─── */}
      <Modal
        isOpen={modalSociosAbierto}
        onClose={() => setModalSociosAbierto(false)}
        title={
          aporteSeleccionado
            ? `Estado de Cobro - ${aporteSeleccionado.nombre_proyecto} (${parseFloat(
                aporteSeleccionado.monto_por_socio
              ).toFixed(2)} Bs)`
            : "Estado de Cobro de Socios"
        }
        maxWidth="1020px"
      >
        {aporteSeleccionado && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: theme.radius.sm,
                    border: `1px solid ${filtroSocioEstado === "todos" ? theme.colors.primary : theme.colors.border}`,
                    background: filtroSocioEstado === "todos" ? theme.colors.primaryLight : "transparent",
                    color: filtroSocioEstado === "todos" ? theme.colors.primary : theme.colors.textMuted,
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                  onClick={() => setFiltroSocioEstado("todos")}
                >
                  Todos ({sociosDetalle.length})
                </button>
                <button
                  type="button"
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: theme.radius.sm,
                    border: `1px solid ${filtroSocioEstado === "pagados" ? theme.colors.success : theme.colors.border}`,
                    background: filtroSocioEstado === "pagados" ? "rgba(16, 185, 129, 0.15)" : "transparent",
                    color: filtroSocioEstado === "pagados" ? theme.colors.success : theme.colors.textMuted,
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                  onClick={() => setFiltroSocioEstado("pagados")}
                >
                  ✅ Pagados ({sociosDetalle.filter((s) => s.esta_pagado).length})
                </button>
                <button
                  type="button"
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: theme.radius.sm,
                    border: `1px solid ${filtroSocioEstado === "pendientes" ? theme.colors.danger : theme.colors.border}`,
                    background: filtroSocioEstado === "pendientes" ? "rgba(239, 68, 68, 0.15)" : "transparent",
                    color: filtroSocioEstado === "pendientes" ? theme.colors.danger : theme.colors.textMuted,
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                  onClick={() => setFiltroSocioEstado("pendientes")}
                >
                  ⏳ Pendientes ({sociosDetalle.filter((s) => !s.esta_pagado).length})
                </button>
              </div>

              {aporteSeleccionado.vencido_dos_meses && (
                <ActionButton
                  onClick={() => handleAplicarMora(aporteSeleccionado)}
                  style={{ backgroundColor: "#ef4444", color: "#fff", fontSize: "0.75rem", padding: "0.4rem 0.75rem" }}
                >
                  ⚡ Aplicar Multa de Mora (+2 meses)
                </ActionButton>
              )}
            </div>

            <TableResponsiveWrapper style={{ maxHeight: "450px" }}>
              <TableWrapper>
                <TableHead>
                  <tr>
                    <th>Caseta</th>
                    <th>Socio</th>
                    <th>Cuota Asignada</th>
                    <th>Mora (+2 meses)</th>
                    <th>Estado</th>
                  </tr>
                </TableHead>
                <TableBody>
                  {cargandoSocios ? (
                    <TableRow>
                      <TableCell colSpan={5} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                        Cargando estado de socios...
                      </TableCell>
                    </TableRow>
                  ) : sociosDetalleFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                        No se encontraron socios con este filtro
                      </TableCell>
                    </TableRow>
                  ) : (
                    sociosDetalleFiltrados.map((s) => (
                      <TableRow key={s.id_cargo}>
                        <TableCell>
                          <strong>Caseta #{s.nro_caseta}</strong>
                        </TableCell>
                        <TableCell>
                          <strong>{s.nombre_completo}</strong>
                          <div style={{ fontSize: "0.72rem", color: theme.colors.textMuted }}>
                            CI: {s.ci} | Cel: {s.telefono}
                          </div>
                        </TableCell>
                        <TableCell>{s.monto_cuota.toFixed(2)} Bs</TableCell>
                        <TableCell>
                          {s.tiene_mora_aplicada ? (
                            <span style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.8rem" }}>
                              +{s.monto_mora.toFixed(2)} Bs (Multa Mora)
                            </span>
                          ) : (
                            <span style={{ color: theme.colors.textDim, fontSize: "0.75rem" }}>
                              Sin multa
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge $status={s.esta_pagado ? "Activo" : "Inactivo"}>
                            {s.esta_pagado ? "Pagado en Caja" : "Pendiente"}
                          </StatusBadge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </TableWrapper>
            </TableResponsiveWrapper>
          </div>
        )}
      </Modal>

      {/* Modal de confirmación para anulación */}
      <ConfirmModal
        isOpen={confirmModalData.isOpen}
        onClose={() => setConfirmModalData({ ...confirmModalData, isOpen: false })}
        title={confirmModalData.title}
        message={confirmModalData.message}
        confirmText={confirmModalData.confirmText}
        onConfirm={confirmModalData.onConfirm}
        loading={confirmModalData.loading}
      />
    </PageContainer>
  );
}

export default AportesPage;
