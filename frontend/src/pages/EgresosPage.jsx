import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import { Plus, Lock, Trash2, AlertCircle } from "lucide-react";
import Sidebar from "../components/Sidebar";
import useAuth from "../hooks/authHooks";
import useDebounce from "../hooks/useDebounce";
import toastOptions from "../utils/toastOptions";
import theme from "../styles/theme";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import ROLES from "../utils/roles";
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
  CreateButton,
  SearchInput,
} from "../styles/commonStyles";
import { egresosRoute, tipoEgresoRoute } from "../utils/APIroutes";
import { formatDate } from "../utils/dateUtils";

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
    box-shadow: 0 0 0 2px ${({ $hasError }) => ($hasError ? "rgba(239, 68, 68, 0.2)" : "rgba(14, 165, 233, 0.2)")};
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

  &:focus {
    outline: none;
    border-color: ${({ $hasError }) => ($hasError ? theme.colors.danger : theme.colors.primary)};
  }

  option {
    background-color: ${theme.colors.bgCard};
  }
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
  padding: 0.65rem 1.25rem;
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
  id_tipo_egreso: "",
  monto: "",
  fecha_gasto: new Date().toISOString().split("T")[0],
  detalle: "",
};

const confirmModalInitial = {
  isOpen: false,
  title: "",
  message: "",
  confirmText: "Eliminar",
  requireReason: false,
  onConfirm: null,
  loading: false,
};

function EgresosPage() {
  const { auth } = useAuth();
  const [egresos, setEgresos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const debouncedBusqueda = useDebounce(busqueda, 300);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formData, setFormData] = useState(estadoInicial);
  const [formErrors, setFormErrors] = useState({});
  const [guardando, setGuardando] = useState(false);

  // Modal moderno de confirmación
  const [confirmModalData, setConfirmModalData] = useState(confirmModalInitial);

  const fetchDatos = async () => {
    try {
      setLoading(true);
      const resEgresos = await axios.get(egresosRoute, auth.config);
      setEgresos(Array.isArray(resEgresos.data) ? resEgresos.data : resEgresos.data.egresos || []);

      const resTipos = await axios.get(tipoEgresoRoute, auth.config);
      const listaTipos = Array.isArray(resTipos.data) ? resTipos.data : resTipos.data.tipos || [];
      setTipos(listaTipos);
      if (listaTipos.length > 0) {
        setFormData((prev) => ({ ...prev, id_tipo_egreso: listaTipos[0].id_tipo_egreso }));
      }
    } catch (err) {
      toast.error(
        err.response?.data?.mensaje || "Error al cargar los egresos",
        toastOptions
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.config) fetchDatos();
  }, [auth]);

  const validate = () => {
    const errs = {};
    if (!formData.id_tipo_egreso) {
      errs.id_tipo_egreso = "Seleccione una categoría de gasto.";
    }
    const montoNum = parseFloat(formData.monto);
    if (!formData.monto || isNaN(montoNum) || montoNum <= 0) {
      errs.monto = "El monto debe ser un valor positivo mayor a 0 Bs.";
    }
    if (!formData.fecha_gasto) {
      errs.fecha_gasto = "La fecha del gasto es obligatoria.";
    }
    if (!formData.detalle || !formData.detalle.trim()) {
      errs.detalle = "El detalle o motivo del gasto es obligatorio.";
    } else if (formData.detalle.trim().length < 3) {
      errs.detalle = "El detalle debe contener al menos 3 caracteres.";
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Por favor revise los campos con error en el formulario.", toastOptions);
      return;
    }

    try {
      setGuardando(true);
      await axios.post(
        egresosRoute,
        {
          ...formData,
          monto: parseFloat(formData.monto),
          id_tipo_egreso: parseInt(formData.id_tipo_egreso, 10),
          detalle: formData.detalle.trim(),
        },
        auth.config
      );
      toast.success("Gasto registrado correctamente en el libro de caja", toastOptions);
      setModalAbierto(false);
      setFormData(estadoInicial);
      setFormErrors({});
      fetchDatos();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al registrar gasto", toastOptions);
    } finally {
      setGuardando(false);
    }
  };

  const handleAnular = (egreso) => {
    setConfirmModalData({
      isOpen: true,
      title: "¿Anular Egreso?",
      message: `¿Está seguro de anular el gasto de ${parseFloat(egreso.monto || 0).toFixed(2)} Bs ("${egreso.detalle}")? Esta acción revertirá el registro en el libro mayor.`,
      confirmText: "Anular Egreso",
      requireReason: true,
      reasonPlaceholder: "Motivo de la anulación (mínimo 5 caracteres)...",
      loading: false,
      onConfirm: async (motivo) => {
        try {
          setConfirmModalData((prev) => ({ ...prev, loading: true }));
          await axios.delete(`${egresosRoute}/${egreso.id_egreso}`, auth.config);
          toast.success("Egreso anulado correctamente", toastOptions);
          setConfirmModalData(confirmModalInitial);
          fetchDatos();
        } catch (err) {
          toast.error(err.response?.data?.mensaje || "Error al anular egreso", toastOptions);
          setConfirmModalData((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  const egresosFiltrados = useMemo(() => {
    const q = debouncedBusqueda.toLowerCase().trim();
    if (!q) return egresos;
    return egresos.filter((eg) => {
      const detalle = (eg.detalle || "").toLowerCase();
      const cat = (eg.tipo_egreso?.nombre_categoria || eg.TipoEgreso?.nombre_categoria || "").toLowerCase();
      return detalle.includes(q) || cat.includes(q);
    });
  }, [egresos, debouncedBusqueda]);

  const totalGastos = useMemo(() => {
    return egresosFiltrados.reduce((acc, eg) => {
      const m = parseFloat(eg.monto || 0);
      return acc + (isNaN(m) ? 0 : m);
    }, 0);
  }, [egresosFiltrados]);

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        <SectionHeader>
          <div className="titles">
            <h1>Egresos y Gastos de la Asociación</h1>
            <p>Salidas de caja: gastos de oficina, viáticos para directiva, reparaciones y limpieza</p>
          </div>
          <div className="actions">
            <CreateButton
              onClick={() => {
                setFormData({
                  ...estadoInicial,
                  id_tipo_egreso: tipos[0]?.id_tipo_egreso || "",
                  fecha_gasto: new Date().toISOString().split("T")[0],
                });
                setFormErrors({});
                setModalAbierto(true);
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Plus size={16} />
              <span>Registrar Salida de Dinero</span>
            </CreateButton>
          </div>
        </SectionHeader>

        <div style={{ background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`, padding: "1.25rem", borderRadius: theme.radius.lg, marginBottom: "1rem" }}>
          <span style={{ fontSize: "0.8rem", color: theme.colors.textMuted, textTransform: "uppercase" }}>Total Egresos Filtrados</span>
          <h2 style={{ fontSize: "1.8rem", color: theme.colors.danger, marginTop: "0.3rem" }}>
            {totalGastos.toFixed(2)} Bs
          </h2>
        </div>

        <TableCard>
          <TableToolbar>
            <SearchInput
              placeholder="Buscar por detalle o categoría de gasto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <span style={{ color: theme.colors.textMuted, fontSize: "0.875rem" }}>
              {egresosFiltrados.length} registro(s)
            </span>
          </TableToolbar>
          <TableResponsiveWrapper>
            <TableWrapper>
              <TableHead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Detalle del Gasto</th>
                  <th>Registrado Por</th>
                  <th>Monto (Bs)</th>
                  <th>Acción</th>
                </tr>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                      Cargando egresos...
                    </TableCell>
                  </TableRow>
                ) : egresosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                      No se han registrado salidas de dinero
                    </TableCell>
                  </TableRow>
                ) : (
                  egresosFiltrados.map((eg) => (
                    <TableRow key={eg.id_egreso}>
                      <TableCell>{formatDate(eg.fecha_gasto)}</TableCell>
                      <TableCell>
                        <span style={{ padding: "0.25rem 0.6rem", background: "rgba(99, 102, 241, 0.15)", color: "#818cf8", borderRadius: theme.radius.sm, fontWeight: 600, fontSize: "0.8rem" }}>
                          {eg.tipo_egreso?.nombre_categoria || eg.TipoEgreso?.nombre_categoria || "Gasto"}
                        </span>
                      </TableCell>
                      <TableCell><strong>{eg.detalle}</strong></TableCell>
                      <TableCell>{eg.usuario?.username || eg.Usuario?.username || "Administración"}</TableCell>
                      <TableCell style={{ fontWeight: 700, color: theme.colors.danger }}>
                        - {parseFloat(eg.monto || 0).toFixed(2)} Bs
                      </TableCell>
                      <TableCell>
                        {[ROLES.ADMIN_ASOCIACION, ROLES.PRESIDENTE, ROLES.SUPERADMIN_SAAS].includes(auth?.rol) ? (
                          <button
                            type="button"
                            onClick={() => handleAnular(eg)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              padding: "0.3rem 0.65rem",
                              borderRadius: theme.radius.sm,
                              border: "1px solid rgba(239, 68, 68, 0.35)",
                              backgroundColor: "rgba(239, 68, 68, 0.1)",
                              color: "#f87171",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                            title="Anular egreso y revertir en caja"
                          >
                            <Trash2 size={13} />
                            <span>Anular</span>
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: theme.colors.textMuted,
                              background: "rgba(255, 255, 255, 0.05)",
                              padding: "0.25rem 0.6rem",
                              borderRadius: theme.radius.sm,
                              border: `1px solid ${theme.colors.border}`,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                            }}
                            title="Registro contable inmutable por trazabilidad financiera"
                          >
                            <Lock size={13} />
                            <span>Inmutable</span>
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </TableWrapper>
          </TableResponsiveWrapper>
        </TableCard>
      </ContentContainer>

      {/* Modal Registrar Gasto */}
      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title="Registrar Salida de Dinero (Egreso)"
        maxWidth="520px"
      >
        <form onSubmit={handleSubmit} noValidate>
          <FormGroup>
            <Label>Categoría de Gasto *</Label>
            <Select
              value={formData.id_tipo_egreso}
              $hasError={Boolean(formErrors.id_tipo_egreso)}
              onChange={(e) => {
                setFormData({ ...formData, id_tipo_egreso: e.target.value });
                if (formErrors.id_tipo_egreso) setFormErrors({ ...formErrors, id_tipo_egreso: "" });
              }}
            >
              <option value="">-- Seleccionar Categoría --</option>
              {tipos.map((t) => (
                <option key={t.id_tipo_egreso} value={t.id_tipo_egreso}>
                  {t.nombre_categoria}
                </option>
              ))}
            </Select>
            {formErrors.id_tipo_egreso && <ErrorText>{formErrors.id_tipo_egreso}</ErrorText>}
          </FormGroup>
          <FormGroup>
            <Label>Monto Gastado (Bs) *</Label>
            <Input
              type="number"
              step="0.50"
              min="0.01"
              placeholder="Ej. 150.00"
              value={formData.monto}
              $hasError={Boolean(formErrors.monto)}
              onChange={(e) => {
                setFormData({ ...formData, monto: e.target.value });
                if (formErrors.monto) setFormErrors({ ...formErrors, monto: "" });
              }}
            />
            {formErrors.monto && <ErrorText>{formErrors.monto}</ErrorText>}
          </FormGroup>
          <FormGroup>
            <Label>Fecha del Gasto *</Label>
            <Input
              type="date"
              value={formData.fecha_gasto}
              $hasError={Boolean(formErrors.fecha_gasto)}
              onChange={(e) => {
                setFormData({ ...formData, fecha_gasto: e.target.value });
                if (formErrors.fecha_gasto) setFormErrors({ ...formErrors, fecha_gasto: "" });
              }}
            />
            {formErrors.fecha_gasto && <ErrorText>{formErrors.fecha_gasto}</ErrorText>}
          </FormGroup>
          <FormGroup>
            <Label>Detalle / Motivo del Gasto *</Label>
            <Input
              placeholder="Ej. Viáticos reunión directiva / Compra de focos y cables pasillo"
              value={formData.detalle}
              $hasError={Boolean(formErrors.detalle)}
              onChange={(e) => {
                setFormData({ ...formData, detalle: e.target.value });
                if (formErrors.detalle) setFormErrors({ ...formErrors, detalle: "" });
              }}
            />
            {formErrors.detalle && <ErrorText>{formErrors.detalle}</ErrorText>}
          </FormGroup>
          <FormActions>
            <CancelButton type="button" onClick={() => setModalAbierto(false)}>
              Cancelar
            </CancelButton>
            <CreateButton type="submit" disabled={guardando}>
              {guardando ? "Registrando..." : "Guardar Salida"}
            </CreateButton>
          </FormActions>
        </form>
      </Modal>

      {/* ─── MODAL DE CONFIRMACIÓN / ELIMINACIÓN MODERNO ─── */}
      <ConfirmModal
        isOpen={confirmModalData.isOpen}
        title={confirmModalData.title}
        message={confirmModalData.message}
        confirmText={confirmModalData.confirmText}
        cancelText="Volver"
        requireReason={confirmModalData.requireReason}
        onConfirm={confirmModalData.onConfirm}
        onClose={() => setConfirmModalData(confirmModalInitial)}
        loading={confirmModalData.loading}
        isDanger={true}
      />
    </PageContainer>
  );
}

export default EgresosPage;
