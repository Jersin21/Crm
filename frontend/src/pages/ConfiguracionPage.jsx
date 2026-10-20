import React, { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import Sidebar from "../components/Sidebar";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import {
  Settings,
  Crown,
  Zap,
  CreditCard,
  TrendingDown,
  Lightbulb,
  Info,
  ShieldCheck,
  AlertTriangle,
  Building,
  Save,
  Plus,
  Trash2,
  Edit,
} from "lucide-react";
import useAuth from "../hooks/authHooks";
import toastOptions from "../utils/toastOptions";
import theme from "../styles/theme";
import ROLES from "../utils/roles";
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
  CreateButton,
  EditButton,
  DeleteButton,
  ActionButton,
} from "../styles/commonStyles";
import {
  conceptosRoute,
  tipoEgresoRoute,
  asociacionConfigRoute,
} from "../utils/APIroutes";

const RoleBanner = styled.div`
  background: linear-gradient(90deg, rgba(14, 165, 233, 0.15), rgba(168, 85, 247, 0.15));
  border: 1px solid rgba(14, 165, 233, 0.3);
  border-radius: ${theme.radius.md};
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  .banner-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;

    .icon {
      font-size: 1.75rem;
    }

    h3 {
      font-size: 1rem;
      font-weight: 700;
      color: ${theme.colors.textMain};
      margin: 0;
    }
    p {
      font-size: 0.8rem;
      color: ${theme.colors.textMuted};
      margin: 0.2rem 0 0;
    }
  }

  .badge {
    background-color: ${theme.colors.primary};
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

const TabBar = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid ${theme.colors.border};
  padding-bottom: 0.5rem;
  flex-wrap: wrap;
`;

const TabButton = styled.button`
  padding: 0.6rem 1.25rem;
  background: ${({ $active }) => ($active ? theme.colors.primary : "transparent")};
  color: ${({ $active }) => ($active ? "white" : theme.colors.textMuted)};
  border: 1px solid ${({ $active }) => ($active ? theme.colors.primary : "transparent")};
  border-radius: ${theme.radius.md};
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${theme.colors.textMain};
    background: ${({ $active }) => ($active ? theme.colors.primaryHover : "rgba(255, 255, 255, 0.05)")};
  }
`;

const ConfigGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
`;

const ConfigCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  .card-header {
    border-bottom: 1px solid ${theme.colors.border};
    padding-bottom: 0.75rem;

    h3 {
      font-size: 1.05rem;
      font-weight: 700;
      color: ${theme.colors.textMain};
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    p {
      font-size: 0.8rem;
      color: ${theme.colors.textMuted};
      margin-top: 0.25rem;
    }
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

function ConfiguracionPage() {
  const { auth } = useAuth();
  const [tab, setTab] = useState("parametros");
  const [loading, setLoading] = useState(true);
  const [guardandoParametros, setGuardandoParametros] = useState(false);
  const [errorsAsoc, setErrorsAsoc] = useState({});
  const [errorsConcepto, setErrorsConcepto] = useState({});
  const [errorsTipo, setErrorsTipo] = useState({});

  // Parámetros de la Asociación
  const [formAsoc, setFormAsoc] = useState({
    nombre_mercado: "",
    direccion: "",
    telefono: "",
    precio_kwh: "2.00",
    monto_serenaje: "20.00",
    dia_corte_serenaje: "5",
    multa_asamblea: "30.00",
    multa_marcha: "50.00",
  });

  // Catálogos
  const [conceptos, setConceptos] = useState([]);
  const [tiposEgreso, setTiposEgreso] = useState([]);

  // Modales secundarios de creación/edición
  const [modalConcepto, setModalConcepto] = useState(false);
  const [formConcepto, setFormConcepto] = useState({
    nombre_concepto: "",
    monto_fijo: "",
    aplica_mora: false,
    tasa_mora_mensual: "0.03",
    dias_gracia: "5",
  });
  const [conceptoEditando, setConceptoEditando] = useState(null);

  const [modalTipo, setModalTipo] = useState(false);
  const [formTipo, setFormTipo] = useState({ nombre_categoria: "" });
  const [tipoEditando, setTipoEditando] = useState(null);

  // Modales de confirmación de eliminación
  const [conceptoAEliminar, setConceptoAEliminar] = useState(null);
  const [tipoAEliminar, setTipoAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const esDirectivaOAdmin = [
    ROLES.SUPERADMIN_SAAS,
    ROLES.ADMIN_ASOCIACION,
    ROLES.PRESIDENTE,
  ].includes(auth?.user?.rol);

  const fetchTodo = async () => {
    try {
      setLoading(true);
      const [resConf, resConc, resTipos] = await Promise.all([
        axios.get(asociacionConfigRoute, auth.config),
        axios.get(conceptosRoute, auth.config),
        axios.get(tipoEgresoRoute, auth.config),
      ]);

      if (resConf.data?.configuracion) {
        const c = resConf.data.configuracion;
        setFormAsoc({
          nombre_mercado: c.nombre_mercado || "",
          direccion: c.direccion || "",
          telefono: c.telefono || "",
          precio_kwh: c.precio_kwh ? String(c.precio_kwh) : "2.00",
          monto_serenaje: c.monto_serenaje ? String(c.monto_serenaje) : "20.00",
          dia_corte_serenaje: c.dia_corte_serenaje ? String(c.dia_corte_serenaje) : "5",
          multa_asamblea: c.multa_asamblea ? String(c.multa_asamblea) : "30.00",
          multa_marcha: c.multa_marcha ? String(c.multa_marcha) : "50.00",
        });
      }

      setConceptos(Array.isArray(resConc.data) ? resConc.data : resConc.data.conceptos || []);
      setTiposEgreso(Array.isArray(resTipos.data) ? resTipos.data : resTipos.data.tipos || []);
    } catch (err) {
      toast.error("Error al cargar la configuración", toastOptions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.config) fetchTodo();
  }, [auth]);

  const validateAsoc = () => {
    const errs = {};
    const precioKwhNum = parseFloat(formAsoc.precio_kwh);
    if (!formAsoc.precio_kwh || isNaN(precioKwhNum) || precioKwhNum <= 0) {
      errs.precio_kwh = "El precio por kWh debe ser mayor a 0";
    }
    const serenajeNum = parseFloat(formAsoc.monto_serenaje);
    if (formAsoc.monto_serenaje === "" || isNaN(serenajeNum) || serenajeNum < 0) {
      errs.monto_serenaje = "El serenaje debe ser mayor o igual a 0";
    }
    const diaCorteNum = parseInt(formAsoc.dia_corte_serenaje, 10);
    if (isNaN(diaCorteNum) || diaCorteNum < 1 || diaCorteNum > 28) {
      errs.dia_corte_serenaje = "Día de corte entre 1 y 28";
    }
    const multaAsambNum = parseFloat(formAsoc.multa_asamblea);
    if (formAsoc.multa_asamblea === "" || isNaN(multaAsambNum) || multaAsambNum < 0) {
      errs.multa_asamblea = "La multa debe ser mayor o igual a 0";
    }
    const multaMarchNum = parseFloat(formAsoc.multa_marcha);
    if (formAsoc.multa_marcha === "" || isNaN(multaMarchNum) || multaMarchNum < 0) {
      errs.multa_marcha = "La multa debe ser mayor o igual a 0";
    }
    if (!formAsoc.nombre_mercado || formAsoc.nombre_mercado.trim().length < 2) {
      errs.nombre_mercado = "El nombre de la asociación es obligatorio (mínimo 2 caracteres)";
    }
    setErrorsAsoc(errs);
    return Object.keys(errs).length === 0;
  };

  const validateConcepto = () => {
    const errs = {};
    if (!formConcepto.nombre_concepto || formConcepto.nombre_concepto.trim().length < 2) {
      errs.nombre_concepto = "El nombre del concepto es obligatorio (mínimo 2 letras)";
    }
    if (formConcepto.monto_fijo !== "" && formConcepto.monto_fijo !== null && formConcepto.monto_fijo !== undefined) {
      const mf = parseFloat(formConcepto.monto_fijo);
      if (isNaN(mf) || mf < 0) {
        errs.monto_fijo = "El monto fijo no puede ser negativo";
      }
    }
    if (formConcepto.aplica_mora) {
      const tm = parseFloat(formConcepto.tasa_mora_mensual);
      if (isNaN(tm) || tm < 0) {
        errs.tasa_mora_mensual = "La tasa debe ser mayor o igual a 0";
      }
      const dg = parseInt(formConcepto.dias_gracia, 10);
      if (isNaN(dg) || dg < 0) {
        errs.dias_gracia = "Los días deben ser mayor o igual a 0";
      }
    }
    setErrorsConcepto(errs);
    return Object.keys(errs).length === 0;
  };

  const validateTipo = () => {
    const errs = {};
    if (!formTipo.nombre_categoria || formTipo.nombre_categoria.trim().length < 2) {
      errs.nombre_categoria = "El nombre de la categoría es obligatorio (mínimo 2 letras)";
    }
    setErrorsTipo(errs);
    return Object.keys(errs).length === 0;
  };

  // Guardar Parámetros de la Asociación (Tarifas, Luz, Serenaje, Multas)
  const handleGuardarParametros = async (e) => {
    e.preventDefault();
    if (!esDirectivaOAdmin) {
      toast.error("Solo la Presidencia o Administración puede modificar tarifas", toastOptions);
      return;
    }

    if (!validateAsoc()) {
      toast.error("Por favor corrija los campos indicados en rojo", toastOptions);
      return;
    }

    const precioKwhNum = parseFloat(formAsoc.precio_kwh);
    const serenajeNum = parseFloat(formAsoc.monto_serenaje);
    const diaCorteNum = parseInt(formAsoc.dia_corte_serenaje, 10);
    const multaAsambNum = parseFloat(formAsoc.multa_asamblea);
    const multaMarchNum = parseFloat(formAsoc.multa_marcha);

    try {
      setGuardandoParametros(true);
      const payload = {
        nombre_mercado: formAsoc.nombre_mercado.trim(),
        direccion: (formAsoc.direccion || "").trim(),
        telefono: (formAsoc.telefono || "").trim(),
        precio_kwh: precioKwhNum,
        monto_serenaje: serenajeNum,
        dia_corte_serenaje: diaCorteNum,
        multa_asamblea: multaAsambNum,
        multa_marcha: multaMarchNum,
      };

      const { data } = await axios.put(asociacionConfigRoute, payload, auth.config);
      toast.success(data.mensaje || "Tarifas y parámetros actualizados exitosamente", toastOptions);
      setErrorsAsoc({});
      fetchTodo();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al actualizar parámetros", toastOptions);
    } finally {
      setGuardandoParametros(false);
    }
  };

  // Conceptos
  const handleGuardarConcepto = async (e) => {
    e.preventDefault();
    if (!validateConcepto()) {
      toast.error("Por favor completa los campos del concepto correctamente", toastOptions);
      return;
    }

    const nombre = formConcepto.nombre_concepto.trim();
    let montoFijo = null;
    if (formConcepto.monto_fijo !== "" && formConcepto.monto_fijo !== null && formConcepto.monto_fijo !== undefined) {
      montoFijo = parseFloat(formConcepto.monto_fijo);
    }

    let tasaMora = null;
    let diasGracia = 0;
    if (formConcepto.aplica_mora) {
      tasaMora = parseFloat(formConcepto.tasa_mora_mensual);
      diasGracia = parseInt(formConcepto.dias_gracia, 10);
    }

    try {
      const payload = {
        nombre_concepto: nombre,
        monto_fijo: montoFijo,
        aplica_mora: Boolean(formConcepto.aplica_mora),
        tasa_mora_mensual: formConcepto.aplica_mora ? tasaMora : null,
        dias_gracia: formConcepto.aplica_mora ? diasGracia : 0,
      };

      if (conceptoEditando) {
        await axios.put(`${conceptosRoute}/${conceptoEditando.id_concepto}`, payload, auth.config);
        toast.success("Concepto de cobro actualizado", toastOptions);
      } else {
        await axios.post(conceptosRoute, payload, auth.config);
        toast.success("Concepto de cobro creado", toastOptions);
      }
      setModalConcepto(false);
      setConceptoEditando(null);
      setErrorsConcepto({});
      fetchTodo();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al guardar concepto", toastOptions);
    }
  };

  const confirmarEliminarConcepto = async () => {
    if (!conceptoAEliminar) return;
    try {
      setEliminando(true);
      await axios.delete(`${conceptosRoute}/${conceptoAEliminar.id_concepto}`, auth.config);
      toast.success("Concepto eliminado exitosamente", toastOptions);
      setConceptoAEliminar(null);
      fetchTodo();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al eliminar concepto", toastOptions);
    } finally {
      setEliminando(false);
    }
  };

  // Tipos de Egreso
  const handleGuardarTipo = async (e) => {
    e.preventDefault();
    if (!validateTipo()) {
      toast.error("Por favor completa los campos de la categoría correctamente", toastOptions);
      return;
    }

    const nombre = formTipo.nombre_categoria.trim();
    try {
      const payload = { nombre_categoria: nombre };
      if (tipoEditando) {
        await axios.put(`${tipoEgresoRoute}/${tipoEditando.id_tipo_egreso}`, payload, auth.config);
        toast.success("Categoría actualizada", toastOptions);
      } else {
        await axios.post(tipoEgresoRoute, payload, auth.config);
        toast.success("Categoría creada", toastOptions);
      }
      setModalTipo(false);
      setTipoEditando(null);
      setErrorsTipo({});
      fetchTodo();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al guardar categoría", toastOptions);
    }
  };

  const confirmarEliminarTipo = async () => {
    if (!tipoAEliminar) return;
    try {
      setEliminando(true);
      await axios.delete(`${tipoEgresoRoute}/${tipoAEliminar.id_tipo_egreso}`, auth.config);
      toast.success("Categoría eliminada exitosamente", toastOptions);
      setTipoAEliminar(null);
      fetchTodo();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al eliminar categoría", toastOptions);
    } finally {
      setEliminando(false);
    }
  };

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        <SectionHeader>
          <div className="titles">
            <h1 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Settings size={22} /> Configuración y Tarifas del Mercado
            </h1>
            <p>Ajuste de tarifa de luz eléctrica, cuota de serenaje, multas y datos de la asociación</p>
          </div>
          {tab === "conceptos" && (
            <div className="actions">
              <CreateButton
                onClick={() => {
                  setConceptoEditando(null);
                  setFormConcepto({
                    nombre_concepto: "",
                    monto_fijo: "",
                    aplica_mora: false,
                    tasa_mora_mensual: "0.03",
                    dias_gracia: "5",
                  });
                  setErrorsConcepto({});
                  setModalConcepto(true);
                }}
              >
                + Nuevo Concepto de Cobro
              </CreateButton>
            </div>
          )}
          {tab === "tipos" && (
            <div className="actions">
              <CreateButton
                onClick={() => {
                  setTipoEditando(null);
                  setFormTipo({ nombre_categoria: "" });
                  setErrorsTipo({});
                  setModalTipo(true);
                }}
              >
                + Nueva Categoría de Egreso
              </CreateButton>
            </div>
          )}
        </SectionHeader>

        {/* Banner de Rol Presidente */}
        <RoleBanner>
          <div className="banner-info">
            <span className="icon">
              <Crown size={24} color={theme.colors.primary} />
            </span>
            <div>
              <h3>Panel Exclusivo de Presidencia (MicroSaaS)</h3>
              <p>
                Como Presidente, usted define el precio del kW de luz, monto de serenaje y sanciones que rigen en su mercado.
              </p>
            </div>
          </div>
          <span className="badge">Solo Presidente</span>
        </RoleBanner>

        <TabBar>
          <TabButton $active={tab === "parametros"} onClick={() => setTab("parametros")}>
            <Zap size={14} /> Tarifas y Parámetros del Mercado
          </TabButton>
          <TabButton $active={tab === "conceptos"} onClick={() => setTab("conceptos")}>
            <CreditCard size={14} /> Catálogo de Conceptos de Cobro
          </TabButton>
          <TabButton $active={tab === "tipos"} onClick={() => setTab("tipos")}>
            <TrendingDown size={14} /> Categorías de Gastos / Egresos
          </TabButton>
        </TabBar>

        {/* ─── PESTAÑA 1: PARÁMETROS GENERALES Y TARIFAS ─── */}
        {tab === "parametros" && (
          <form onSubmit={handleGuardarParametros}>
            <ConfigGrid>
              {/* Tarjeta 1: Energía Eléctrica (Luz) */}
              <ConfigCard>
                <div className="card-header">
                  <h3>
                    <Lightbulb size={18} color="#f59e0b" /> Tarifa de Energía Eléctrica
                  </h3>
                  <p>Precio aplicado a las lecturas de los medidores de las casetas</p>
                </div>

                <FormGroup>
                  <Label>Precio por 1 Kilovatio-Hora (Bs / kWh) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formAsoc.precio_kwh}
                    $hasError={!!errorsAsoc.precio_kwh}
                    onChange={(e) => {
                      setFormAsoc({ ...formAsoc, precio_kwh: e.target.value });
                      if (errorsAsoc.precio_kwh) setErrorsAsoc((p) => ({ ...p, precio_kwh: undefined }));
                    }}
                  />
                  {errorsAsoc.precio_kwh ? (
                    <ErrorText>{errorsAsoc.precio_kwh}</ErrorText>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                      Actualmente: <strong>{parseFloat(formAsoc.precio_kwh || 0).toFixed(2)} Bs</strong> por cada 1 kWh consumido.
                    </span>
                  )}
                </FormGroup>

                <div
                  style={{
                    backgroundColor: "rgba(14, 165, 233, 0.08)",
                    border: "1px dashed rgba(14, 165, 233, 0.3)",
                    padding: "0.75rem",
                    borderRadius: theme.radius.sm,
                    fontSize: "0.78rem",
                    color: theme.colors.textMuted,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <Info size={16} color="#38bdf8" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>Al modificar esta tarifa, todas las nuevas lecturaciones que registre la Secretaria de Hacienda usarán automáticamente este precio por kWh.</span>
                </div>
              </ConfigCard>

              {/* Tarjeta 2: Serenaje y Seguridad */}
              <ConfigCard>
                <div className="card-header">
                  <h3>
                    <ShieldCheck size={18} color="#10b981" /> Serenaje y Seguridad Nocturna
                  </h3>
                  <p>Cobro mensual recurrente generado automáticamente</p>
                </div>

                <FormGroup>
                  <Label>Cuota Mensual por Caseta (Bs) *</Label>
                  <Input
                    type="number"
                    step="0.50"
                    min="0"
                    value={formAsoc.monto_serenaje}
                    $hasError={!!errorsAsoc.monto_serenaje}
                    onChange={(e) => {
                      setFormAsoc({ ...formAsoc, monto_serenaje: e.target.value });
                      if (errorsAsoc.monto_serenaje) setErrorsAsoc((p) => ({ ...p, monto_serenaje: undefined }));
                    }}
                  />
                  {errorsAsoc.monto_serenaje && <ErrorText>{errorsAsoc.monto_serenaje}</ErrorText>}
                </FormGroup>

                <FormGroup>
                  <Label>Día del Mes para Generación Automática (1 - 28) *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    value={formAsoc.dia_corte_serenaje}
                    $hasError={!!errorsAsoc.dia_corte_serenaje}
                    onChange={(e) => {
                      setFormAsoc({ ...formAsoc, dia_corte_serenaje: e.target.value });
                      if (errorsAsoc.dia_corte_serenaje) setErrorsAsoc((p) => ({ ...p, dia_corte_serenaje: undefined }));
                    }}
                  />
                  {errorsAsoc.dia_corte_serenaje ? (
                    <ErrorText>{errorsAsoc.dia_corte_serenaje}</ErrorText>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                      El sistema emite los cargos automáticamente a las 00:00 del día configurado (por defecto día 5).
                    </span>
                  )}
                </FormGroup>
              </ConfigCard>

              {/* Tarjeta 3: Sanciones por Inasistencia */}
              <ConfigCard>
                <div className="card-header">
                  <h3>
                    <AlertTriangle size={18} color="#ef4444" /> Sanciones y Multas Sugeridas
                  </h3>
                  <p>Montos sugeridos por inasistencia al crear asambleas y marchas</p>
                </div>

                <FormGroup>
                  <Label>Multa por Falta a Asamblea General (Bs) *</Label>
                  <Input
                    type="number"
                    step="0.50"
                    min="0"
                    value={formAsoc.multa_asamblea}
                    $hasError={!!errorsAsoc.multa_asamblea}
                    onChange={(e) => {
                      setFormAsoc({ ...formAsoc, multa_asamblea: e.target.value });
                      if (errorsAsoc.multa_asamblea) setErrorsAsoc((p) => ({ ...p, multa_asamblea: undefined }));
                    }}
                  />
                  {errorsAsoc.multa_asamblea && <ErrorText>{errorsAsoc.multa_asamblea}</ErrorText>}
                </FormGroup>

                <FormGroup>
                  <Label>Multa por Falta a Marcha o Movilización (Bs) *</Label>
                  <Input
                    type="number"
                    step="0.50"
                    min="0"
                    value={formAsoc.multa_marcha}
                    $hasError={!!errorsAsoc.multa_marcha}
                    onChange={(e) => {
                      setFormAsoc({ ...formAsoc, multa_marcha: e.target.value });
                      if (errorsAsoc.multa_marcha) setErrorsAsoc((p) => ({ ...p, multa_marcha: undefined }));
                    }}
                  />
                  {errorsAsoc.multa_marcha && <ErrorText>{errorsAsoc.multa_marcha}</ErrorText>}
                </FormGroup>
              </ConfigCard>

              {/* Tarjeta 4: Datos Institucionales */}
              <ConfigCard>
                <div className="card-header">
                  <h3>
                    <Building size={18} color="#0ea5e9" /> Datos de la Asociación de Mercado
                  </h3>
                  <p>Información que aparece en los recibos oficiales y reportes PDF</p>
                </div>

                <FormGroup>
                  <Label>Nombre del Mercado / Asociación *</Label>
                  <Input
                    value={formAsoc.nombre_mercado}
                    $hasError={!!errorsAsoc.nombre_mercado}
                    onChange={(e) => {
                      setFormAsoc({ ...formAsoc, nombre_mercado: e.target.value });
                      if (errorsAsoc.nombre_mercado) setErrorsAsoc((p) => ({ ...p, nombre_mercado: undefined }));
                    }}
                  />
                  {errorsAsoc.nombre_mercado && <ErrorText>{errorsAsoc.nombre_mercado}</ErrorText>}
                </FormGroup>

                <FormGroup>
                  <Label>Dirección / Ubicación</Label>
                  <Input
                    value={formAsoc.direccion}
                    onChange={(e) => setFormAsoc({ ...formAsoc, direccion: e.target.value })}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Teléfono de Contacto</Label>
                  <Input
                    value={formAsoc.telefono}
                    onChange={(e) => setFormAsoc({ ...formAsoc, telefono: e.target.value })}
                  />
                </FormGroup>
              </ConfigCard>
            </ConfigGrid>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <CreateButton type="submit" disabled={guardandoParametros} style={{ padding: "0.85rem 2rem", fontSize: "1rem", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <Save size={16} />
                {guardandoParametros ? "Guardando..." : "Guardar Todos los Parámetros"}
              </CreateButton>
            </div>
          </form>
        )}

        {/* ─── PESTAÑA 2: CONCEPTOS DE COBRO ─── */}
        {tab === "conceptos" && (
          <TableCard>
            <TableResponsiveWrapper>
              <TableWrapper>
                <TableHead>
                  <tr>
                    <th>Concepto de Cobro</th>
                    <th>Monto Fijo</th>
                    <th>¿Aplica Mora?</th>
                    <th>Tasa Mora Mensual</th>
                    <th>Días de Gracia</th>
                    <th>Acciones</th>
                  </tr>
                </TableHead>
                <TableBody>
                  {conceptos.map((c) => (
                    <TableRow key={c.id_concepto}>
                      <TableCell><strong>{c.nombre_concepto}</strong></TableCell>
                      <TableCell>
                        {c.monto_fijo ? `${parseFloat(c.monto_fijo).toFixed(2)} Bs` : "Variable (ej. lectura medidor)"}
                      </TableCell>
                      <TableCell>
                        <span style={{ color: c.aplica_mora ? theme.colors.warning : theme.colors.textMuted, fontWeight: 600 }}>
                          {c.aplica_mora ? "Sí" : "No"}
                        </span>
                      </TableCell>
                      <TableCell>{c.tasa_mora_mensual ? `${(parseFloat(c.tasa_mora_mensual) * 100).toFixed(1)}%` : "-"}</TableCell>
                      <TableCell>{c.dias_gracia ? `${c.dias_gracia} días` : "-"}</TableCell>
                      <TableCell>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <EditButton
                            onClick={() => {
                              setConceptoEditando(c);
                              setFormConcepto({
                                nombre_concepto: c.nombre_concepto,
                                monto_fijo: c.monto_fijo || "",
                                aplica_mora: !!c.aplica_mora,
                                tasa_mora_mensual: c.tasa_mora_mensual || "0.03",
                                dias_gracia: c.dias_gracia || "5",
                              });
                              setModalConcepto(true);
                            }}
                          >
                            Editar
                          </EditButton>
                          <DeleteButton onClick={() => setConceptoAEliminar(c)}>Eliminar</DeleteButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableWrapper>
            </TableResponsiveWrapper>
          </TableCard>
        )}

        {/* ─── PESTAÑA 3: CATEGORÍAS DE EGRESOS ─── */}
        {tab === "tipos" && (
          <TableCard>
            <TableResponsiveWrapper>
              <TableWrapper>
                <TableHead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre de la Categoría de Egreso</th>
                    <th>Acciones</th>
                  </tr>
                </TableHead>
                <TableBody>
                  {tiposEgreso.map((t) => (
                    <TableRow key={t.id_tipo_egreso}>
                      <TableCell>#{t.id_tipo_egreso}</TableCell>
                      <TableCell><strong>{t.nombre_categoria}</strong></TableCell>
                      <TableCell>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <EditButton
                            onClick={() => {
                              setTipoEditando(t);
                              setFormTipo({ nombre_categoria: t.nombre_categoria });
                              setModalTipo(true);
                            }}
                          >
                            Editar
                          </EditButton>
                          <DeleteButton onClick={() => setTipoAEliminar(t)}>Eliminar</DeleteButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableWrapper>
            </TableResponsiveWrapper>
          </TableCard>
        )}
      </ContentContainer>

      {/* Modal Concepto de Cobro */}
      <Modal
        isOpen={modalConcepto}
        onClose={() => {
          setModalConcepto(false);
          setConceptoEditando(null);
        }}
        title={conceptoEditando ? "Editar Concepto de Cobro" : "Nuevo Concepto de Cobro"}
        maxWidth="520px"
      >
        <form onSubmit={handleGuardarConcepto}>
          <FormGroup>
            <Label>Nombre del Concepto *</Label>
            <Input
              placeholder="Ej. Alquiler de Caseta / Traspaso / Serenaje"
              value={formConcepto.nombre_concepto}
              $hasError={!!errorsConcepto.nombre_concepto}
              onChange={(e) => {
                setFormConcepto({ ...formConcepto, nombre_concepto: e.target.value });
                if (errorsConcepto.nombre_concepto) setErrorsConcepto((p) => ({ ...p, nombre_concepto: undefined }));
              }}
            />
            {errorsConcepto.nombre_concepto && <ErrorText>{errorsConcepto.nombre_concepto}</ErrorText>}
          </FormGroup>
          <FormGroup>
            <Label>Monto Fijo en Bs (Dejar vacío si es variable como la luz)</Label>
            <Input
              type="number"
              step="0.50"
              placeholder="Ej. 20.00"
              value={formConcepto.monto_fijo}
              $hasError={!!errorsConcepto.monto_fijo}
              onChange={(e) => {
                setFormConcepto({ ...formConcepto, monto_fijo: e.target.value });
                if (errorsConcepto.monto_fijo) setErrorsConcepto((p) => ({ ...p, monto_fijo: undefined }));
              }}
            />
            {errorsConcepto.monto_fijo && <ErrorText>{errorsConcepto.monto_fijo}</ErrorText>}
          </FormGroup>
          <FormGroup style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
            <input
              type="checkbox"
              id="aplicaMora"
              checked={formConcepto.aplica_mora}
              onChange={(e) => setFormConcepto({ ...formConcepto, aplica_mora: e.target.checked })}
            />
            <Label htmlFor="aplicaMora" style={{ cursor: "pointer", textTransform: "none" }}>
              Aplica recargo / mora por retraso
            </Label>
          </FormGroup>
          {formConcepto.aplica_mora && (
            <>
              <FormGroup>
                <Label>Tasa de Mora Mensual (Ej. 0.05 para 5%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formConcepto.tasa_mora_mensual}
                  $hasError={!!errorsConcepto.tasa_mora_mensual}
                  onChange={(e) => {
                    setFormConcepto({ ...formConcepto, tasa_mora_mensual: e.target.value });
                    if (errorsConcepto.tasa_mora_mensual) setErrorsConcepto((p) => ({ ...p, tasa_mora_mensual: undefined }));
                  }}
                />
                {errorsConcepto.tasa_mora_mensual && <ErrorText>{errorsConcepto.tasa_mora_mensual}</ErrorText>}
              </FormGroup>
              <FormGroup>
                <Label>Días de Gracia antes de aplicar mora</Label>
                <Input
                  type="number"
                  min="0"
                  value={formConcepto.dias_gracia}
                  $hasError={!!errorsConcepto.dias_gracia}
                  onChange={(e) => {
                    setFormConcepto({ ...formConcepto, dias_gracia: e.target.value });
                    if (errorsConcepto.dias_gracia) setErrorsConcepto((p) => ({ ...p, dias_gracia: undefined }));
                  }}
                />
                {errorsConcepto.dias_gracia && <ErrorText>{errorsConcepto.dias_gracia}</ErrorText>}
              </FormGroup>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
            <ActionButton
              type="button"
              onClick={() => {
                setModalConcepto(false);
                setConceptoEditando(null);
                setErrorsConcepto({});
              }}
            >
              Cancelar
            </ActionButton>
            <CreateButton type="submit">Guardar</CreateButton>
          </div>
        </form>
      </Modal>

      {/* Modal Tipo Egreso */}
      <Modal
        isOpen={modalTipo}
        onClose={() => {
          setModalTipo(false);
          setTipoEditando(null);
          setErrorsTipo({});
        }}
        title={tipoEditando ? "Editar Categoría de Egreso" : "Nueva Categoría de Egreso"}
        maxWidth="500px"
      >
        <form onSubmit={handleGuardarTipo}>
          <FormGroup>
            <Label>Nombre de la Categoría *</Label>
            <Input
              placeholder="Ej. Reparación de Baños / Papelería / Limpieza"
              value={formTipo.nombre_categoria}
              $hasError={!!errorsTipo.nombre_categoria}
              onChange={(e) => {
                setFormTipo({ ...formTipo, nombre_categoria: e.target.value });
                if (errorsTipo.nombre_categoria) setErrorsTipo((p) => ({ ...p, nombre_categoria: undefined }));
              }}
            />
            {errorsTipo.nombre_categoria && <ErrorText>{errorsTipo.nombre_categoria}</ErrorText>}
          </FormGroup>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
            <ActionButton
              type="button"
              onClick={() => {
                setModalTipo(false);
                setTipoEditando(null);
                setErrorsTipo({});
              }}
            >
              Cancelar
            </ActionButton>
            <CreateButton type="submit">Guardar</CreateButton>
          </div>
        </form>
      </Modal>

      {/* ConfirmModal para eliminar concepto */}
      <ConfirmModal
        isOpen={Boolean(conceptoAEliminar)}
        onClose={() => setConceptoAEliminar(null)}
        onConfirm={confirmarEliminarConcepto}
        title="Eliminar Concepto de Cobro"
        message={`¿Está seguro de eliminar el concepto "${conceptoAEliminar?.nombre_concepto}"?`}
        confirmText="Sí, Eliminar"
        isDanger={true}
        loading={eliminando}
      />

      {/* ConfirmModal para eliminar categoría de egreso */}
      <ConfirmModal
        isOpen={Boolean(tipoAEliminar)}
        onClose={() => setTipoAEliminar(null)}
        onConfirm={confirmarEliminarTipo}
        title="Eliminar Categoría de Egreso"
        message={`¿Está seguro de eliminar la categoría "${tipoAEliminar?.nombre_categoria}"?`}
        confirmText="Sí, Eliminar"
        isDanger={true}
        loading={eliminando}
      />
    </PageContainer>
  );
}

export default ConfiguracionPage;
