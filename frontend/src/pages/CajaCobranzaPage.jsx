import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import { PDFDownloadLink } from "@react-pdf/renderer";
import {
  CreditCard,
  Receipt,
  Tag,
  CheckCircle2,
  Building,
  Zap,
  Globe,
  FileText,
  Printer,
  Calculator,
  Check,
  X,
  ShieldCheck,
  AlertTriangle,
  Hammer,
  Pin,
  Plus,
  CheckCircle,
  Info,
  UserCheck,
  DollarSign,
} from "lucide-react";
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
  CreateButton,
  ViewButton,
  DeleteButton,
  ActionButton,
  SearchInput,
  StatusBadge,
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

const ViewToggleBar = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const TabBtn = styled.button`
  padding: 0.6rem 1.25rem;
  border-radius: ${theme.radius.md};
  border: 1px solid ${({ $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ $active }) => ($active ? theme.colors.primaryLight : "transparent")};
  color: ${({ $active }) => ($active ? theme.colors.primary : theme.colors.textMuted)};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    color: ${theme.colors.textMain};
    background-color: rgba(255, 255, 255, 0.05);
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

  option {
    background-color: ${theme.colors.bgCard};
  }
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
    box-shadow: 0 0 0 2px ${({ $hasError }) => ($hasError ? "rgba(239, 68, 68, 0.2)" : "rgba(14, 165, 233, 0.2)")};
  }
`;

const ErrorText = styled.span`
  color: ${theme.colors.danger};
  font-size: 0.75rem;
  font-weight: 500;
  margin-top: 0.15rem;
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
      font-size: 1.15rem;
      color: #f59e0b;
      font-weight: 800;
    }
  }
`;

const CategoryGroupCard = styled.div`
  background-color: ${theme.colors.bgInput};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  padding: 0.875rem;
  margin-bottom: 0.875rem;

  .cat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    padding-bottom: 0.35rem;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.1);

    strong {
      font-size: 0.85rem;
      color: ${theme.colors.textMain};
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    span.subtotal {
      font-size: 0.85rem;
      font-weight: 700;
      color: ${theme.colors.warning};
    }
  }
`;

const DebtItemRow = styled.label`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.6rem;
  border-radius: ${theme.radius.sm};
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.04);
  }

  .left {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex: 1;

    .desc {
      font-size: 0.825rem;
      font-weight: 600;
      color: ${theme.colors.textMain};
    }
    .meta {
      font-size: 0.725rem;
      color: ${theme.colors.textMuted};
    }
  }

  .right {
    text-align: right;
    .amount {
      font-weight: 700;
      font-size: 0.85rem;
      color: ${theme.colors.textMain};
    }
    .mora {
      font-size: 0.7rem;
      color: ${theme.colors.danger};
    }
  }
`;

const PaymentSummaryBox = styled.div`
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%);
  border: 1px solid ${theme.colors.primaryLight};
  border-radius: ${theme.radius.md};
  padding: 1rem 1.25rem;
  margin: 1rem 0;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .info {
    span {
      font-size: 0.75rem;
      color: ${theme.colors.textMuted};
      display: block;
      text-transform: uppercase;
      font-weight: 600;
    }
    strong {
      font-size: 0.95rem;
      color: ${theme.colors.textMain};
    }
  }

  .total-badge {
    text-align: right;
    span {
      font-size: 0.75rem;
      color: ${theme.colors.textMuted};
      text-transform: uppercase;
      display: block;
    }
    h2 {
      font-size: 1.6rem;
      color: ${theme.colors.success};
      font-weight: 800;
      line-height: 1;
      margin-top: 0.2rem;
    }
  }
`;

const confirmModalInitial = {
  isOpen: false,
  title: "",
  message: "",
  confirmText: "Confirmar",
  requireReason: false,
  reasonPlaceholder: "",
  onConfirm: null,
  loading: false,
};

function CajaCobranzaPage() {
  const { auth } = useAuth();

  // Estados principales
  const [vistaActiva, setVistaActiva] = useState("deudas");
  const [resumenSocios, setResumenSocios] = useState([]);
  const [recibos, setRecibos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const debouncedBusqueda = useDebounce(busqueda, 300);
  const [filtroDeuda, setFiltroDeuda] = useState("todas");

  // Estados de Modales
  const [modalCobroAbierto, setModalCobroAbierto] = useState(false);
  const [socioCobro, setSocioCobro] = useState(null);
  const [itemsSeleccionados, setItemsSeleccionados] = useState({});
  const [observacionCobro, setObservacionCobro] = useState("");
  const [procesandoCobro, setProcesandoCobro] = useState(false);

  // Modal Recibo generado para descargar
  const [reciboGenerado, setReciboGenerado] = useState(null);
  const [modalReciboExito, setModalReciboExito] = useState(false);

  // Modal moderno de confirmación / anulación
  const [confirmModalData, setConfirmModalData] = useState(confirmModalInitial);

  // Estados para Registro de Ingreso Directo
  const [modalDirectoAbierto, setModalDirectoAbierto] = useState(false);
  const [guardandoDirecto, setGuardandoDirecto] = useState(false);
  const [formDirecto, setFormDirecto] = useState({
    tipo_origen: "traspaso",
    concepto: "Traspaso de Caseta (10% de venta)",
    valor_venta_caseta: "",
    porcentaje_traspaso: 10,
    monto: "",
    pagador: "",
    id_socio: "",
    fecha_pago: new Date().toISOString().split("T")[0],
    detalle: "Pago del 10% reglamentario por transferencia/venta de caseta según estatutos de la asociación.",
  });

  // Cargar datos
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resCargos, resIngresos] = await Promise.all([
        axios.get(cargosResumenSociosRoute, auth.config),
        axios.get(ingresosRoute, auth.config),
      ]);

      const listaResumen = resCargos.data?.resumen || [];
      const listaRecibos = Array.isArray(resIngresos.data)
        ? resIngresos.data
        : resIngresos.data?.ingresos || [];

      setResumenSocios(listaResumen);
      setRecibos(listaRecibos);
    } catch (err) {
      toast.error(
        err.response?.data?.mensaje || "Error al cargar datos de cobranza y caja",
        toastOptions
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.config) fetchData();
  }, [auth]);

  // Totales de métricas
  const metricas = useMemo(() => {
    let totalDeudaMercado = 0;
    let totalDeudaLuz = 0;
    let totalDeudaSerenaje = 0;
    let totalDeudaMultas = 0;
    let sociosConDeuda = 0;

    resumenSocios.forEach((s) => {
      const g = parseFloat(s.total_deuda_general || 0);
      if (!isNaN(g)) {
        totalDeudaMercado += g;
        totalDeudaLuz += parseFloat(s.luz?.total || 0);
        totalDeudaSerenaje += parseFloat(s.serenaje?.total || 0);
        totalDeudaMultas += parseFloat(s.multas?.total || 0);
        if (g > 0) sociosConDeuda++;
      }
    });

    const totalRecaudadoValido = recibos
      .filter((r) => r.estado === "Valido")
      .reduce((acc, r) => acc + (parseFloat(r.monto_total_recibido || 0) || 0), 0);

    return {
      totalDeudaMercado,
      totalDeudaLuz,
      totalDeudaSerenaje,
      totalDeudaMultas,
      sociosConDeuda,
      totalRecaudadoValido,
    };
  }, [resumenSocios, recibos]);

  // Filtrado de socios memoizado con debounce
  const sociosFiltrados = useMemo(() => {
    const q = debouncedBusqueda.toLowerCase().trim();
    return resumenSocios.filter((s) => {
      const caseta = String(s.nro_caseta || "").toLowerCase();
      const p = s.persona || {};
      const nombres = `${p.nombres || ""} ${p.apellidos || ""}`.toLowerCase();
      const ci = String(p.ci || "").toLowerCase();

      const coincideTexto = !q || caseta.includes(q) || nombres.includes(q) || ci.includes(q);

      if (!coincideTexto) return false;

      if (filtroDeuda === "con_deuda") return (s.total_deuda_general || 0) > 0;
      if (filtroDeuda === "al_dia") return (s.total_deuda_general || 0) === 0;
      return true;
    });
  }, [resumenSocios, debouncedBusqueda, filtroDeuda]);

  // Filtrado de recibos memoizado con debounce
  const recibosFiltrados = useMemo(() => {
    const q = debouncedBusqueda.toLowerCase().trim();
    return recibos.filter((r) => {
      const id = String(r.id_ingreso || "");
      const nro = String(r.nro_recibo || "");
      const s = r.socio || r.Socio || {};
      const caseta = String(s.nro_caseta || "").toLowerCase();
      const p = s.persona || s.Persona || {};
      const nombres = `${p.nombres || ""} ${p.apellidos || ""}`.toLowerCase();
      const pagador = String(r.pagador || "").toLowerCase();
      const concepto = String(r.concepto || "").toLowerCase();
      const origen = String(r.tipo_origen || "").toLowerCase();

      return (
        !q ||
        id.includes(q) ||
        nro.includes(q) ||
        caseta.includes(q) ||
        nombres.includes(q) ||
        pagador.includes(q) ||
        concepto.includes(q) ||
        origen.includes(q)
      );
    });
  }, [recibos, debouncedBusqueda]);

  // ─── Abrir Modal de Cobro para un Socio ──────────────────────────────────────
  const handleAbrirCobroSocio = (socio) => {
    setSocioCobro(socio);
    const inicial = {};
    (socio.cargos_todos || []).forEach((c) => {
      inicial[c.id_cargo] = true;
    });
    setItemsSeleccionados(inicial);
    setObservacionCobro(`Pago de servicios y cuotas - Caseta #${socio.nro_caseta}`);
    setModalCobroAbierto(true);
  };

  // Cálculo de total a cobrar en modal
  const cobroDetalle = useMemo(() => {
    if (!socioCobro || !socioCobro.cargos_todos) {
      return { total: 0, items: [], totalCapital: 0, totalMora: 0 };
    }

    let total = 0;
    let totalCapital = 0;
    let totalMora = 0;
    const items = [];

    socioCobro.cargos_todos.forEach((c) => {
      if (itemsSeleccionados[c.id_cargo]) {
        const cap = parseFloat(c.saldo_capital_pendiente || 0);
        const mor = parseFloat(c.monto_mora_acumulada || 0);
        totalCapital += isNaN(cap) ? 0 : cap;
        totalMora += isNaN(mor) ? 0 : mor;
        total += (isNaN(cap) ? 0 : cap) + (isNaN(mor) ? 0 : mor);
        items.push({
          id_cargo: c.id_cargo,
          monto_abonado_capital: isNaN(cap) ? 0 : cap,
          monto_abonado_mora: isNaN(mor) ? 0 : mor,
        });
      }
    });

    return {
      total: parseFloat(total.toFixed(2)),
      totalCapital: parseFloat(totalCapital.toFixed(2)),
      totalMora: parseFloat(totalMora.toFixed(2)),
      items,
    };
  }, [socioCobro, itemsSeleccionados]);

  // Confirmar cobro y emitir recibo
  const handleConfirmarCobro = async (e) => {
    e.preventDefault();
    if (cobroDetalle.items.length === 0) {
      toast.warning("Selecciona al menos un concepto a cobrar", toastOptions);
      return;
    }

    try {
      setProcesandoCobro(true);
      const payload = {
        id_socio: socioCobro.id_socio,
        cargos: cobroDetalle.items,
        monto_total_recibido: cobroDetalle.total,
        observacion: observacionCobro || "Cobro integral en ventanilla",
      };

      const { data } = await axios.post(ingresosRoute, payload, auth.config);
      toast.success("¡Cobro exitoso! Recibo emitido correctamente", toastOptions);

      setModalCobroAbierto(false);
      setReciboGenerado(data.ingreso);
      setModalReciboExito(true);

      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al procesar cobro", toastOptions);
    } finally {
      setProcesandoCobro(false);
    }
  };

  // ─── Anulación de Recibo con Modal Moderno ─────────────────────────────────
  const handleAnularRecibo = (recibo) => {
    setConfirmModalData({
      isOpen: true,
      title: `Anular Recibo #${recibo.nro_recibo || recibo.id_ingreso}`,
      message: `¿Está seguro de anular el recibo #${recibo.nro_recibo || recibo.id_ingreso} por Bs. ${parseFloat(recibo.monto_total_recibido || 0).toFixed(2)} emitido a nombre de ${recibo.pagador}? Los cargos cobrados volverán a quedar pendientes en el estado de cuenta del socio.`,
      confirmText: "Sí, Anular Recibo",
      requireReason: true,
      reasonPlaceholder: "Ingrese el motivo obligatorio de la anulación (mínimo 5 caracteres)...",
      onConfirm: async (motivo) => {
        if (!motivo || motivo.trim().length < 5) {
          toast.error("El motivo de anulación es obligatorio (mínimo 5 caracteres)", toastOptions);
          return;
        }
        try {
          setConfirmModalData((prev) => ({ ...prev, loading: true }));
          await axios.post(
            `${ingresosRoute}/${recibo.id_ingreso}/anular`,
            { observacion: motivo.trim() },
            auth.config
          );
          toast.success("Recibo anulado con éxito y deuda revertida en el estado de cuenta", toastOptions);
          setConfirmModalData(confirmModalInitial);
          fetchData();
        } catch (err) {
          toast.error(err.response?.data?.mensaje || "Error al anular recibo", toastOptions);
          setConfirmModalData((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  // ─── Registro de Ingreso Directo ──────────────────────────────────────────
  const [directoErrors, setDirectoErrors] = useState({});

  const handleAbrirModalDirecto = () => {
    setFormDirecto({
      tipo_origen: "traspaso",
      concepto: "Traspaso de Caseta (10% de venta)",
      valor_venta_caseta: "",
      porcentaje_traspaso: 10,
      monto: "",
      pagador: "",
      id_socio: "",
      fecha_pago: new Date().toISOString().split("T")[0],
      detalle: "Pago del 10% reglamentario por transferencia/venta de caseta según estatutos de la asociación.",
    });
    setDirectoErrors({});
    setModalDirectoAbierto(true);
  };

  const handleDirectoChange = (campo, valor) => {
    if (directoErrors[campo]) {
      setDirectoErrors((prev) => ({ ...prev, [campo]: "" }));
    }
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
          nuevo.detalle = "Cobro de cuota de inscripción e ingreso formal de nuevo socio a la asociación.";
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
          const s = resumenSocios.find((soc) => String(soc.id_socio) === String(valor));
          if (s) {
            const p = s.persona || {};
            const nombre = `${p.nombres || ""} ${p.apellidos || ""}`.trim();
            if (!prev.pagador || prev.pagador.includes("Caseta #")) {
              nuevo.pagador = `${nombre} (Caseta #${s.nro_caseta})`;
            }
          }
        }
      }

      return nuevo;
    });
  };

  const validateDirecto = () => {
    const errs = {};
    const montoNum = parseFloat(formDirecto.monto);
    if (!formDirecto.monto || isNaN(montoNum) || montoNum <= 0) {
      errs.monto = "El monto debe ser un valor positivo mayor a 0 Bs.";
    }
    if (!formDirecto.concepto || !formDirecto.concepto.trim()) {
      errs.concepto = "El concepto del ingreso es obligatorio.";
    } else if (formDirecto.concepto.trim().length < 3) {
      errs.concepto = "El concepto debe tener al menos 3 caracteres.";
    }
    if (!formDirecto.pagador || !formDirecto.pagador.trim()) {
      errs.pagador = "El nombre del pagador es obligatorio.";
    } else if (formDirecto.pagador.trim().length < 2) {
      errs.pagador = "El pagador debe tener al menos 2 caracteres.";
    }

    if (formDirecto.tipo_origen === "traspaso") {
      const ventaNum = parseFloat(formDirecto.valor_venta_caseta);
      if (!formDirecto.valor_venta_caseta || isNaN(ventaNum) || ventaNum <= 0) {
        errs.valor_venta_caseta = "Ingrese el valor de venta pactado (> 0 Bs).";
      }
      const pctNum = parseFloat(formDirecto.porcentaje_traspaso);
      if (isNaN(pctNum) || pctNum <= 0 || pctNum > 100) {
        errs.porcentaje_traspaso = "El porcentaje debe estar entre 1 y 100%.";
      }
    }

    setDirectoErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitDirecto = async (e) => {
    e.preventDefault();

    if (!validateDirecto()) {
      toast.warning("Por favor complete los campos obligatorios del ingreso", toastOptions);
      return;
    }

    const montoNum = parseFloat(formDirecto.monto);

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
      };

      const { data } = await axios.post(ingresoDirectoRoute, payload, auth.config);
      toast.success("¡Ingreso directo registrado con éxito y recibo emitido!", toastOptions);

      setModalDirectoAbierto(false);
      setReciboGenerado(data.ingreso);
      setModalReciboExito(true);

      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al registrar ingreso directo", toastOptions);
    } finally {
      setGuardandoDirecto(false);
    }
  };

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        {/* Cabecera Principal */}
        <SectionHeader>
          <div className="titles">
            <h1>Caja y Ventanilla de Cobranza Integral</h1>
            <p>
              Control centralizado de pagos: <strong>Luz Eléctrica</strong>,{" "}
              <strong>Serenaje y Seguridad</strong>, <strong>Multas de Eventos</strong> y Cuotas
            </p>
          </div>
          <div className="actions" style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                padding: "0.5rem 0.85rem",
                background: "rgba(56, 189, 248, 0.1)",
                border: `1px solid rgba(56, 189, 248, 0.3)`,
                borderRadius: theme.radius.md,
                fontSize: "0.8rem",
                color: "#38bdf8",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <ShieldCheck size={16} /> Serenaje (20 Bs) generado automáticamente cada mes
            </div>
            <CreateButton
              onClick={handleAbrirModalDirecto}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                fontSize: "0.825rem",
              }}
            >
              <DollarSign size={16} />
              <span>+ Ingreso Directo (Traspaso 10%)</span>
            </CreateButton>
          </div>
        </SectionHeader>

        {/* Métricas Globales */}
        <MetricGrid>
          <MetricCard>
            <span className="label">Total Deuda Mercado (Por Cobrar)</span>
            <h2 style={{ color: theme.colors.danger }}>
              {(metricas.totalDeudaMercado || 0).toFixed(2)} Bs
            </h2>
            <p className="hint">{metricas.sociosConDeuda} socio(s) con deudas pendientes</p>
          </MetricCard>

          <MetricCard>
            <span className="label">Deuda en Luz Eléctrica (1 kW = 2 Bs)</span>
            <h2 style={{ color: theme.colors.warning }}>
              {(metricas.totalDeudaLuz || 0).toFixed(2)} Bs
            </h2>
            <p className="hint">Consumos acumulados de medidores</p>
          </MetricCard>

          <MetricCard>
            <span className="label">Deuda en Serenaje y Seguridad</span>
            <h2 style={{ color: "#38bdf8" }}>
              {(metricas.totalDeudaSerenaje || 0).toFixed(2)} Bs
            </h2>
            <p className="hint">Cuota fija de 20 Bs por mes</p>
          </MetricCard>

          <MetricCard>
            <span className="label">Multas de Eventos y Marchas</span>
            <h2 style={{ color: "#f43f5e" }}>
              {(metricas.totalDeudaMultas || 0).toFixed(2)} Bs
            </h2>
            <p className="hint">Inasistencias aplicadas en caja</p>
          </MetricCard>

          <MetricCard>
            <span className="label">Total Recaudado en Caja</span>
            <h2 style={{ color: theme.colors.success }}>
              {(metricas.totalRecaudadoValido || 0).toFixed(2)} Bs
            </h2>
            <p className="hint">{recibos.length} recibo(s) emitidos</p>
          </MetricCard>
        </MetricGrid>

        {/* Barra de Pestañas */}
        <ViewToggleBar>
          <TabBtn
            $active={vistaActiva === "deudas"}
            onClick={() => setVistaActiva("deudas")}
          >
            <CreditCard size={16} />
            <span>Cobranza por Socio (Luz, Serenaje, Multas)</span>
          </TabBtn>
          <TabBtn
            $active={vistaActiva === "recibos"}
            onClick={() => setVistaActiva("recibos")}
          >
            <Receipt size={16} />
            <span>Historial de Recibos Emitidos</span>
          </TabBtn>
        </ViewToggleBar>

        {/* ─── PESTAÑA 1: PADRÓN UNIFICADO DE DEUDAS Y COBRANZA ─── */}
        {vistaActiva === "deudas" && (
          <TableCard>
            <TableToolbar>
              <div style={{ display: "flex", gap: "0.75rem", flex: 1, flexWrap: "wrap" }}>
                <SearchInput
                  placeholder="Buscar por caseta, nombre del socio o CI..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={{ minWidth: "280px" }}
                />
                <Select
                  value={filtroDeuda}
                  onChange={(e) => setFiltroDeuda(e.target.value)}
                  style={{ width: "auto" }}
                >
                  <option value="todas">Todos los Socios ({resumenSocios.length})</option>
                  <option value="con_deuda">
                    Solo Con Deuda Pendiente ({metricas.sociosConDeuda})
                  </option>
                  <option value="al_dia">
                    Al Día ({resumenSocios.length - metricas.sociosConDeuda})
                  </option>
                </Select>
              </div>
              <span style={{ color: theme.colors.textMuted, fontSize: "0.875rem" }}>
                {sociosFiltrados.length} socio(s)
              </span>
            </TableToolbar>

            <TableResponsiveWrapper>
              <TableWrapper>
                <TableHead>
                  <tr>
                    <th>Caseta</th>
                    <th>Socio</th>
                    <th>Luz Eléctrica (2 Bs/kW)</th>
                    <th>Serenaje (20 Bs/mes)</th>
                    <th>Multas & Faltas</th>
                    <th>Aportes Pro-Mejoras</th>
                    <th>Total Adeudado</th>
                    <th>Acción</th>
                  </tr>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                        Cargando estado consolidado de socios...
                      </TableCell>
                    </TableRow>
                  ) : sociosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                        No se encontraron socios con los filtros actuales
                      </TableCell>
                    </TableRow>
                  ) : (
                    sociosFiltrados.map((s) => {
                      const p = s.persona || {};
                      const tieneDeuda = (s.total_deuda_general || 0) > 0;
                      return (
                        <TableRow key={s.id_socio}>
                          <TableCell>
                            <strong>Caseta #{s.nro_caseta}</strong>
                            {s.total_casetas_dueno > 1 && (
                              <div style={{ marginTop: "0.25rem" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    backgroundColor: "rgba(14, 165, 233, 0.15)",
                                    color: theme.colors.primary,
                                    border: `1px solid ${theme.colors.primaryLight}`,
                                    borderRadius: "4px",
                                    padding: "2px 6px",
                                  }}
                                  title={`Propietario de ${s.total_casetas_dueno} casetas: ${s.todas_casetas_dueno?.join(", ")}`}
                                >
                                  <Tag size={11} />
                                  <span>{s.total_casetas_dueno} Casetas ({s.todas_casetas_dueno?.join(", ")})</span>
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <strong>{`${p.nombres || ""} ${p.apellidos || ""}`.trim() || "-"}</strong>
                            <div style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                              CI: {p.ci || "S/D"} | Cel: {p.telefono || "S/D"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {s.luz?.total > 0 ? (
                              <div>
                                <strong style={{ color: theme.colors.warning }}>
                                  {(s.luz.total || 0).toFixed(2)} Bs
                                </strong>
                                <div style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                                  {s.luz.meses_debe} mes(es) pendiente(s)
                                </div>
                              </div>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: theme.colors.success, fontSize: "0.85rem", fontWeight: 600 }}>
                                <CheckCircle2 size={13} />
                                <span>Al día</span>
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {s.serenaje?.total > 0 ? (
                              <div>
                                <strong style={{ color: "#38bdf8" }}>
                                  {(s.serenaje.total || 0).toFixed(2)} Bs
                                </strong>
                                <div style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                                  {s.serenaje.meses_debe} mes(es) adeudado(s)
                                </div>
                              </div>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: theme.colors.success, fontSize: "0.85rem", fontWeight: 600 }}>
                                <CheckCircle2 size={13} />
                                <span>Al día</span>
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {s.multas?.total > 0 ? (
                              <div>
                                <strong style={{ color: "#f43f5e" }}>
                                  {(s.multas.total || 0).toFixed(2)} Bs
                                </strong>
                                <div style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                                  {s.multas.cantidad} multa(s)
                                </div>
                              </div>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: theme.colors.success, fontSize: "0.85rem", fontWeight: 600 }}>
                                <CheckCircle2 size={13} />
                                <span>Sin multas</span>
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {s.aportes?.total > 0 ? (
                              <div>
                                <strong style={{ color: "#a855f7" }}>
                                  {(s.aportes.total || 0).toFixed(2)} Bs
                                </strong>
                                <div style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                                  {s.aportes.cantidad} cuota(s)/mora(s)
                                </div>
                              </div>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: theme.colors.success, fontSize: "0.85rem", fontWeight: 600 }}>
                                <CheckCircle2 size={13} />
                                <span>Al día</span>
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {tieneDeuda ? (
                              <span style={{ color: theme.colors.danger, fontWeight: 800, fontSize: "1.05rem" }}>
                                {(s.total_deuda_general || 0).toFixed(2)} Bs
                              </span>
                            ) : (
                              <span style={{ color: theme.colors.success, fontWeight: 700, fontSize: "0.95rem" }}>
                                0.00 Bs
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <ActionButton
                              $variant={tieneDeuda ? "primary" : "outline"}
                              onClick={() => tieneDeuda && handleAbrirCobroSocio(s)}
                              disabled={!tieneDeuda}
                              style={
                                !tieneDeuda
                                  ? { opacity: 0.4, cursor: "not-allowed" }
                                  : { fontWeight: 700 }
                              }
                              title={tieneDeuda ? "Cobrar cuotas pendientes en ventanilla" : "Socio al día (Sin deudas pendientes)"}
                            >
                              COBRAR
                            </ActionButton>
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

        {/* ─── PESTAÑA 2: HISTORIAL DE RECIBOS EMITIDOS ─── */}
        {vistaActiva === "recibos" && (
          <TableCard>
            <TableToolbar>
              <SearchInput
                placeholder="Buscar por N° Recibo, socio o caseta..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <span style={{ color: theme.colors.textMuted, fontSize: "0.875rem" }}>
                {recibosFiltrados.length} recibo(s)
              </span>
            </TableToolbar>
            <TableResponsiveWrapper>
              <TableWrapper>
                <TableHead>
                  <tr>
                    <th>N° Recibo</th>
                    <th>Fecha y Hora</th>
                    <th>Socio / Caseta</th>
                    <th>Cajero (Operador)</th>
                    <th>Monto Recibido</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                        Cargando historial de caja...
                      </TableCell>
                    </TableRow>
                  ) : recibosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                        No hay recibos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    recibosFiltrados.map((item) => {
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
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "0.68rem", backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                  <Tag size={11} />
                                  <span>Traspaso 10%</span>
                                </span>
                              </div>
                            )}
                            {item.tipo_origen === "afiliacion" && (
                              <div style={{ marginTop: "0.2rem" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "0.68rem", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                  <UserCheck size={11} />
                                  <span>Afiliación</span>
                                </span>
                              </div>
                            )}
                            {item.tipo_origen === "alquiler" && (
                              <div style={{ marginTop: "0.2rem" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "0.68rem", backgroundColor: "rgba(14, 165, 233, 0.15)", color: "#0ea5e9", border: "1px solid rgba(14, 165, 233, 0.3)", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                  <Building size={11} />
                                  <span>Alquiler</span>
                                </span>
                              </div>
                            )}
                            {item.tipo_origen === "directo" && (
                              <div style={{ marginTop: "0.2rem" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "0.68rem", backgroundColor: "rgba(168, 85, 247, 0.15)", color: "#a855f7", border: "1px solid rgba(168, 85, 247, 0.3)", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                  <Zap size={11} />
                                  <span>Ingreso Directo</span>
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{formatDateTime(item.fecha_pago)}</TableCell>
                          <TableCell>
                            {socio.nro_caseta ? (
                              <strong>Caseta #{socio.nro_caseta}</strong>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#38bdf8", fontWeight: 700, fontSize: "0.82rem" }}>
                                <Globe size={13} />
                                <span>Ingreso Directo / Externo</span>
                              </span>
                            )}
                            <div style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                              {item.pagador || (persona.nombres ? `${persona.nombres} ${persona.apellidos || ""}`.trim() : "Público General")}
                            </div>
                            {item.concepto && (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "0.72rem", color: theme.colors.primary, marginTop: "0.15rem" }}>
                                <FileText size={11} />
                                <span>{item.concepto}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{cajeroNombre}</TableCell>
                          <TableCell style={{ fontWeight: 800, color: theme.colors.success }}>
                            {parseFloat(item.monto_total_recibido || 0).toFixed(2)} Bs
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
                                  <ViewButton as="span" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    <Printer size={13} />
                                    <span>{pdfLoading ? "Generando..." : "PDF"}</span>
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
        )}
      </ContentContainer>

      {/* ─── MODAL 1: COBRO INTEGRAL EN VENTANILLA ─── */}
      <Modal
        isOpen={modalCobroAbierto}
        onClose={() => setModalCobroAbierto(false)}
        title={
          socioCobro
            ? `Cobro en Ventanilla - Caseta #${socioCobro.nro_caseta} (${socioCobro.persona?.nombres || ""} ${socioCobro.persona?.apellidos || ""})`
            : "Cobro en Ventanilla"
        }
        maxWidth="680px"
      >
        {socioCobro && (
          <form onSubmit={handleConfirmarCobro}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.85rem", color: theme.colors.textMuted }}>
                Selecciona los conceptos que el socio cancelará hoy:
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: theme.colors.primary,
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                  onClick={() => {
                    const todos = {};
                    (socioCobro.cargos_todos || []).forEach((c) => (todos[c.id_cargo] = true));
                    setItemsSeleccionados(todos);
                  }}
                >
                  <Check size={13} />
                  <span>Seleccionar Todos</span>
                </button>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: theme.colors.textMuted,
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                  onClick={() => setItemsSeleccionados({})}
                >
                  <X size={13} />
                  <span>Deseleccionar</span>
                </button>
              </div>
            </div>

            {(!socioCobro.cargos_todos || socioCobro.cargos_todos.length === 0) ? (
              <div
                style={{
                  padding: "1.5rem",
                  textAlign: "center",
                  background: "rgba(16, 185, 129, 0.1)",
                  borderRadius: theme.radius.md,
                  border: `1px solid ${theme.colors.success}`,
                }}
              >
                <div style={{ marginBottom: "0.5rem", display: "flex", justifyContent: "center" }}>
                  <CheckCircle2 size={36} color={theme.colors.success} />
                </div>
                <h3 style={{ color: theme.colors.success, marginBottom: "0.3rem" }}>
                  Este socio se encuentra totalmente al día
                </h3>
                <p style={{ fontSize: "0.85rem", color: theme.colors.textMuted }}>
                  No tiene deudas pendientes en Luz, Serenaje ni Multas.
                </p>
              </div>
            ) : (
              <div style={{ maxHeight: "360px", overflowY: "auto", paddingRight: "0.25rem" }}>
                {/* 1. LUZ */}
                {socioCobro.luz?.cargos?.length > 0 && (
                  <CategoryGroupCard>
                    <div className="cat-header">
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <Zap size={14} color={theme.colors.warning} />
                        <span>Consumo de Luz Eléctrica ({socioCobro.luz.cargos.length} mes/es)</span>
                      </strong>
                      <span className="subtotal">{(socioCobro.luz.total || 0).toFixed(2)} Bs</span>
                    </div>
                    {socioCobro.luz.cargos.map((c) => {
                      const totalItem =
                        parseFloat(c.saldo_capital_pendiente || 0) +
                        parseFloat(c.monto_mora_acumulada || 0);
                      return (
                        <DebtItemRow key={c.id_cargo}>
                          <div className="left">
                            <input
                              type="checkbox"
                              checked={!!itemsSeleccionados[c.id_cargo]}
                              onChange={(e) =>
                                setItemsSeleccionados({
                                  ...itemsSeleccionados,
                                  [c.id_cargo]: e.target.checked,
                                })
                              }
                            />
                            <div>
                              <div className="desc">
                                Periodo: {c.periodo || "-"} | {c.detalle}
                              </div>
                              <div className="meta">
                                Vencimiento: {formatDate(c.fecha_vencimiento)}
                              </div>
                            </div>
                          </div>
                          <div className="right">
                            <div className="amount">{(isNaN(totalItem) ? 0 : totalItem).toFixed(2)} Bs</div>
                            {parseFloat(c.monto_mora_acumulada || 0) > 0 && (
                              <div className="mora">
                                Mora: +{parseFloat(c.monto_mora_acumulada || 0).toFixed(2)} Bs
                              </div>
                            )}
                          </div>
                        </DebtItemRow>
                      );
                    })}
                  </CategoryGroupCard>
                )}

                {/* 2. SERENAJE */}
                {socioCobro.serenaje?.cargos?.length > 0 && (
                  <CategoryGroupCard>
                    <div className="cat-header">
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <ShieldCheck size={14} color="#38bdf8" />
                        <span>Serenaje y Seguridad ({socioCobro.serenaje.cargos.length} mes/es)</span>
                      </strong>
                      <span className="subtotal" style={{ color: "#38bdf8" }}>
                        {(socioCobro.serenaje.total || 0).toFixed(2)} Bs
                      </span>
                    </div>
                    {socioCobro.serenaje.cargos.map((c) => {
                      const totalItem =
                        parseFloat(c.saldo_capital_pendiente || 0) +
                        parseFloat(c.monto_mora_acumulada || 0);
                      return (
                        <DebtItemRow key={c.id_cargo}>
                          <div className="left">
                            <input
                              type="checkbox"
                              checked={!!itemsSeleccionados[c.id_cargo]}
                              onChange={(e) =>
                                setItemsSeleccionados({
                                  ...itemsSeleccionados,
                                  [c.id_cargo]: e.target.checked,
                                })
                              }
                            />
                            <div>
                              <div className="desc">
                                {c.detalle || `Aporte Serenaje (${c.periodo})`}
                              </div>
                              <div className="meta">
                                Vencimiento: {formatDate(c.fecha_vencimiento)}
                              </div>
                            </div>
                          </div>
                          <div className="right">
                            <div className="amount">{(isNaN(totalItem) ? 0 : totalItem).toFixed(2)} Bs</div>
                            {parseFloat(c.monto_mora_acumulada || 0) > 0 && (
                              <div className="mora">
                                Mora: +{parseFloat(c.monto_mora_acumulada || 0).toFixed(2)} Bs
                              </div>
                            )}
                          </div>
                        </DebtItemRow>
                      );
                    })}
                  </CategoryGroupCard>
                )}

                {/* 3. MULTAS */}
                {socioCobro.multas?.cargos?.length > 0 && (
                  <CategoryGroupCard>
                    <div className="cat-header">
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <AlertTriangle size={14} color="#f43f5e" />
                        <span>Multas y Sanciones ({socioCobro.multas.cargos.length} falta/s)</span>
                      </strong>
                      <span className="subtotal" style={{ color: "#f43f5e" }}>
                        {(socioCobro.multas.total || 0).toFixed(2)} Bs
                      </span>
                    </div>
                    {socioCobro.multas.cargos.map((c) => {
                      const totalItem =
                        parseFloat(c.saldo_capital_pendiente || 0) +
                        parseFloat(c.monto_mora_acumulada || 0);
                      return (
                        <DebtItemRow key={c.id_cargo}>
                          <div className="left">
                            <input
                              type="checkbox"
                              checked={!!itemsSeleccionados[c.id_cargo]}
                              onChange={(e) =>
                                setItemsSeleccionados({
                                  ...itemsSeleccionados,
                                  [c.id_cargo]: e.target.checked,
                                })
                              }
                            />
                            <div>
                              <div className="desc">{c.detalle}</div>
                              <div className="meta">
                                Concepto: {c.concepto?.nombre_concepto || "Multa"}
                              </div>
                            </div>
                          </div>
                          <div className="right">
                            <div className="amount">{(isNaN(totalItem) ? 0 : totalItem).toFixed(2)} Bs</div>
                            {parseFloat(c.monto_mora_acumulada || 0) > 0 && (
                              <div className="mora">
                                Mora: +{parseFloat(c.monto_mora_acumulada || 0).toFixed(2)} Bs
                              </div>
                            )}
                          </div>
                        </DebtItemRow>
                      );
                    })}
                  </CategoryGroupCard>
                )}

                {/* 4. APORTES PRO-MEJORAS */}
                {socioCobro.aportes?.cargos?.length > 0 && (
                  <CategoryGroupCard>
                    <div className="cat-header">
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <Hammer size={14} color="#a855f7" />
                        <span>Aportes Pro-Mejoras ({socioCobro.aportes.cargos.length} concepto/s)</span>
                      </strong>
                      <span className="subtotal" style={{ color: "#a855f7" }}>
                        {(socioCobro.aportes.total || 0).toFixed(2)} Bs
                      </span>
                    </div>
                    {socioCobro.aportes.cargos.map((c) => {
                      const totalItem =
                        parseFloat(c.saldo_capital_pendiente || 0) +
                        parseFloat(c.monto_mora_acumulada || 0);
                      return (
                        <DebtItemRow key={c.id_cargo}>
                          <div className="left">
                            <input
                              type="checkbox"
                              checked={!!itemsSeleccionados[c.id_cargo]}
                              onChange={(e) =>
                                setItemsSeleccionados({
                                  ...itemsSeleccionados,
                                  [c.id_cargo]: e.target.checked,
                                })
                              }
                            />
                            <div>
                              <div className="desc">{c.detalle}</div>
                              <div className="meta">
                                Concepto: {c.concepto?.nombre_concepto || "Aporte Pro-Mejora"} | Vence: {formatDate(c.fecha_vencimiento)}
                              </div>
                            </div>
                          </div>
                          <div className="right">
                            <div className="amount">{(isNaN(totalItem) ? 0 : totalItem).toFixed(2)} Bs</div>
                            {parseFloat(c.monto_mora_acumulada || 0) > 0 && (
                              <div className="mora">
                                Mora: +{parseFloat(c.monto_mora_acumulada || 0).toFixed(2)} Bs
                              </div>
                            )}
                          </div>
                        </DebtItemRow>
                      );
                    })}
                  </CategoryGroupCard>
                )}

                {/* 5. OTROS */}
                {socioCobro.otros?.cargos?.length > 0 && (
                  <CategoryGroupCard>
                    <div className="cat-header">
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <Pin size={14} />
                        <span>Otras Cuotas y Aportes ({socioCobro.otros.cargos.length})</span>
                      </strong>
                      <span className="subtotal">{(socioCobro.otros.total || 0).toFixed(2)} Bs</span>
                    </div>
                    {socioCobro.otros.cargos.map((c) => {
                      const totalItem =
                        parseFloat(c.saldo_capital_pendiente || 0) +
                        parseFloat(c.monto_mora_acumulada || 0);
                      return (
                        <DebtItemRow key={c.id_cargo}>
                          <div className="left">
                            <input
                              type="checkbox"
                              checked={!!itemsSeleccionados[c.id_cargo]}
                              onChange={(e) =>
                                setItemsSeleccionados({
                                  ...itemsSeleccionados,
                                  [c.id_cargo]: e.target.checked,
                                })
                              }
                            />
                            <div>
                              <div className="desc">{c.detalle}</div>
                              <div className="meta">
                                Concepto: {c.concepto?.nombre_concepto || "Cuota"}
                              </div>
                            </div>
                          </div>
                          <div className="right">
                            <div className="amount">{(isNaN(totalItem) ? 0 : totalItem).toFixed(2)} Bs</div>
                          </div>
                        </DebtItemRow>
                      );
                    })}
                  </CategoryGroupCard>
                )}
              </div>
            )}

            {/* Resumen del Monto a Recibir */}
            {socioCobro.cargos_todos?.length > 0 && (
              <>
                <PaymentSummaryBox>
                  <div className="info">
                    <span>Conceptos a Liquidar</span>
                    <strong>{cobroDetalle.items.length} ítem(s) seleccionado(s)</strong>
                    <div style={{ fontSize: "0.78rem", color: theme.colors.textMuted, marginTop: "0.2rem" }}>
                      Capital: {cobroDetalle.totalCapital.toFixed(2)} Bs | Mora: {cobroDetalle.totalMora.toFixed(2)} Bs
                    </div>
                  </div>
                  <div className="total-badge">
                    <span>Total a Cobrar</span>
                    <h2>{cobroDetalle.total.toFixed(2)} Bs</h2>
                  </div>
                </PaymentSummaryBox>

                <FormGroup>
                  <Label>Glosa / Observación del Recibo</Label>
                  <Input
                    value={observacionCobro}
                    onChange={(e) => setObservacionCobro(e.target.value)}
                    placeholder="Ej. Pago mensualidad de caseta y servicios"
                  />
                </FormGroup>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem" }}>
                  <ActionButton
                    type="button"
                    $variant="outline"
                    onClick={() => setModalCobroAbierto(false)}
                  >
                    Cancelar
                  </ActionButton>
                  <CreateButton
                    type="submit"
                    disabled={procesandoCobro || cobroDetalle.total <= 0}
                  >
                    {procesandoCobro ? "Emitiendo Recibo..." : `Confirmar y Emitir Recibo (${cobroDetalle.total.toFixed(2)} Bs)`}
                  </CreateButton>
                </div>
              </>
            )}
          </form>
        )}
      </Modal>

      {/* ─── MODAL 2: CONFIRMACIÓN DE RECIBO Y DESCARGA INMEDIATA ─── */}
      <Modal
        isOpen={modalReciboExito}
        onClose={() => setModalReciboExito(false)}
        title="¡Cobro Registrado Exitosamente!"
        maxWidth="500px"
      >
        {reciboGenerado && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "center" }}>
              <CheckCircle size={48} color={theme.colors.success} />
            </div>
            <h3 style={{ fontSize: "1.3rem", color: theme.colors.textMain }}>
              Recibo Oficial #{String(reciboGenerado.id_ingreso).padStart(5, "0")}
            </h3>
            <p style={{ color: theme.colors.textMuted, fontSize: "0.9rem", margin: "0.5rem 0 1.25rem" }}>
              Total Cobrado:{" "}
              <strong style={{ color: theme.colors.success, fontSize: "1.2rem" }}>
                {parseFloat(reciboGenerado.monto_total_recibido || 0).toFixed(2)} Bs
              </strong>
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
              <PDFDownloadLink
                document={<ReciboPagoPDF ingreso={reciboGenerado} />}
                fileName={`recibo_${reciboGenerado.id_ingreso}.pdf`}
                style={{ textDecoration: "none" }}
              >
                {({ loading: pdfLoading }) => (
                  <CreateButton as="span" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <Printer size={16} />
                    <span>{pdfLoading ? "Generando PDF..." : "Descargar Recibo Oficial en PDF"}</span>
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

      {/* ─── MODAL 3: REGISTRO DE INGRESO DIRECTO ─── */}
      <Modal
        isOpen={modalDirectoAbierto}
        onClose={() => setModalDirectoAbierto(false)}
        title="Registrar Ingreso Directo en Caja (Traspaso 10% / Afiliación / Extraordinario)"
        maxWidth="640px"
      >
        <form onSubmit={handleSubmitDirecto} noValidate>
          <FormGroup>
            <Label>Tipo de Ingreso Directo</Label>
            <Select
              value={formDirecto.tipo_origen}
              onChange={(e) => handleDirectoChange("tipo_origen", e.target.value)}
            >
              <option value="traspaso">Traspaso de Caseta (Cobro del 10% del valor de venta)</option>
              <option value="afiliacion">Cuota de Afiliación / Nuevo Socio</option>
              <option value="alquiler">Alquiler de Espacio Común / Depósito / Baños</option>
              <option value="directo">Otro Ingreso Directo / Extraordinario</option>
            </Select>
          </FormGroup>

          {/* Calculadora en vivo del 10% para traspaso de caseta */}
          {formDirecto.tipo_origen === "traspaso" && (
            <CalculatorBox>
              <div className="calc-title">
                <Calculator size={16} />
                <span>Calculadora de Traspaso de Caseta (10% de Ley)</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <Label style={{ color: "#d97706" }}>Valor Venta Caseta (Bs.) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej. 50000"
                    value={formDirecto.valor_venta_caseta}
                    $hasError={Boolean(directoErrors.valor_venta_caseta)}
                    onChange={(e) => handleDirectoChange("valor_venta_caseta", e.target.value)}
                    style={{ borderColor: directoErrors.valor_venta_caseta ? theme.colors.danger : "#f59e0b" }}
                    autoFocus
                  />
                  {directoErrors.valor_venta_caseta && <ErrorText>{directoErrors.valor_venta_caseta}</ErrorText>}
                </div>
                <div>
                  <Label style={{ color: "#d97706" }}>% Retención / Traspaso *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="100"
                    value={formDirecto.porcentaje_traspaso}
                    $hasError={Boolean(directoErrors.porcentaje_traspaso)}
                    onChange={(e) => handleDirectoChange("porcentaje_traspaso", e.target.value)}
                    style={{ borderColor: directoErrors.porcentaje_traspaso ? theme.colors.danger : "#f59e0b" }}
                  />
                  {directoErrors.porcentaje_traspaso && <ErrorText>{directoErrors.porcentaje_traspaso}</ErrorText>}
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
                value={formDirecto.concepto}
                $hasError={Boolean(directoErrors.concepto)}
                onChange={(e) => handleDirectoChange("concepto", e.target.value)}
                placeholder="Ej. Traspaso de Caseta (10%), Cuota de Afiliación..."
              />
              {directoErrors.concepto && <ErrorText>{directoErrors.concepto}</ErrorText>}
            </FormGroup>

            <FormGroup>
              <Label>Monto a Cobrar (Bs.) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={formDirecto.monto}
                $hasError={Boolean(directoErrors.monto)}
                onChange={(e) => handleDirectoChange("monto", e.target.value)}
                placeholder="0.00"
                style={{ fontWeight: 800, fontSize: "1rem", color: theme.colors.success }}
              />
              {directoErrors.monto && <ErrorText>{directoErrors.monto}</ErrorText>}
            </FormGroup>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <FormGroup>
              <Label>Vincular a Caseta / Socio (Opcional)</Label>
              <Select
                value={formDirecto.id_socio}
                onChange={(e) => handleDirectoChange("id_socio", e.target.value)}
              >
                <option value="">-- Sin vincular (Comprador externo / Postulante) --</option>
                {resumenSocios.map((s) => {
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
              <Label>Nombre del Pagador / Adquiriente *</Label>
              <Input
                type="text"
                value={formDirecto.pagador}
                $hasError={Boolean(directoErrors.pagador)}
                onChange={(e) => handleDirectoChange("pagador", e.target.value)}
                placeholder="Ej. Juan Pérez (Comprador caseta #14)"
              />
              {directoErrors.pagador && <ErrorText>{directoErrors.pagador}</ErrorText>}
            </FormGroup>
          </div>

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
              {guardandoDirecto ? "Registrando..." : `Registrar Ingreso (${parseFloat(formDirecto.monto || 0).toFixed(2)} Bs)`}
            </CreateButton>
          </div>
        </form>
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
        onClose={() => setConfirmModalData(confirmModalInitial)}
        loading={confirmModalData.loading}
        isDanger={true}
      />
    </PageContainer>
  );
}

export default CajaCobranzaPage;
