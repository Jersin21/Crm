import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import { PDFDownloadLink } from "@react-pdf/renderer";
import {
  Printer,
  FileText,
  Megaphone,
  BookOpen,
  Search,
  Calendar,
  BarChart2,
  Calculator,
  TrendingUp,
  TrendingDown,
  Users,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import useAuth from "../hooks/authHooks";
import useDebounce from "../hooks/useDebounce";
import toastOptions from "../utils/toastOptions";
import theme from "../styles/theme";
import {
  PageContainer,
  ContentContainer,
  SectionHeader,
  Card,
  TableCard,
  TableResponsiveWrapper,
  TableWrapper,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  ActionButton,
} from "../styles/commonStyles";
import { reportesRoute, sociosRoute } from "../utils/APIroutes";
import { formatDate } from "../utils/dateUtils";
import ReportePDF from "../components/ReportePDF";
import ReporteAsambleaPDF from "../components/ReporteAsambleaPDF";
import KardexSocioPDF from "../components/KardexSocioPDF";

const DateFilterBar = styled(Card)`
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  label {
    font-size: 0.8rem;
    color: ${theme.colors.textMuted};
    font-weight: 600;
    text-transform: uppercase;
  }

  input, select {
    padding: 0.5rem 0.75rem;
    background-color: ${theme.colors.bgInput};
    border: 1px solid ${({ $hasError }) => ($hasError ? theme.colors.danger : theme.colors.border)};
    border-radius: ${theme.radius.sm};
    color: ${theme.colors.textMain};
    font-size: 0.85rem;

    &:focus {
      outline: none;
      border-color: ${({ $hasError }) => ($hasError ? theme.colors.danger : theme.colors.primary)};
    }
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const MetricCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  span.label {
    font-size: 0.75rem;
    color: ${theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
`;

const CuadreAlertBox = styled.div`
  background: rgba(14, 165, 233, 0.08);
  border: 1px solid ${theme.colors.primaryLight};
  border-radius: ${theme.radius.md};
  padding: 0.85rem 1.25rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;

  .formula {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: ${theme.colors.textMain};

    strong {
      color: ${theme.colors.primary};
    }
  }
`;

function ReportesPage() {
  const { auth } = useAuth();
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split("T")[0];
  const fechaHoy = hoy.toISOString().split("T")[0];

  const [modoVista, setModoVista] = useState("detallado"); // "detallado" | "asamblea" | "kardex"
  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin, setFechaFin] = useState(fechaHoy);
  const [fechaError, setFechaError] = useState("");
  const [reporte, setReporte] = useState({
    ingresos: [],
    egresos: [],
    resumen_ingresos_publico: [],
    resumen_egresos_publico: [],
    saldo_inicial: 0,
    totalIngresos: 0,
    totalEgresos: 0,
    flujo_periodo: 0,
    saldo_final: 0,
    saldoNeto: 0,
    asociacionNombre: "Asociación Central de Comerciantes",
  });
  const [loading, setLoading] = useState(false);

  // Estados para Kardex de Caseta / Socio
  const [socios, setSocios] = useState([]);
  const [socioSeleccionadoId, setSocioSeleccionadoId] = useState("");
  const [kardexData, setKardexData] = useState(null);
  const [loadingKardex, setLoadingKardex] = useState(false);
  const [busquedaKardex, setBusquedaKardex] = useState("");
  const debouncedBusquedaKardex = useDebounce(busquedaKardex, 300);

  const fetchBalanceConFechas = async (fIni, fFin) => {
    try {
      setLoading(true);
      const params = {};
      if (fIni) params.fecha_inicio = fIni;
      if (fFin) params.fecha_fin = fFin;

      const { data } = await axios.get(`${reportesRoute}/balance`, {
        ...auth.config,
        params,
      });

      setReporte({
        ingresos: data.ingresos || [],
        egresos: data.egresos || [],
        resumen_ingresos_publico: data.resumen_ingresos_publico || [],
        resumen_egresos_publico: data.resumen_egresos_publico || [],
        saldo_inicial: parseFloat(data.saldo_inicial || 0) || 0,
        totalIngresos: parseFloat(data.totalIngresos || data.total_ingresos || 0) || 0,
        totalEgresos: parseFloat(data.totalEgresos || data.total_egresos || 0) || 0,
        flujo_periodo: parseFloat(data.flujo_periodo || data.balance || 0) || 0,
        saldo_final: parseFloat(data.saldo_final || 0) || 0,
        saldoNeto: parseFloat(data.saldoNeto || data.balance || 0) || 0,
        asociacionNombre: data.asociacionNombre || "Asociación Central de Comerciantes",
      });
    } catch (err) {
      toast.error(
        err.response?.data?.mensaje || "Error al generar el reporte de caja",
        toastOptions
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = () => {
    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
      setFechaError("La fecha 'Desde' no puede ser posterior a 'Hasta'");
      toast.error("La fecha 'Desde' no puede ser posterior a 'Hasta'", toastOptions);
      return;
    }
    setFechaError("");
    fetchBalanceConFechas(fechaInicio, fechaFin);
  };

  const aplicarPreset = (tipo) => {
    setFechaError("");
    const ahora = new Date();
    if (tipo === "hoy") {
      const hoyStr = ahora.toISOString().split("T")[0];
      setFechaInicio(hoyStr);
      setFechaFin(hoyStr);
      fetchBalanceConFechas(hoyStr, hoyStr);
    } else if (tipo === "mes_actual") {
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split("T")[0];
      const fin = ahora.toISOString().split("T")[0];
      setFechaInicio(inicio);
      setFechaFin(fin);
      fetchBalanceConFechas(inicio, fin);
    } else if (tipo === "mes_anterior") {
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString().split("T")[0];
      const fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0).toISOString().split("T")[0];
      setFechaInicio(inicio);
      setFechaFin(fin);
      fetchBalanceConFechas(inicio, fin);
    } else if (tipo === "todo") {
      setFechaInicio("");
      setFechaFin("");
      fetchBalanceConFechas("", "");
    }
  };

  // Cargar lista de socios para selector de Kardex
  const fetchSocios = async () => {
    try {
      const res = await axios.get(sociosRoute, auth.config);
      const lista = res.data?.socios || (Array.isArray(res.data) ? res.data : []);
      setSocios(lista);
      if (lista.length > 0 && !socioSeleccionadoId) {
        setSocioSeleccionadoId(lista[0].id_socio);
        fetchKardexSocio(lista[0].id_socio);
      }
    } catch (e) {
      toast.error("Error al cargar la lista de socios", toastOptions);
    }
  };

  // Cargar Kardex histórico del socio
  const fetchKardexSocio = async (idSocio) => {
    if (!idSocio) return;
    try {
      setLoadingKardex(true);
      const { data } = await axios.get(`${reportesRoute}/socio/${idSocio}`, auth.config);
      setKardexData(data);
    } catch (err) {
      toast.error(
        err.response?.data?.mensaje || "Error al cargar el Kardex del socio",
        toastOptions
      );
    } finally {
      setLoadingKardex(false);
    }
  };

  useEffect(() => {
    if (auth?.config) {
      fetchBalanceConFechas(fechaInicio, fechaFin);
      fetchSocios();
    }
  }, [auth]);

  // Manejo de cambio de socio en Kardex
  const handleCambioSocioKardex = (id) => {
    setSocioSeleccionadoId(id);
    fetchKardexSocio(id);
  };

  // Filtrado de socios para el selector de Kardex
  const sociosFiltrados = useMemo(() => {
    const q = debouncedBusquedaKardex.toLowerCase().trim();
    if (!q) return socios;
    return socios.filter((s) => {
      const caseta = String(s.nro_caseta || "").toLowerCase();
      const p = s.persona || {};
      const nom = `${p.nombres || ""} ${p.apellidos || ""}`.toLowerCase();
      const ci = String(p.ci || "").toLowerCase();
      return caseta.includes(q) || nom.includes(q) || ci.includes(q);
    });
  }, [socios, debouncedBusquedaKardex]);

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        <SectionHeader>
          <div className="titles">
            <h1>Rendición de Cuentas y Balances</h1>
            <p>Control financiero de Caja Grande, resúmenes de asamblea y Kardex por caseta</p>
          </div>
          <div className="actions" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {modoVista === "kardex" ? (
              kardexData && (
                <PDFDownloadLink
                  document={
                    <KardexSocioPDF
                      socio={kardexData.socio}
                      movimientos={kardexData.movimientos}
                      resumen={kardexData.resumen}
                    />
                  }
                  fileName={`Kardex_Caseta_${kardexData.socio?.nro_caseta || "Socio"}_${kardexData.socio?.persona?.apellidos || ""}.pdf`}
                  style={{ textDecoration: "none" }}
                >
                  {({ loading: pdfLoading }) => (
                    <ActionButton $variant="primary" disabled={pdfLoading || loadingKardex}>
                      <Printer size={16} /> {pdfLoading ? "Generando..." : "Descargar Kardex B&N (PDF)"}
                    </ActionButton>
                  )}
                </PDFDownloadLink>
              )
            ) : (
              <>
                {/* Descargar PDF Detallado (Blanco y Negro) */}
                <PDFDownloadLink
                  document={
                    <ReportePDF
                      reporte={reporte}
                      fechaInicio={fechaInicio}
                      fechaFin={fechaFin}
                    />
                  }
                  fileName={`Informe_Detallado_Caja_${fechaInicio || "Inicio"}_al_${fechaFin || "Fin"}.pdf`}
                  style={{ textDecoration: "none" }}
                >
                  {({ loading: pdfLoading }) => (
                    <ActionButton $variant="outline" disabled={pdfLoading || loading}>
                      <FileText size={16} /> {pdfLoading ? "Generando..." : "PDF Detallado B&N"}
                    </ActionButton>
                  )}
                </PDFDownloadLink>

                {/* Descargar PDF Simple de Asamblea (Blanco y Negro) */}
                <PDFDownloadLink
                  document={
                    <ReporteAsambleaPDF
                      reporte={reporte}
                      fechaInicio={fechaInicio}
                      fechaFin={fechaFin}
                    />
                  }
                  fileName={`Resumen_Asamblea_Socios_${fechaInicio || "Inicio"}_al_${fechaFin || "Fin"}.pdf`}
                  style={{ textDecoration: "none" }}
                >
                  {({ loading: pdfLoading }) => (
                    <ActionButton $variant="primary" disabled={pdfLoading || loading}>
                      <Megaphone size={16} /> {pdfLoading ? "Generando..." : "PDF Asamblea B&N"}
                    </ActionButton>
                  )}
                </PDFDownloadLink>
              </>
            )}
          </div>
        </SectionHeader>

        {/* Selector de Modo de Informe (3 Pestañas Claras) */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setModoVista("detallado")}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: theme.radius.md,
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
              border: modoVista === "detallado" ? `2px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
              backgroundColor: modoVista === "detallado" ? "rgba(14, 165, 233, 0.15)" : theme.colors.bgInput,
              color: modoVista === "detallado" ? theme.colors.primary : theme.colors.textMuted,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.2s ease",
            }}
          >
            <FileText size={16} /> 1. Libro Mayor Detallado (Directiva)
          </button>
          <button
            type="button"
            onClick={() => setModoVista("asamblea")}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: theme.radius.md,
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
              border: modoVista === "asamblea" ? `2px solid ${theme.colors.success}` : `1px solid ${theme.colors.border}`,
              backgroundColor: modoVista === "asamblea" ? "rgba(16, 185, 129, 0.15)" : theme.colors.bgInput,
              color: modoVista === "asamblea" ? theme.colors.success : theme.colors.textMuted,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.2s ease",
            }}
          >
            <Megaphone size={16} /> 2. Resumen para Asamblea de Socios
          </button>
          <button
            type="button"
            onClick={() => setModoVista("kardex")}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: theme.radius.md,
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
              border: modoVista === "kardex" ? `2px solid #8b5cf6` : `1px solid ${theme.colors.border}`,
              backgroundColor: modoVista === "kardex" ? "rgba(139, 92, 246, 0.15)" : theme.colors.bgInput,
              color: modoVista === "kardex" ? "#a78bfa" : theme.colors.textMuted,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.2s ease",
            }}
          >
            <BookOpen size={16} /> 3. Kardex Histórico por Caseta / Socio
          </button>
        </div>

        {modoVista !== "kardex" ? (
          <>
            <DateFilterBar>
              <FilterGroup $hasError={!!fechaError}>
                <label>Desde:</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => {
                    setFechaInicio(e.target.value);
                    if (fechaError) setFechaError("");
                  }}
                />
              </FilterGroup>
              <FilterGroup $hasError={!!fechaError}>
                <label>Hasta:</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => {
                    setFechaFin(e.target.value);
                    if (fechaError) setFechaError("");
                  }}
                />
              </FilterGroup>
              <ActionButton $variant="primary" onClick={fetchBalance} disabled={loading}>
                <Search size={14} /> {loading ? "Calculando..." : "Filtrar"}
              </ActionButton>

              <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto", flexWrap: "wrap" }}>
                <ActionButton $variant="outline" onClick={() => aplicarPreset("hoy")}>
                  <Calendar size={14} /> Hoy
                </ActionButton>
                <ActionButton $variant="outline" onClick={() => aplicarPreset("mes_actual")}>
                  <Calendar size={14} /> Este Mes
                </ActionButton>
                <ActionButton $variant="outline" onClick={() => aplicarPreset("mes_anterior")}>
                  <Calendar size={14} /> Mes Anterior
                </ActionButton>
                <ActionButton $variant="outline" onClick={() => aplicarPreset("todo")}>
                  <BarChart2 size={14} /> Todo el Histórico
                </ActionButton>
              </div>
            </DateFilterBar>

            {fechaError && (
              <div style={{ color: theme.colors.danger, fontSize: "0.85rem", marginTop: "-1rem", marginBottom: "1rem" }}>
                {fechaError}
              </div>
            )}

            {/* Cuadre Contable con Saldo Inicial */}
            <CuadreAlertBox>
              <div className="formula">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                  <Calculator size={16} /> <strong>Cuadre de Caja:</strong>
                </span>
                <span>Saldo Inicial: <strong>{(reporte.saldo_inicial || 0).toFixed(2)} Bs</strong></span>
                <span>+ Ingresos: <strong>{(reporte.totalIngresos || 0).toFixed(2)} Bs</strong></span>
                <span>- Egresos: <strong>{(reporte.totalEgresos || 0).toFixed(2)} Bs</strong></span>
                <span>= Saldo Final en Caja: <strong>{(reporte.saldo_final || 0).toFixed(2)} Bs</strong></span>
              </div>
              <span style={{ fontSize: "0.78rem", color: theme.colors.textMuted }}>
                Documento configurado en Blanco y Negro para impresión oficial
              </span>
            </CuadreAlertBox>

            {/* Tarjetas KPI de Resumen */}
            <SummaryGrid>
              <MetricCard>
                <span className="label">Saldo Anterior (Inicial)</span>
                <h2 style={{ color: theme.colors.textMain }}>
                  {(reporte.saldo_inicial || 0).toFixed(2)} Bs
                </h2>
              </MetricCard>
              <MetricCard>
                <span className="label">(+) Total Entradas / Cobros</span>
                <h2 style={{ color: theme.colors.success }}>
                  + {(reporte.totalIngresos || 0).toFixed(2)} Bs
                </h2>
              </MetricCard>
              <MetricCard>
                <span className="label">(-) Total Salidas / Gastos</span>
                <h2 style={{ color: theme.colors.danger }}>
                  - {(reporte.totalEgresos || 0).toFixed(2)} Bs
                </h2>
              </MetricCard>
              <MetricCard>
                <span className="label">(=) Flujo Neto del Período</span>
                <h2 style={{ color: reporte.flujo_periodo >= 0 ? theme.colors.primary : theme.colors.danger }}>
                  {reporte.flujo_periodo >= 0 ? "+" : ""}{(reporte.flujo_periodo || 0).toFixed(2)} Bs
                </h2>
              </MetricCard>
              <MetricCard style={{ borderLeft: `4px solid ${theme.colors.primary}` }}>
                <span className="label">(=) Saldo Final en Caja</span>
                <h2 style={{ color: reporte.saldo_final >= 0 ? theme.colors.success : theme.colors.danger }}>
                  {(reporte.saldo_final || 0).toFixed(2)} Bs
                </h2>
              </MetricCard>
            </SummaryGrid>

            {modoVista === "detallado" ? (
              /* MODO 1: DETALLADO (DIRECTIVA / AUDITORÍA INTERNA) */
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                {/* Tabla Detalle Ingresos */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <h3 style={{ fontSize: "1.05rem", color: theme.colors.textMain, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <TrendingUp size={18} color={theme.colors.success} /> Detalle de Ingresos Registrados ({reporte.ingresos.length})
                    </h3>
                  </div>
                  <TableCard>
                    <TableResponsiveWrapper>
                      <TableWrapper>
                        <TableHead>
                          <tr>
                            <th>Fecha</th>
                            <th>Socio / Caseta</th>
                            <th>Detalle</th>
                            <th style={{ textAlign: "right" }}>Monto</th>
                          </tr>
                        </TableHead>
                        <TableBody>
                          {reporte.ingresos.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                                Sin ingresos en el período seleccionado
                              </TableCell>
                            </TableRow>
                          ) : (
                            reporte.ingresos.slice(0, 50).map((ing) => {
                              const soc = ing.socio || ing.Socio || {};
                              const per = soc.persona || soc.Persona || {};
                              const socioTexto = per.apellidos
                                ? `Caseta #${soc.nro_caseta || "-"} (${per.nombres || ""} ${per.apellidos})`
                                : (ing.pagador || `Socio #${ing.id_socio || "-"}`);
                              return (
                                <TableRow key={ing.id_ingreso}>
                                  <TableCell>{formatDate(ing.fecha_pago)}</TableCell>
                                  <TableCell>
                                    <strong>{socioTexto}</strong>
                                  </TableCell>
                                  <TableCell style={{ fontSize: "0.8rem", color: theme.colors.textMuted }}>
                                    {ing.concepto || ing.observacion || "Cobro de cuotas"}
                                  </TableCell>
                                  <TableCell style={{ textAlign: "right", fontWeight: 700, color: theme.colors.success }}>
                                    + {parseFloat(ing.monto_total_recibido || 0).toFixed(2)} Bs
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </TableWrapper>
                    </TableResponsiveWrapper>
                  </TableCard>
                </div>

                {/* Tabla Detalle Egresos */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <h3 style={{ fontSize: "1.05rem", color: theme.colors.textMain, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <TrendingDown size={18} color={theme.colors.danger} /> Detalle de Salidas y Gastos ({reporte.egresos.length})
                    </h3>
                  </div>
                  <TableCard>
                    <TableResponsiveWrapper>
                      <TableWrapper>
                        <TableHead>
                          <tr>
                            <th>Fecha</th>
                            <th>Categoría / Detalle</th>
                            <th style={{ textAlign: "right" }}>Monto</th>
                          </tr>
                        </TableHead>
                        <TableBody>
                          {reporte.egresos.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                                Sin egresos en el período seleccionado
                              </TableCell>
                            </TableRow>
                          ) : (
                            reporte.egresos.slice(0, 50).map((eg) => (
                              <TableRow key={eg.id_egreso}>
                                <TableCell>{formatDate(eg.fecha_gasto)}</TableCell>
                                <TableCell>
                                  <strong style={{ color: theme.colors.primary }}>
                                    {eg.tipo_egreso?.nombre_categoria || eg.TipoEgreso?.nombre_categoria || "Gasto"}:
                                  </strong>{" "}
                                  {eg.detalle || "Gasto institucional"}
                                </TableCell>
                                <TableCell style={{ textAlign: "right", fontWeight: 700, color: theme.colors.danger }}>
                                  - {parseFloat(eg.monto || 0).toFixed(2)} Bs
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </TableWrapper>
                    </TableResponsiveWrapper>
                  </TableCard>
                </div>
              </div>
            ) : (
              /* MODO 2: RESUMEN SENCILLO DE ASAMBLEA PARA SOCIOS */
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                {/* Tabla Resumen Ingresos Asamblea */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <h3 style={{ fontSize: "1.05rem", color: theme.colors.textMain, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <TrendingUp size={18} color={theme.colors.success} /> 1. ¿De qué se recaudó? (Consolidado por Concepto)
                    </h3>
                    <span style={{ fontSize: "0.75rem", color: theme.colors.success, background: "rgba(16,185,129,0.1)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontWeight: 600 }}>
                      Sin Duplicados
                    </span>
                  </div>
                  <TableCard>
                    <TableResponsiveWrapper>
                      <TableWrapper>
                        <TableHead>
                          <tr>
                            <th>Concepto / Rubro</th>
                            <th style={{ textAlign: "center" }}>Socios / Pagos</th>
                            <th style={{ textAlign: "right" }}>Total Recaudado</th>
                          </tr>
                        </TableHead>
                        <TableBody>
                          {(!reporte.resumen_ingresos_publico || reporte.resumen_ingresos_publico.length === 0) ? (
                            <TableRow>
                              <TableCell colSpan={3} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                                Sin ingresos en el período reportado
                              </TableCell>
                            </TableRow>
                          ) : (
                            reporte.resumen_ingresos_publico.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell>
                                  <strong>{item.concepto}</strong>
                                </TableCell>
                                <TableCell style={{ textAlign: "center" }}>
                                  <span
                                    style={{
                                      background: "rgba(14, 165, 233, 0.15)",
                                      color: "#38bdf8",
                                      padding: "0.2rem 0.6rem",
                                      borderRadius: "9999px",
                                      fontWeight: 600,
                                      fontSize: "0.8rem",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.35rem",
                                    }}
                                  >
                                    <Users size={12} /> {item.cantidad_socios || item.cantidad_pagos} pago(s)
                                  </span>
                                </TableCell>
                                <TableCell style={{ textAlign: "right", fontWeight: 700, color: theme.colors.success }}>
                                  + {parseFloat(item.total_recaudado || 0).toFixed(2)} Bs
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </TableWrapper>
                    </TableResponsiveWrapper>
                  </TableCard>
                </div>

                {/* Tabla Resumen Egresos Asamblea */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <h3 style={{ fontSize: "1.05rem", color: theme.colors.textMain, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <TrendingDown size={18} color={theme.colors.danger} /> 2. ¿En qué se gastó? (Salidas Autorizadas)
                    </h3>
                  </div>
                  <TableCard>
                    <TableResponsiveWrapper>
                      <TableWrapper>
                        <TableHead>
                          <tr>
                            <th>Categoría</th>
                            <th>Concepto</th>
                            <th style={{ textAlign: "center" }}>N° Pagos</th>
                            <th style={{ textAlign: "right" }}>Total Gastado</th>
                          </tr>
                        </TableHead>
                        <TableBody>
                          {(!reporte.resumen_egresos_publico || reporte.resumen_egresos_publico.length === 0) ? (
                            <TableRow>
                              <TableCell colSpan={4} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                                Sin egresos en el período reportado
                              </TableCell>
                            </TableRow>
                          ) : (
                            reporte.resumen_egresos_publico.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell>
                                  <strong>{item.categoria}</strong>
                                </TableCell>
                                <TableCell style={{ fontSize: "0.85rem", color: theme.colors.textMuted }}>
                                  {item.detalles || "Gastos autorizados"}
                                </TableCell>
                                <TableCell style={{ textAlign: "center" }}>
                                  <span
                                    style={{
                                      background: "rgba(239, 68, 68, 0.15)",
                                      color: "#f87171",
                                      padding: "0.2rem 0.6rem",
                                      borderRadius: "9999px",
                                      fontWeight: 600,
                                      fontSize: "0.8rem",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.35rem",
                                    }}
                                  >
                                    <FileText size={12} /> {item.cantidad_desembolsos}
                                  </span>
                                </TableCell>
                                <TableCell style={{ textAlign: "right", fontWeight: 700, color: theme.colors.danger }}>
                                  - {parseFloat(item.total_egresado || 0).toFixed(2)} Bs
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </TableWrapper>
                    </TableResponsiveWrapper>
                  </TableCard>
                </div>
              </div>
            )}
          </>
        ) : (
          /* MODO 3: KARDEX HISTÓRICO POR CASETA / SOCIO */
          <div>
            <Card style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", alignItems: "center" }}>
                <FilterGroup>
                  <label>Buscar Caseta / Socio:</label>
                  <input
                    type="text"
                    placeholder="Ej. Caseta 12 o nombre..."
                    value={busquedaKardex}
                    onChange={(e) => setBusquedaKardex(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </FilterGroup>

                <FilterGroup>
                  <label>Seleccionar Socio:</label>
                  <select
                    value={socioSeleccionadoId}
                    onChange={(e) => handleCambioSocioKardex(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    {sociosFiltrados.map((s) => {
                      const p = s.persona || {};
                      return (
                        <option key={s.id_socio} value={s.id_socio}>
                          Caseta #{s.nro_caseta} - {p.nombres || ""} {p.apellidos || ""} (CI: {p.ci || "S/CI"})
                        </option>
                      );
                    })}
                  </select>
                </FilterGroup>
              </div>
            </Card>

            {loadingKardex ? (
              <Card style={{ textAlign: "center", padding: "3rem" }}>
                <p style={{ color: theme.colors.textMuted }}>Cargando Kardex histórico de la caseta...</p>
              </Card>
            ) : kardexData ? (
              <>
                {/* Resumen del Socio */}
                <Card style={{ marginBottom: "1.5rem", borderLeft: `4px solid #8b5cf6` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <h2 style={{ fontSize: "1.25rem", color: theme.colors.textMain }}>
                        Caseta #{kardexData.socio?.nro_caseta || "-"} · {kardexData.socio?.persona?.nombres || ""}{" "}
                        {kardexData.socio?.persona?.apellidos || ""}
                      </h2>
                      <p style={{ color: theme.colors.textMuted, fontSize: "0.85rem", marginTop: "0.25rem" }}>
                        CI: <strong>{kardexData.socio?.persona?.ci || "S/CI"}</strong> · Tel:{" "}
                        <strong>{kardexData.socio?.persona?.telefono || "Sin teléfono"}</strong> · Estado:{" "}
                        <strong style={{ color: theme.colors.success }}>{kardexData.socio?.estado_socio || "Activo"}</strong>
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: "1rem" }}>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "0.75rem", color: theme.colors.textMuted, textTransform: "uppercase" }}>
                          Total Cargos (Debe)
                        </span>
                        <div style={{ fontWeight: 800, fontSize: "1.1rem", color: theme.colors.textMain }}>
                          Bs. {Number(kardexData.resumen?.total_cargado || 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "0.75rem", color: theme.colors.textMuted, textTransform: "uppercase" }}>
                          Total Pagos (Haber)
                        </span>
                        <div style={{ fontWeight: 800, fontSize: "1.1rem", color: theme.colors.success }}>
                          Bs. {Number(kardexData.resumen?.total_pagado || 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "0.75rem", color: theme.colors.textMuted, textTransform: "uppercase" }}>
                          Deuda Exigible Actual
                        </span>
                        <div style={{ fontWeight: 800, fontSize: "1.1rem", color: Number(kardexData.resumen?.total_deuda_actual || 0) > 0 ? theme.colors.danger : theme.colors.success }}>
                          Bs. {Number(kardexData.resumen?.total_deuda_actual || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Tabla Cronológica del Kardex */}
                <TableCard>
                  <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${theme.colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: "1.05rem", color: theme.colors.textMain }}>
                      Movimientos Cronológicos del Kardex ({kardexData.movimientos?.length || 0} registros)
                    </h3>
                    <span style={{ fontSize: "0.8rem", color: theme.colors.textMuted }}>
                      Libro Mayor Auxiliar de Caseta
                    </span>
                  </div>
                  <TableResponsiveWrapper>
                    <TableWrapper>
                      <TableHead>
                        <tr>
                          <th>N°</th>
                          <th>Fecha</th>
                          <th>Referencia</th>
                          <th>Concepto / Glosa</th>
                          <th style={{ textAlign: "right" }}>Debe (Bs)</th>
                          <th style={{ textAlign: "right" }}>Haber (Bs)</th>
                          <th style={{ textAlign: "right" }}>Saldo Acumulado (Bs)</th>
                        </tr>
                      </TableHead>
                      <TableBody>
                        {(!kardexData.movimientos || kardexData.movimientos.length === 0) ? (
                          <TableRow>
                            <TableCell colSpan={7} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                              No se registran movimientos para esta caseta.
                            </TableCell>
                          </TableRow>
                        ) : (
                          kardexData.movimientos.map((m, idx) => (
                            <TableRow key={m.id || idx}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>{m.fecha}</TableCell>
                              <TableCell>
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    padding: "0.2rem 0.5rem",
                                    borderRadius: "4px",
                                    background: m.tipo === "CARGO" ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                                    color: m.tipo === "CARGO" ? theme.colors.danger : theme.colors.success,
                                    fontWeight: 700,
                                  }}
                                >
                                  {m.referencia}
                                </span>
                              </TableCell>
                              <TableCell>
                                <strong>{m.descripcion}</strong>
                              </TableCell>
                              <TableCell style={{ textAlign: "right", color: Number(m.debe || 0) > 0 ? theme.colors.danger : theme.colors.textMuted }}>
                                {Number(m.debe || 0) > 0 ? `+ ${Number(m.debe).toFixed(2)}` : "-"}
                              </TableCell>
                              <TableCell style={{ textAlign: "right", color: Number(m.haber || 0) > 0 ? theme.colors.success : theme.colors.textMuted, fontWeight: Number(m.haber || 0) > 0 ? 700 : 400 }}>
                                {Number(m.haber || 0) > 0 ? `- ${Number(m.haber).toFixed(2)}` : "-"}
                              </TableCell>
                              <TableCell style={{ textAlign: "right", fontWeight: 800, color: Number(m.saldo_acumulado || 0) > 0 ? theme.colors.danger : theme.colors.textMain }}>
                                {Number(m.saldo_acumulado || 0).toFixed(2)} Bs
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </TableWrapper>
                  </TableResponsiveWrapper>
                </TableCard>
              </>
            ) : (
              <Card style={{ textAlign: "center", padding: "2rem" }}>
                <p style={{ color: theme.colors.textMuted }}>Seleccione una caseta o socio para ver su Kardex de movimientos.</p>
              </Card>
            )}
          </div>
        )}
      </ContentContainer>
    </PageContainer>
  );
}

export default ReportesPage;
