import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { PDFDownloadLink } from "@react-pdf/renderer";
import Sidebar from "../components/Sidebar";
import useAuth from "../hooks/authHooks";
import useDebounce from "../hooks/useDebounce";
import toastOptions from "../utils/toastOptions";
import theme from "../styles/theme";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import ReciboPagoPDF from "../components/ReciboPagoPDF";
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
  ingresosRoute,
  ingresoDirectoRoute,
  cargosResumenSociosRoute,
} from "../utils/APIroutes";
import { formatDateTime, formatDate } from "../utils/dateUtils";

// ─── Estilos Personalizados ──────────────────────────────────────────────────

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
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
    font-size: 1.7rem;
    font-weight: 800;
  }
  p.hint {
    font-size: 0.75rem;
    color: ${theme.colors.textDim};
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

  option {
    background-color: ${theme.colors.bgCard};
  }
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

const Textarea = styled.textarea`
  padding: 0.75rem 1rem;
  background-color: ${theme.colors.bgInput};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  font-size: 0.875rem;
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
  resize: vertical;
  min-height: 65px;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
`;

const CalculatorBox = styled.div`
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.12) 100%);
  border: 1px dashed #f59e0b;
  border-radius: ${theme.radius.md};
  padding: 0.875rem 1rem;
  margin-bottom: 1rem;

  .calc-title {
    font-size: 0.8rem;
    font-weight: 700;
    color: #f59e0b;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .calc-result {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(245, 158, 11, 0.2);

    span {
      font-size: 0.8rem;
      color: ${theme.colors.textMuted};
    }

    strong {
      font-size: 1.2rem;
      color: #f59e0b;
      font-weight: 800;
    }
  }
`;

const estadoInicialDirecto = {
  tipo_origen: "traspaso",
  concepto: "Traspaso de Caseta (10% de venta)",
  valor_venta_caseta: "",
  porcentaje_traspaso: 10,
  monto: "",
  pagador: "",
  id_socio: "",
  fecha_pago: new Date().toISOString().split("T")[0],
  detalle: "Pago del 10% reglamentario por transferencia/venta de caseta según estatutos de la asociación.",
  nuevo_socio_nombres: "",
  nuevo_socio_apellidos: "",
  nuevo_socio_ci: "",
  nuevo_socio_telefono: "",
  nuevo_socio_domicilio: "",
};

function IngresosPage() {
  const { auth } = useAuth();

  const [ingresos, setIngresos] = useState([]);
  const [socios, setSocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  // Modo Tostadora: debounce de 300ms para evitar saturación de CPU al escribir
  const debouncedBusqueda = useDebounce(busqueda, 300);
  const [filtroTipo, setFiltroTipo] = useState("todos"); // "todos" | "traspaso" | "afiliacion" | "alquiler" | "directo" | "cargos"
  const [filtroEstado, setFiltroEstado] = useState("todos"); // "todos" | "Valido" | "Anulado"

  // Modales
  const [modalDirectoAbierto, setModalDirectoAbierto] = useState(false);
  const [guardandoDirecto, setGuardandoDirecto] = useState(false);
  const [formDirecto, setFormDirecto] = useState(estadoInicialDirecto);

  const [reciboGenerado, setReciboGenerado] = useState(null);
  const [modalReciboExito, setModalReciboExito] = useState(false);

  // Modal de confirmación para anulación
  const [confirmModalData, setConfirmModalData] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirmar",
    requireReason: false,
    reasonPlaceholder: "",
    onConfirm: null,
    loading: false,
  });

  // Cargar datos
  const fetchDatos = async () => {
    try {
      setLoading(true);
      const [resIngresos, resSocios] = await Promise.all([
        axios.get(ingresosRoute, auth.config),
        axios.get(cargosResumenSociosRoute, auth.config),
      ]);

      const listaIngresos = Array.isArray(resIngresos.data)
        ? resIngresos.data
        : resIngresos.data.ingresos || [];
      const listaSocios = resSocios.data.resumen || [];

      setIngresos(listaIngresos);
      setSocios(listaSocios);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar los registros de ingresos", toastOptions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.config) fetchDatos();
  }, [auth]);

  // Métricas
  const metricas = useMemo(() => {
    let totalGeneral = 0;
    let totalTraspasos = 0;
    let cantidadTraspasos = 0;
    let totalAfiliaciones = 0;
    let cantidadAfiliaciones = 0;
    let totalOtros = 0;

    ingresos.forEach((item) => {
      if (item.estado === "Valido") {
        const m = parseFloat(item.monto_total_recibido || 0);
        totalGeneral += m;

        const origen = (item.tipo_origen || "").toLowerCase();
        const concepto = (item.concepto || "").toLowerCase();

        if (origen === "traspaso" || concepto.includes("traspaso")) {
          totalTraspasos += m;
          cantidadTraspasos++;
        } else if (origen === "afiliacion" || concepto.includes("afilia")) {
          totalAfiliaciones += m;
          cantidadAfiliaciones++;
        } else if (origen !== "cargos") {
          totalOtros += m;
        }
      }
    });

    return {
      totalGeneral,
      totalTraspasos,
      cantidadTraspasos,
      totalAfiliaciones,
      cantidadAfiliaciones,
      totalOtros,
    };
  }, [ingresos]);

  // Manejo de formulario de ingreso directo
  const handleAbrirModalDirecto = () => {
    setFormDirecto({
      ...estadoInicialDirecto,
      fecha_pago: new Date().toISOString().split("T")[0],
    });
    setModalDirectoAbierto(true);
  };

  const handleDirectoChange = (campo, valor) => {
    setFormDirecto((prev) => {
      const nuevo = { ...prev, [campo]: valor };

      if (campo === "tipo_origen") {
        if (valor === "traspaso") {
          nuevo.concepto = "Traspaso de Caseta (10% de venta)";
          nuevo.porcentaje_traspaso = 10;
          if (nuevo.valor_venta_caseta && !isNaN(parseFloat(nuevo.valor_venta_caseta))) {
            nuevo.monto = ((parseFloat(nuevo.valor_venta_caseta) * 10) / 100).toFixed(2);
          }
          nuevo.detalle = "Pago del 10% reglamentario por transferencia/venta de caseta según estatutos de la asociación.";
        } else if (valor === "afiliacion") {
          nuevo.concepto = "Cuota de Afiliación / Nuevo Socio";
          nuevo.valor_venta_caseta = "";
          nuevo.porcentaje_traspaso = "";
          nuevo.monto = "1000.00";
          nuevo.detalle = "Cobro de cuota de afiliación (Bs. 1000) e ingreso formal de nuevo socio a la asociación.";
        } else if (valor === "alquiler") {
          nuevo.concepto = "Alquiler de Espacio Común / Depósito";
          nuevo.valor_venta_caseta = "";
          nuevo.porcentaje_traspaso = "";
          nuevo.detalle = "Cobro por arrendamiento temporal de espacio o infraestructura común del mercado.";
        } else {
          nuevo.concepto = "Ingreso Directo Extraordinario";
          nuevo.valor_venta_caseta = "";
          nuevo.porcentaje_traspaso = "";
          nuevo.detalle = "";
        }
      }

      if (campo === "valor_venta_caseta" || campo === "porcentaje_traspaso") {
        const venta = parseFloat(campo === "valor_venta_caseta" ? valor : nuevo.valor_venta_caseta) || 0;
        const pct = parseFloat(campo === "porcentaje_traspaso" ? valor : nuevo.porcentaje_traspaso) || 0;
        if (venta > 0 && pct > 0) {
          nuevo.monto = ((venta * pct) / 100).toFixed(2);
        }
      }

      if (campo === "id_socio") {
        if (valor) {
          const s = socios.find((soc) => String(soc.id_socio) === String(valor));
          if (s) {
            const p = s.persona || {};
            const nombre = `${p.nombres || ""} ${p.apellidos || ""}`.trim();
            if (!prev.pagador || prev.pagador.includes("Caseta #") || prev.pagador.includes("Nuevo Socio")) {
              nuevo.pagador = nuevo.nuevo_socio_nombres
                ? `${nuevo.nuevo_socio_nombres} ${nuevo.nuevo_socio_apellidos || ""}`.trim()
                : `${nombre} (Caseta #${s.nro_caseta})`;
            }
          }
        }
      }

      if (campo === "nuevo_socio_nombres" || campo === "nuevo_socio_apellidos") {
        const nom = campo === "nuevo_socio_nombres" ? valor : nuevo.nuevo_socio_nombres;
        const ape = campo === "nuevo_socio_apellidos" ? valor : nuevo.nuevo_socio_apellidos;
        if (nom || ape) {
          nuevo.pagador = `${nom} ${ape}`.trim();
        }
      }

      return nuevo;
    });
  };

  const handleSubmitDirecto = async (e) => {
    e.preventDefault();
    const montoNum = parseFloat(formDirecto.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.warning("Ingrese un monto válido mayor a 0", toastOptions);
      return;
    }
    if (!formDirecto.concepto.trim()) {
      toast.warning("El concepto del ingreso es obligatorio", toastOptions);
      return;
    }

    try {
      setGuardandoDirecto(true);
      const payload = {
        id_socio: formDirecto.id_socio ? Number(formDirecto.id_socio) : null,
        monto: montoNum,
        concepto: formDirecto.concepto.trim(),
        detalle: formDirecto.detalle.trim() || undefined,
        pagador: formDirecto.pagador.trim() || undefined,
        fecha_pago: formDirecto.fecha_pago || undefined,
        tipo_origen: formDirecto.tipo_origen,
        porcentaje_traspaso:
          formDirecto.tipo_origen === "traspaso" && formDirecto.porcentaje_traspaso
            ? parseFloat(formDirecto.porcentaje_traspaso)
            : undefined,
        valor_venta_caseta:
          formDirecto.tipo_origen === "traspaso" && formDirecto.valor_venta_caseta
            ? parseFloat(formDirecto.valor_venta_caseta)
            : undefined,
        nuevo_socio_nombres: formDirecto.nuevo_socio_nombres?.trim() || undefined,
        nuevo_socio_apellidos: formDirecto.nuevo_socio_apellidos?.trim() || undefined,
        nuevo_socio_ci: formDirecto.nuevo_socio_ci?.trim() || undefined,
        nuevo_socio_telefono: formDirecto.nuevo_socio_telefono?.trim() || undefined,
        nuevo_socio_domicilio: formDirecto.nuevo_socio_domicilio?.trim() || undefined,
      };

      const { data } = await axios.post(ingresoDirectoRoute, payload, auth.config);
      toast.success("¡Ingreso registrado con éxito y recibo emitido!", toastOptions);

      setModalDirectoAbierto(false);
      setReciboGenerado(data.ingreso);
      setModalReciboExito(true);

      fetchDatos();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al registrar ingreso", toastOptions);
    } finally {
      setGuardandoDirecto(false);
    }
  };

  // Anulación de Recibo con Modal Moderno (sin prompt nativo del navegador)
  const handleAnularRecibo = (recibo) => {
    setConfirmModalData({
      isOpen: true,
      title: `Anular Recibo #${recibo.nro_recibo || recibo.id_ingreso}`,
      message: `¿Está seguro de anular el recibo oficial #${recibo.nro_recibo || recibo.id_ingreso} por un monto de Bs. ${parseFloat(recibo.monto_total_recibido || 0).toFixed(2)} emitido a nombre de ${recibo.pagador}?`,
      confirmText: "Sí, Anular Recibo",
      requireReason: true,
      reasonPlaceholder: "Ingrese el motivo de la anulación (ej. Error en monto / Recibo duplicado)...",
      onConfirm: async (motivo) => {
        try {
          setConfirmModalData((prev) => ({ ...prev, loading: true }));
          await axios.post(
            `${ingresosRoute}/${recibo.id_ingreso}/anular`,
            { observacion: motivo },
            auth.config
          );
          toast.success("Recibo anulado con éxito en el libro de ingresos", toastOptions);
          setConfirmModalData({ isOpen: false });
          fetchDatos();
        } catch (err) {
          toast.error(err.response?.data?.mensaje || "Error al anular recibo", toastOptions);
          setConfirmModalData((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  // Filtrado de la tabla memoizado con debounce
  const ingresosFiltrados = useMemo(() => {
    const q = debouncedBusqueda.toLowerCase().trim();
    return ingresos.filter((item) => {
      // Filtro tipo
      if (filtroTipo !== "todos") {
        const origen = (item.tipo_origen || "").toLowerCase();
        const concepto = (item.concepto || "").toLowerCase();
        if (filtroTipo === "traspaso" && !(origen === "traspaso" || concepto.includes("traspaso"))) return false;
        if (filtroTipo === "afiliacion" && !(origen === "afiliacion" || concepto.includes("afilia"))) return false;
        if (filtroTipo === "alquiler" && !(origen === "alquiler" || concepto.includes("alquiler"))) return false;
        if (filtroTipo === "directo" && !(origen === "directo" || (!["traspaso", "afiliacion", "alquiler", "cargos"].includes(origen)))) return false;
        if (filtroTipo === "cargos" && origen !== "cargos") return false;
      }

      // Filtro estado
      if (filtroEstado !== "todos" && item.estado !== filtroEstado) return false;

      // Filtro búsqueda de texto
      if (!q) return true;
      const id = String(item.id_ingreso || "");
      const nro = String(item.nro_recibo || "");
      const pagador = String(item.pagador || "").toLowerCase();
      const concepto = String(item.concepto || item.observacion || "").toLowerCase();
      const s = item.socio || item.Socio || {};
      const caseta = String(s.nro_caseta || "").toLowerCase();
      const p = s.persona || s.Persona || {};
      const nombres = `${p.nombres || ""} ${p.apellidos || ""}`.toLowerCase();

      return (
        id.includes(q) ||
        nro.includes(q) ||
        pagador.includes(q) ||
        concepto.includes(q) ||
        caseta.includes(q) ||
        nombres.includes(q)
      );
    });
  }, [ingresos, debouncedBusqueda, filtroTipo, filtroEstado]);

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        {/* Cabecera Principal */}
        <SectionHeader>
          <div className="titles">
            <h1>Ingresos y Recaudaciones de la Asociación</h1>
            <p>
              Entradas de dinero: <strong>Traspaso de casetas (10%)</strong>, <strong>Cuotas de afiliación</strong>, alquileres e ingresos directos
            </p>
          </div>
          <div className="actions" style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <Link to="/caja" style={{ textDecoration: "none" }}>
              <ActionButton
                type="button"
                $variant="outline"
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <span>💳</span>
                <span>Ir a Caja de Socios (Luz / Serenaje / Multas)</span>
              </ActionButton>
            </Link>
            <CreateButton
              onClick={handleAbrirModalDirecto}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
                whiteSpace: "nowrap",
                padding: "0.6rem 1.15rem",
              }}
            >
              <span>💰</span>
              <span>+ Registrar Nuevo Ingreso (Traspaso 10% / Afiliación)</span>
            </CreateButton>
          </div>
        </SectionHeader>

        {/* Métricas Globales */}
        <MetricGrid>
          <MetricCard>
            <span className="label">Total Recaudado en Ingresos</span>
            <h2 style={{ color: theme.colors.success }}>
              {metricas.totalGeneral.toFixed(2)} Bs
            </h2>
            <p className="hint">{ingresos.filter((i) => i.estado === "Valido").length} recibo(s) válidos emitidos</p>
          </MetricCard>

          <MetricCard>
            <span className="label">Comisiones Traspaso Caseta (10%)</span>
            <h2 style={{ color: "#f59e0b" }}>
              {metricas.totalTraspasos.toFixed(2)} Bs
            </h2>
            <p className="hint">{metricas.cantidadTraspasos} traspaso(s) formalizado(s)</p>
          </MetricCard>

          <MetricCard>
            <span className="label">Cuotas de Afiliación (Nuevos Socios)</span>
            <h2 style={{ color: "#10b981" }}>
              {metricas.totalAfiliaciones.toFixed(2)} Bs
            </h2>
            <p className="hint">{metricas.cantidadAfiliaciones} afiliación(es) registrada(s)</p>
          </MetricCard>

          <MetricCard>
            <span className="label">Otros Ingresos y Alquileres</span>
            <h2 style={{ color: "#38bdf8" }}>
              {metricas.totalOtros.toFixed(2)} Bs
            </h2>
            <p className="hint">Espacios comunes, depósitos y extraordinarios</p>
          </MetricCard>
        </MetricGrid>

        {/* Tabla de Ingresos */}
        <TableCard>
          <TableToolbar>
            <div style={{ display: "flex", gap: "0.75rem", flex: 1, flexWrap: "wrap", alignItems: "center" }}>
              <SearchInput
                placeholder="Buscar por N° Recibo, pagador, caseta o concepto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ minWidth: "280px" }}
              />
              <Select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                style={{ width: "auto" }}
              >
                <option value="todos">Todos los Tipos de Ingreso</option>
                <option value="traspaso">🏷️ Solo Traspasos de Caseta (10%)</option>
                <option value="afiliacion">🤝 Solo Cuotas de Afiliación</option>
                <option value="alquiler">🏢 Solo Alquileres</option>
                <option value="directo">⚡ Solo Extraordinarios / Directos</option>
                <option value="cargos">🧾 Cuotas Regulares (Luz/Serenaje/Multas)</option>
              </Select>
              <Select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                style={{ width: "auto" }}
              >
                <option value="todos">Todos los Estados</option>
                <option value="Valido">Solo Válidos</option>
                <option value="Anulado">Solo Anulados</option>
              </Select>
            </div>
            <span style={{ color: theme.colors.textMuted, fontSize: "0.875rem" }}>
              {ingresosFiltrados.length} recibo(s)
            </span>
          </TableToolbar>

          <TableResponsiveWrapper>
            <TableWrapper>
              <TableHead>
                <tr>
                  <th>N° Recibo</th>
                  <th>Fecha y Hora</th>
                  <th>Concepto / Tipo</th>
                  <th>Pagador / Beneficiario</th>
                  <th>Cajero (Operador)</th>
                  <th>Monto Recibido</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                      Cargando libro de ingresos...
                    </TableCell>
                  </TableRow>
                ) : ingresosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                      No se encontraron ingresos registrados con los filtros seleccionados
                    </TableCell>
                  </TableRow>
                ) : (
                  ingresosFiltrados.map((item) => {
                    const socio = item.socio || item.Socio || {};
                    const persona = socio.persona || socio.Persona || {};
                    const cajero = item.cajero || item.Usuario || {};
                    const cajeroNombre =
                      typeof cajero === "object" ? cajero.username || "Cajero" : String(cajero);

                    return (
                      <TableRow key={item.id_ingreso}>
                        <TableCell>
                          <strong>#{String(item.nro_recibo || item.id_ingreso).padStart(5, "0")}</strong>
                          {item.tipo_origen === "traspaso" && (
                            <div style={{ marginTop: "0.2rem" }}>
                              <span style={{ fontSize: "0.68rem", backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "1px 5px", borderRadius: "4px", fontWeight: 700 }}>
                                🏷️ Traspaso 10%
                              </span>
                            </div>
                          )}
                          {item.tipo_origen === "afiliacion" && (
                            <div style={{ marginTop: "0.2rem" }}>
                              <span style={{ fontSize: "0.68rem", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "1px 5px", borderRadius: "4px", fontWeight: 700 }}>
                                🤝 Afiliación
                              </span>
                            </div>
                          )}
                          {item.tipo_origen === "alquiler" && (
                            <div style={{ marginTop: "0.2rem" }}>
                              <span style={{ fontSize: "0.68rem", backgroundColor: "rgba(14, 165, 233, 0.15)", color: "#0ea5e9", border: "1px solid rgba(14, 165, 233, 0.3)", padding: "1px 5px", borderRadius: "4px", fontWeight: 700 }}>
                                🏢 Alquiler
                              </span>
                            </div>
                          )}
                          {item.tipo_origen === "directo" && (
                            <div style={{ marginTop: "0.2rem" }}>
                              <span style={{ fontSize: "0.68rem", backgroundColor: "rgba(168, 85, 247, 0.15)", color: "#a855f7", border: "1px solid rgba(168, 85, 247, 0.3)", padding: "1px 5px", borderRadius: "4px", fontWeight: 700 }}>
                                ⚡ Ingreso Directo
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{formatDateTime(item.fecha_pago)}</TableCell>
                        <TableCell>
                          <strong>{item.concepto || item.observacion || "Ingreso de Caja"}</strong>
                          {item.observacion && item.observacion !== item.concepto && (
                            <div style={{ fontSize: "0.72rem", color: theme.colors.textMuted, marginTop: "0.15rem" }}>
                              {item.observacion}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {socio.nro_caseta ? (
                            <strong>Caseta #{socio.nro_caseta}</strong>
                          ) : (
                            <span style={{ color: "#38bdf8", fontWeight: 700, fontSize: "0.82rem" }}>
                              🌐 Ingreso Directo / Externo
                            </span>
                          )}
                          <div style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                            {item.pagador || (persona.nombres ? `${persona.nombres} ${persona.apellidos || ""}`.trim() : "Público General")}
                          </div>
                        </TableCell>
                        <TableCell>{cajeroNombre}</TableCell>
                        <TableCell style={{ fontWeight: 800, color: theme.colors.success, fontSize: "0.95rem" }}>
                          {parseFloat(item.monto_total_recibido).toFixed(2)} Bs
                        </TableCell>
                        <TableCell>
                          <StatusBadge $status={item.estado}>{item.estado}</StatusBadge>
                        </TableCell>
                        <TableCell>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            <PDFDownloadLink
                              document={<ReciboPagoPDF ingreso={item} />}
                              fileName={`recibo_${String(item.nro_recibo || item.id_ingreso).padStart(5, "0")}.pdf`}
                              style={{ textDecoration: "none" }}
                            >
                              {({ loading: pdfLoading }) => (
                                <ViewButton as="span">
                                  {pdfLoading ? "Generando..." : "🖨️ PDF"}
                                </ViewButton>
                              )}
                            </PDFDownloadLink>
                            {item.estado === "Valido" && (
                              <DeleteButton onClick={() => handleAnularRecibo(item)}>
                                Anular
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

      {/* ─── MODAL: REGISTRAR INGRESO DIRECTO ─── */}
      <Modal
        isOpen={modalDirectoAbierto}
        onClose={() => setModalDirectoAbierto(false)}
        title="Registrar Nuevo Ingreso en Caja (Traspaso 10% / Afiliación / Extraordinario)"
        maxWidth="640px"
      >
        <form onSubmit={handleSubmitDirecto}>
          <FormGroup>
            <Label>Tipo de Ingreso</Label>
            <Select
              value={formDirecto.tipo_origen}
              onChange={(e) => handleDirectoChange("tipo_origen", e.target.value)}
            >
              <option value="traspaso">🏷️ Traspaso de Caseta (Cobro del 10% del valor de venta)</option>
              <option value="afiliacion">🤝 Cuota de Afiliación / Nuevo Socio</option>
              <option value="alquiler">🏢 Alquiler de Espacio Común / Depósito / Baños</option>
              <option value="directo">⚡ Otro Ingreso Directo / Extraordinario</option>
            </Select>
          </FormGroup>

          {/* Calculadora en vivo del 10% para traspaso de caseta */}
          {formDirecto.tipo_origen === "traspaso" && (
            <CalculatorBox>
              <div className="calc-title">
                <span>🧮</span>
                <span>Calculadora de Traspaso de Caseta (10% de Ley)</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <Label style={{ color: "#d97706" }}>Valor Venta Caseta (Bs.)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej. 50000"
                    value={formDirecto.valor_venta_caseta}
                    onChange={(e) => handleDirectoChange("valor_venta_caseta", e.target.value)}
                    style={{ borderColor: "#f59e0b" }}
                    autoFocus
                  />
                </div>
                <div>
                  <Label style={{ color: "#d97706" }}>% Retención / Traspaso</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="100"
                    value={formDirecto.porcentaje_traspaso}
                    onChange={(e) => handleDirectoChange("porcentaje_traspaso", e.target.value)}
                    style={{ borderColor: "#f59e0b" }}
                  />
                </div>
              </div>
              <div className="calc-result">
                <span>Comisión para el Mercado:</span>
                <strong>
                  {formDirecto.monto ? `${parseFloat(formDirecto.monto).toFixed(2)} Bs` : "0.00 Bs"}
                </strong>
              </div>
            </CalculatorBox>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem" }}>
            <FormGroup>
              <Label>Nombre del Concepto / Glosa Oficial *</Label>
              <Input
                type="text"
                required
                value={formDirecto.concepto}
                onChange={(e) => handleDirectoChange("concepto", e.target.value)}
                placeholder="Ej. Traspaso de Caseta (10%), Cuota de Afiliación..."
              />
            </FormGroup>

            <FormGroup>
              <Label>Monto a Cobrar (Bs.) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formDirecto.monto}
                onChange={(e) => handleDirectoChange("monto", e.target.value)}
                placeholder="0.00"
                style={{ fontWeight: 800, fontSize: "1rem", color: theme.colors.success }}
              />
            </FormGroup>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <FormGroup>
              <Label>Caseta / Socio Saliente (A Traspasar) *</Label>
              <Select
                value={formDirecto.id_socio}
                onChange={(e) => handleDirectoChange("id_socio", e.target.value)}
                required={formDirecto.tipo_origen === "traspaso" || formDirecto.tipo_origen === "afiliacion"}
              >
                <option value="">-- Seleccionar caseta a traspasar --</option>
                {socios.map((s) => {
                  const p = s.persona || {};
                  return (
                    <option key={s.id_socio} value={s.id_socio}>
                      Caseta #{s.nro_caseta} - {p.nombres || ""} {p.apellidos || ""}
                    </option>
                  );
                })}
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>Nombre en el Recibo (Pagador) *</Label>
              <Input
                type="text"
                required
                value={formDirecto.pagador}
                onChange={(e) => handleDirectoChange("pagador", e.target.value)}
                placeholder="Ej. Juan Pérez (Nuevo Adquiriente)"
              />
            </FormGroup>
          </div>

          {/* Formulario del nuevo socio adquirente para traspaso y afiliación */}
          {(formDirecto.tipo_origen === "traspaso" || formDirecto.tipo_origen === "afiliacion") && (
            <div
              style={{
                backgroundColor: "rgba(14, 165, 233, 0.08)",
                border: `1px solid ${theme.colors.primaryLight}`,
                borderRadius: theme.radius.md,
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                  color: theme.colors.primary,
                  fontWeight: 700,
                  fontSize: "0.875rem",
                }}
              >
                <span>🤝</span>
                <span>Datos del Nuevo Socio Ingresante (Traspaso y Afiliación)</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: theme.colors.textMuted, marginBottom: "0.75rem", lineHeight: 1.4 }}>
                ℹ️ Al emitir este recibo de <strong>afiliación / traspaso</strong>, el socio anterior de la caseta seleccionada quedará automáticamente en estado <strong>Inactivo</strong> con baja lógica, asignándose la titularidad de la caseta al nuevo socio.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <FormGroup>
                  <Label>Nombres del Nuevo Socio *</Label>
                  <Input
                    type="text"
                    value={formDirecto.nuevo_socio_nombres}
                    onChange={(e) => handleDirectoChange("nuevo_socio_nombres", e.target.value)}
                    placeholder="Ej. Roberto Carlos"
                    required={formDirecto.tipo_origen === "afiliacion"}
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Apellidos del Nuevo Socio *</Label>
                  <Input
                    type="text"
                    value={formDirecto.nuevo_socio_apellidos}
                    onChange={(e) => handleDirectoChange("nuevo_socio_apellidos", e.target.value)}
                    placeholder="Ej. Mamani Quispe"
                    required={formDirecto.tipo_origen === "afiliacion"}
                  />
                </FormGroup>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginTop: "0.5rem" }}>
                <FormGroup>
                  <Label>Carnet de Identidad (CI) *</Label>
                  <Input
                    type="text"
                    value={formDirecto.nuevo_socio_ci}
                    onChange={(e) => handleDirectoChange("nuevo_socio_ci", e.target.value)}
                    placeholder="Ej. 7894561 SC"
                    required={formDirecto.tipo_origen === "afiliacion"}
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Teléfono / Celular</Label>
                  <Input
                    type="text"
                    value={formDirecto.nuevo_socio_telefono}
                    onChange={(e) => handleDirectoChange("nuevo_socio_telefono", e.target.value)}
                    placeholder="Ej. 70012345"
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Domicilio / Dirección</Label>
                  <Input
                    type="text"
                    value={formDirecto.nuevo_socio_domicilio}
                    onChange={(e) => handleDirectoChange("nuevo_socio_domicilio", e.target.value)}
                    placeholder="Ej. Barrio Los Olivos #120"
                  />
                </FormGroup>
              </div>
            </div>
          )}

          <FormGroup>
            <Label>Fecha de Pago / Emisión</Label>
            <Input
              type="date"
              value={formDirecto.fecha_pago}
              onChange={(e) => handleDirectoChange("fecha_pago", e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <Label>Detalle / Glosa / Observación</Label>
            <Textarea
              rows={2}
              value={formDirecto.detalle}
              onChange={(e) => handleDirectoChange("detalle", e.target.value)}
              placeholder="Detalles sobre la venta, caseta transferida o cuota de nuevo socio..."
            />
          </FormGroup>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <ActionButton
              type="button"
              $variant="outline"
              onClick={() => setModalDirectoAbierto(false)}
            >
              Cancelar
            </ActionButton>
            <CreateButton
              type="submit"
              disabled={guardandoDirecto || !formDirecto.monto || parseFloat(formDirecto.monto) <= 0}
              style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}
            >
              {guardandoDirecto ? "Registrando..." : `💰 Registrar Ingreso (${parseFloat(formDirecto.monto || 0).toFixed(2)} Bs)`}
            </CreateButton>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: CONFIRMACIÓN Y DESCARGA INMEDIATA ─── */}
      <Modal
        isOpen={modalReciboExito}
        onClose={() => setModalReciboExito(false)}
        title="¡Ingreso Registrado Exitosamente!"
        maxWidth="500px"
      >
        {reciboGenerado && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎉</div>
            <h3 style={{ fontSize: "1.3rem", color: theme.colors.textMain }}>
              Recibo Oficial #{String(reciboGenerado.nro_recibo || reciboGenerado.id_ingreso).padStart(5, "0")}
            </h3>
            <p style={{ color: theme.colors.textMuted, fontSize: "0.9rem", margin: "0.5rem 0 1.25rem" }}>
              Total Cobrado:{" "}
              <strong style={{ color: theme.colors.success, fontSize: "1.2rem" }}>
                {parseFloat(reciboGenerado.monto_total_recibido).toFixed(2)} Bs
              </strong>
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
              <PDFDownloadLink
                document={<ReciboPagoPDF ingreso={reciboGenerado} />}
                fileName={`recibo_${String(reciboGenerado.nro_recibo || reciboGenerado.id_ingreso).padStart(5, "0")}.pdf`}
                style={{ textDecoration: "none" }}
              >
                {({ loading: pdfLoading }) => (
                  <CreateButton as="span" style={{ cursor: "pointer", display: "inline-block" }}>
                    {pdfLoading ? "Generando PDF..." : "🖨️ Descargar Recibo Oficial en PDF"}
                  </CreateButton>
                )}
              </PDFDownloadLink>
              <ActionButton $variant="outline" onClick={() => setModalReciboExito(false)}>
                Cerrar
              </ActionButton>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL DE CONFIRMACIÓN / ANULACIÓN MODERNO ─── */}
      <ConfirmModal
        isOpen={confirmModalData.isOpen}
        title={confirmModalData.title}
        message={confirmModalData.message}
        confirmText={confirmModalData.confirmText}
        cancelText="Volver"
        requireReason={confirmModalData.requireReason}
        reasonPlaceholder={confirmModalData.reasonPlaceholder}
        onConfirm={confirmModalData.onConfirm}
        onClose={() => setConfirmModalData({ isOpen: false })}
        loading={confirmModalData.loading}
        danger={true}
      />
    </PageContainer>
  );
}

export default IngresosPage;
