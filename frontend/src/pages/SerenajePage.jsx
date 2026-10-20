import React, { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Zap, Users, FileText, Eye, Shield, CheckCircle2, Printer, DollarSign } from "lucide-react";
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
  CreateButton,
  ViewButton,
  SearchInput,
  ActionButton,
  StatusBadge,
} from "../styles/commonStyles";
import { sociosRoute, cargosRoute, ingresosRoute, serenajeRoute } from "../utils/APIroutes";
import Modal from "../components/Modal";
import ReciboPagoPDF from "../components/ReciboPagoPDF";

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
    font-weight: 700;
  }
  h2 {
    font-size: 1.6rem;
    font-weight: 800;
  }
`;

const ViewToggleBar = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const TabBtn = styled.button`
  padding: 0.5rem 1rem;
  border-radius: ${theme.radius.md};
  border: 1px solid ${({ $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ $active }) => ($active ? theme.colors.primaryLight : "transparent")};
  color: ${({ $active }) => ($active ? theme.colors.primary : theme.colors.textMuted)};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
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
  border: 1px solid ${({ $hasError }) => ($hasError ? theme.colors.danger : theme.colors.border)};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  font-size: 0.875rem;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${({ $hasError }) => ($hasError ? theme.colors.danger : theme.colors.primary)};
  }
`;

const ErrorText = styled.span`
  color: ${theme.colors.danger};
  font-size: 0.75rem;
  display: block;
  margin-top: 0.25rem;
`;

function SerenajePage() {
  const { auth } = useAuth();
  const [socios, setSocios] = useState([]);
  const [cargosSerenaje, setCargosSerenaje] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState("socios"); // 'socios' | 'historial'

  // Modal para generar serenaje masivo del mes
  const [modalGenerar, setModalGenerar] = useState(false);
  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const [periodoGenerar, setPeriodoGenerar] = useState(mesActual);
  const [periodoError, setPeriodoError] = useState("");
  const [generando, setGenerando] = useState(false);

  // Modal detalle de cobro y meses de serenaje
  const [modalCobro, setModalCobro] = useState(false);
  const [socioCobro, setSocioCobro] = useState(null);
  const [mesesAdeudados, setMesesAdeudados] = useState([]);
  const [mesesSeleccionados, setMesesSeleccionados] = useState({});
  const [guardandoCobro, setGuardandoCobro] = useState(false);
  const [reciboEmitido, setReciboEmitido] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resSocios, resCargos] = await Promise.all([
        axios.get(sociosRoute, auth.config),
        axios.get(cargosRoute, auth.config),
      ]);

      const listaSocios = Array.isArray(resSocios.data)
        ? resSocios.data
        : resSocios.data.socios || [];
      const listaCargos = Array.isArray(resCargos.data)
        ? resCargos.data
        : resCargos.data.cargos || [];

      // Filtrar solo cargos correspondientes a Serenaje
      const soloSerenaje = listaCargos.filter(
        (c) =>
          c.tipo_origen === "serenaje" ||
          (c.concepto?.nombre_concepto || c.ConceptoCobro?.nombre_concepto || "")
            .toLowerCase()
            .includes("serenaje")
      );

      setSocios(listaSocios);
      setCargosSerenaje(soloSerenaje);
    } catch (err) {
      toast.error(
        err.response?.data?.mensaje || "Error al cargar datos del módulo Serenaje",
        toastOptions
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.config) fetchData();
  }, [auth]);

  // Generar cargos masivos de Serenaje
  const handleGenerarMes = async (e) => {
    e.preventDefault();
    const periodoLimpio = (periodoGenerar || "").trim();
    const regexPeriodo = /^\d{4}-(0[1-9]|1[0-2])$/;

    if (!regexPeriodo.test(periodoLimpio)) {
      setPeriodoError("El formato del período debe ser AAAA-MM (ej. 2026-10)");
      toast.error("El formato del período debe ser AAAA-MM (ej. 2026-10)", toastOptions);
      return;
    }
    setPeriodoError("");

    try {
      setGenerando(true);
      const { data } = await axios.post(
        serenajeRoute,
        { periodo: periodoLimpio },
        auth.config
      );
      toast.success(
        data.mensaje || `Serenaje generado para el periodo ${periodoLimpio}`,
        toastOptions
      );
      setModalGenerar(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al generar cargos de serenaje", toastOptions);
    } finally {
      setGenerando(false);
    }
  };

  // Abrir modal de cobro para un socio
  const abrirDetalleCobro = (socioItem) => {
    setSocioCobro(socioItem);
    setReciboEmitido(null);

    // Buscar cargos de serenaje pendientes o parciales de este socio
    const pendientes = cargosSerenaje.filter(
      (c) =>
        String(c.id_socio) === String(socioItem.id_socio) &&
        (c.estado === "Pendiente" || c.estado === "Pagado_Parcial")
    );

    setMesesAdeudados(pendientes);

    // Marcar todos para pagar por defecto
    const checks = {};
    pendientes.forEach((c) => {
      checks[c.id_cargo] = true;
    });
    setMesesSeleccionados(checks);

    setModalCobro(true);
  };

  const calcularTotalACobrar = () => {
    return mesesAdeudados.reduce((acc, c) => {
      if (mesesSeleccionados[c.id_cargo]) {
        const subtotal =
          parseFloat(c.saldo_capital_pendiente || 0) +
          parseFloat(c.monto_mora_acumulada || 0);
        return acc + (isNaN(subtotal) ? 0 : subtotal);
      }
      return acc;
    }, 0);
  };

  const handleCobrarSerenaje = async () => {
    const seleccionados = mesesAdeudados.filter((c) => mesesSeleccionados[c.id_cargo]);
    if (seleccionados.length === 0) {
      toast.error("Selecciona al menos un mes de serenaje para cobrar", toastOptions);
      return;
    }

    const total = calcularTotalACobrar();
    const cargosPayload = seleccionados.map((c) => ({
      id_cargo: c.id_cargo,
      monto_abonado_capital: parseFloat(c.saldo_capital_pendiente || 0),
      monto_abonado_mora: parseFloat(c.monto_mora_acumulada || 0),
    }));

    try {
      setGuardandoCobro(true);
      const { data } = await axios.post(
        ingresosRoute,
        {
          id_socio: socioCobro.id_socio,
          monto_total_recibido: total,
          observacion: `Cobro aporte Serenaje y Seguridad (${seleccionados.map((s) => s.periodo).join(", ")})`,
          cargos: cargosPayload,
        },
        auth.config
      );

      toast.success("Pago de serenaje registrado y recibo emitido", toastOptions);
      setReciboEmitido(data.ingreso);
      fetchData();
      // Remover de lista local
      setMesesAdeudados((prev) => prev.filter((c) => !mesesSeleccionados[c.id_cargo]));
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al procesar cobro", toastOptions);
    } finally {
      setGuardandoCobro(false);
    }
  };

  // Resumen agrupado por socio para la tabla principal
  const sociosConSerenaje = socios.map((s) => {
    const p = s.persona || s.Persona || {};
    const pendientes = cargosSerenaje.filter(
      (c) =>
        String(c.id_socio) === String(s.id_socio) &&
        (c.estado === "Pendiente" || c.estado === "Pagado_Parcial")
    );

    const totalDeuda = pendientes.reduce(
      (acc, c) => {
        const val =
          parseFloat(c.saldo_capital_pendiente || 0) +
          parseFloat(c.monto_mora_acumulada || 0);
        return acc + (isNaN(val) ? 0 : val);
      },
      0
    );

    return {
      ...s,
      persona: p,
      mesesPendientesCount: pendientes.length,
      totalDeudaSerenaje: totalDeuda,
    };
  });

  const sociosFiltrados = sociosConSerenaje.filter((s) => {
    const nom = `${s.persona.nombres || ""} ${s.persona.apellidos || ""}`.toLowerCase();
    const cas = String(s.nro_caseta || "").toLowerCase();
    const q = busqueda.trim().toLowerCase();
    return nom.includes(q) || cas.includes(q);
  });

  const cargosFiltrados = cargosSerenaje.filter((c) => {
    const soc = c.socio || c.Socio || {};
    const p = soc.persona || soc.Persona || {};
    const nom = `${p.nombres || ""} ${p.apellidos || ""}`.toLowerCase();
    const cas = String(soc.nro_caseta || "").toLowerCase();
    const q = busqueda.trim().toLowerCase();
    return nom.includes(q) || cas.includes(q) || (c.periodo || "").includes(q);
  });

  const totalDeudaGeneral = sociosConSerenaje.reduce(
    (acc, s) => acc + (s.totalDeudaSerenaje || 0),
    0
  );
  const totalSociosConDeuda = sociosConSerenaje.filter((s) => s.mesesPendientesCount > 0).length;

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        <SectionHeader>
          <div className="titles">
            <h1>Aporte de Serenaje y Seguridad</h1>
            <p>Cuota fija mensual de 20.00 Bs por socio | Acumulación por meses adeudados</p>
          </div>
          <div className="actions">
            <CreateButton onClick={() => { setModalGenerar(true); setPeriodoError(""); }}>
              <Zap size={16} /> Generar Serenaje del Mes
            </CreateButton>
          </div>
        </SectionHeader>

        <MetricGrid>
          <MetricCard>
            <span className="label">Cuota Fija Mensual</span>
            <h2 style={{ color: theme.colors.warning }}>20.00 Bs / socio</h2>
          </MetricCard>
          <MetricCard>
            <span className="label">Total Cartera por Cobrar</span>
            <h2 style={{ color: theme.colors.danger }}>
              {(totalDeudaGeneral || 0).toFixed(2)} Bs
            </h2>
          </MetricCard>
          <MetricCard>
            <span className="label">Socios con Meses Pendientes</span>
            <h2 style={{ color: theme.colors.primary }}>{totalSociosConDeuda} socios</h2>
          </MetricCard>
        </MetricGrid>

        <ViewToggleBar>
          <TabBtn $active={vista === "socios"} onClick={() => setVista("socios")}>
            <Users size={16} style={{ verticalAlign: "middle", marginRight: "0.5rem" }} />
            Padrón de Socios y Deuda Acumulada
          </TabBtn>
          <TabBtn $active={vista === "historial"} onClick={() => setVista("historial")}>
            <FileText size={16} style={{ verticalAlign: "middle", marginRight: "0.5rem" }} />
            Historial de Cargos de Serenaje
          </TabBtn>
        </ViewToggleBar>

        {vista === "socios" ? (
          <TableCard>
            <TableToolbar>
              <SearchInput
                placeholder="Buscar por socio o número de caseta..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <span style={{ color: theme.colors.textMuted, fontSize: "0.875rem" }}>
                {sociosFiltrados.length} socio(s)
              </span>
            </TableToolbar>
            <TableResponsiveWrapper>
              <TableWrapper>
                <TableHead>
                  <tr>
                    <th>Caseta</th>
                    <th>Socio (Nombres y Apellidos)</th>
                    <th>Teléfono</th>
                    <th>Meses que Debe</th>
                    <th>Monto Total a Cobrar</th>
                    <th>Acciones</th>
                  </tr>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                        Cargando padrón de socios...
                      </TableCell>
                    </TableRow>
                  ) : sociosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                        No se encontraron socios registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    sociosFiltrados.map((s) => (
                      <TableRow key={s.id_socio}>
                        <TableCell>
                          <strong>Caseta #{s.nro_caseta}</strong>
                        </TableCell>
                        <TableCell>
                          <strong>
                            {s.persona.nombres || "-"} {s.persona.apellidos || ""}
                          </strong>
                        </TableCell>
                        <TableCell>{s.persona.telefono || "-"}</TableCell>
                        <TableCell>
                          {s.mesesPendientesCount > 0 ? (
                            <StatusBadge $status="Pendiente">
                              {s.mesesPendientesCount} {s.mesesPendientesCount === 1 ? "mes" : "meses"} pendiente(s)
                            </StatusBadge>
                          ) : (
                            <StatusBadge $status="Activo">Al día</StatusBadge>
                          )}
                        </TableCell>
                        <TableCell
                          style={{
                            fontWeight: 800,
                            fontSize: "1rem",
                            color: s.totalDeudaSerenaje > 0 ? theme.colors.danger : theme.colors.success,
                          }}
                        >
                          {(s.totalDeudaSerenaje || 0).toFixed(2)} Bs
                        </TableCell>
                        <TableCell>
                          <ViewButton onClick={() => abrirDetalleCobro(s)}>
                            <Eye size={14} /> Ver Meses / Cobrar
                          </ViewButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </TableWrapper>
            </TableResponsiveWrapper>
          </TableCard>
        ) : (
          <TableCard>
            <TableToolbar>
              <SearchInput
                placeholder="Buscar por socio, caseta o periodo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <span style={{ color: theme.colors.textMuted, fontSize: "0.875rem" }}>
                {cargosFiltrados.length} cargo(s)
              </span>
            </TableToolbar>
            <TableResponsiveWrapper>
              <TableWrapper>
                <TableHead>
                  <tr>
                    <th>Caseta</th>
                    <th>Socio</th>
                    <th>Periodo</th>
                    <th>Detalle</th>
                    <th>Capital</th>
                    <th>Mora</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </TableHead>
                <TableBody>
                  {cargosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                        No hay cargos de serenaje registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    cargosFiltrados.map((c) => {
                      const soc = c.socio || c.Socio || {};
                      const p = soc.persona || soc.Persona || {};
                      const total =
                        parseFloat(c.saldo_capital_pendiente || 0) +
                        parseFloat(c.monto_mora_acumulada || 0);
                      return (
                        <TableRow key={c.id_cargo}>
                          <TableCell><strong>Caseta #{soc.nro_caseta || "-"}</strong></TableCell>
                          <TableCell>{p.nombres || ""} {p.apellidos || ""}</TableCell>
                          <TableCell>{c.periodo || "-"}</TableCell>
                          <TableCell>{c.detalle || "-"}</TableCell>
                          <TableCell>{parseFloat(c.saldo_capital_pendiente || 0).toFixed(2)} Bs</TableCell>
                          <TableCell style={{ color: parseFloat(c.monto_mora_acumulada || 0) > 0 ? theme.colors.danger : theme.colors.textMuted }}>
                            {parseFloat(c.monto_mora_acumulada || 0).toFixed(2)} Bs
                          </TableCell>
                          <TableCell style={{ fontWeight: 800, color: theme.colors.warning }}>
                            {(isNaN(total) ? 0 : total).toFixed(2)} Bs
                          </TableCell>
                          <TableCell>
                            <StatusBadge $status={c.estado}>{c.estado}</StatusBadge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </TableWrapper>
            </TableResponsiveWrapper>
          </TableCard>
        )}
      </ContentContainer>

      {/* Modal Generar Serenaje Masivo */}
      <Modal
        isOpen={modalGenerar}
        onClose={() => setModalGenerar(false)}
        title="Generar Aporte Mensual de Serenaje para Socios Activos"
        maxWidth="500px"
      >
        <form onSubmit={handleGenerarMes}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.75rem", background: "rgba(14, 165, 233, 0.08)", borderRadius: theme.radius.md, marginBottom: "1.25rem", border: `1px solid rgba(14, 165, 233, 0.2)` }}>
            <Shield size={20} color={theme.colors.primary} style={{ flexShrink: 0, marginTop: "2px" }} />
            <p style={{ fontSize: "0.85rem", color: theme.colors.textMain, margin: 0 }}>
              Esta acción generará el cargo fijo de <strong>20.00 Bs</strong> por concepto de Serenaje y Seguridad a <strong>todos los socios activos</strong> para el mes indicado.
            </p>
          </div>
          <FormGroup>
            <Label>Periodo a Generar (Año-Mes) *</Label>
            <Input
              type="text"
              placeholder="Ej. 2026-10"
              value={periodoGenerar}
              $hasError={!!periodoError}
              onChange={(e) => {
                setPeriodoGenerar(e.target.value);
                if (periodoError) setPeriodoError("");
              }}
              required
            />
            {periodoError && <ErrorText>{periodoError}</ErrorText>}
          </FormGroup>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button
              type="button"
              style={{
                background: "none",
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.textMuted,
                padding: "0.6rem 1.2rem",
                borderRadius: theme.radius.md,
                cursor: "pointer",
              }}
              onClick={() => setModalGenerar(false)}
            >
              Cancelar
            </button>
            <CreateButton type="submit" disabled={generando}>
              <Zap size={16} /> {generando ? "Generando..." : "Confirmar y Generar Cargos"}
            </CreateButton>
          </div>
        </form>
      </Modal>

      {/* Modal Detalle de Meses Adeudados y Cobro Directo */}
      <Modal
        isOpen={modalCobro}
        onClose={() => setModalCobro(false)}
        title={`Detalle de Serenaje - Caseta #${socioCobro?.nro_caseta || ""}`}
        maxWidth="680px"
      >
        {socioCobro && (
          <div>
            <div style={{ padding: "0.75rem", background: theme.colors.bgInput, borderRadius: theme.radius.md, marginBottom: "1rem" }}>
              <strong style={{ fontSize: "1rem", color: theme.colors.textMain }}>
                {socioCobro.persona?.nombres} {socioCobro.persona?.apellidos}
              </strong>
              <div style={{ fontSize: "0.85rem", color: theme.colors.textMuted, marginTop: "0.2rem" }}>
                CI: {socioCobro.persona?.ci || "-"} | Teléfono: {socioCobro.persona?.telefono || "-"}
              </div>
            </div>

            <h4 style={{ fontSize: "0.9rem", color: theme.colors.textMain, marginBottom: "0.5rem" }}>
              Meses que debe de serenaje:
            </h4>

            {mesesAdeudados.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center", background: "rgba(16, 185, 129, 0.1)", color: theme.colors.success, borderRadius: theme.radius.md, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={18} /> Este socio no tiene meses pendientes de Serenaje. ¡Está al día!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "280px", overflowY: "auto", marginBottom: "1rem" }}>
                {mesesAdeudados.map((c) => {
                  const id = c.id_cargo;
                  const isChecked = !!mesesSeleccionados[id];
                  const subtotal =
                    parseFloat(c.saldo_capital_pendiente || 0) +
                    parseFloat(c.monto_mora_acumulada || 0);
                  return (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: theme.colors.bgCardHover,
                        padding: "0.75rem",
                        borderRadius: theme.radius.sm,
                        border: `1px solid ${isChecked ? theme.colors.primary : theme.colors.border}`,
                      }}
                    >
                      <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setMesesSeleccionados({
                              ...mesesSeleccionados,
                              [id]: e.target.checked,
                            })
                          }
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: theme.colors.textMain }}>
                            Período: {c.periodo || "-"}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                            {c.detalle} | Cuota: {parseFloat(c.saldo_capital_pendiente || 0).toFixed(2)} Bs | Mora: {parseFloat(c.monto_mora_acumulada || 0).toFixed(2)} Bs
                          </div>
                        </div>
                      </label>
                      <div style={{ fontWeight: 800, color: theme.colors.warning, fontSize: "1rem" }}>
                        {(isNaN(subtotal) ? 0 : subtotal).toFixed(2)} Bs
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.85rem 1rem",
                background: "rgba(14, 165, 233, 0.1)",
                borderRadius: theme.radius.md,
                marginBottom: "1rem",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Total a Cobrar:</span>
              <span style={{ fontWeight: 800, fontSize: "1.3rem", color: theme.colors.primary }}>
                {calcularTotalACobrar().toFixed(2)} Bs
              </span>
            </div>

            {/* Recibo emitido listo para imprimir */}
            {reciboEmitido && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: `1px solid ${theme.colors.success}`,
                  borderRadius: theme.radius.md,
                  padding: "1rem",
                  marginBottom: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong style={{ color: theme.colors.success, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <CheckCircle2 size={16} /> Recibo N° {String(reciboEmitido.id_ingreso).padStart(5, "0")} Emitido
                  </strong>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: theme.colors.textMuted }}>
                    Pago registrado correctamente en el libro de caja
                  </p>
                </div>
                <PDFDownloadLink
                  document={<ReciboPagoPDF ingreso={reciboEmitido} />}
                  fileName={`recibo_serenaje_${reciboEmitido.id_ingreso}.pdf`}
                  style={{ textDecoration: "none" }}
                >
                  {({ loading: pdfLoading }) => (
                    <ActionButton $variant="success">
                      <Printer size={16} /> {pdfLoading ? "Preparando..." : "Descargar Recibo Oficial (PDF)"}
                    </ActionButton>
                  )}
                </PDFDownloadLink>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
              <button
                type="button"
                style={{
                  background: "none",
                  border: `1px solid ${theme.colors.border}`,
                  color: theme.colors.textMuted,
                  padding: "0.6rem 1.2rem",
                  borderRadius: theme.radius.md,
                  cursor: "pointer",
                }}
                onClick={() => setModalCobro(false)}
              >
                Cerrar
              </button>
              <CreateButton
                onClick={handleCobrarSerenaje}
                disabled={guardandoCobro || calcularTotalACobrar() === 0}
              >
                <DollarSign size={16} /> {guardandoCobro ? "Procesando..." : "Confirmar Cobro y Emitir Recibo"}
              </CreateButton>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}

export default SerenajePage;
