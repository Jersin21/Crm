import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import Sidebar from "../components/Sidebar";
import useAuth from "../hooks/authHooks";
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
  CreateButton,
  DeleteButton,
  SearchInput,
} from "../styles/commonStyles";
import { egresosRoute, tipoEgresoRoute } from "../utils/APIroutes";
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
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
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

  option { background-color: ${theme.colors.bgCard}; }
`;

const estadoInicial = {
  id_tipo_egreso: "",
  monto: "",
  fecha_gasto: new Date().toISOString().split("T")[0],
  detalle: "",
};

function EgresosPage() {
  const { auth } = useAuth();
  const [egresos, setEgresos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  // Modo Tostadora: debounce de 300ms para evitar saturar la CPU al escribir
  const debouncedBusqueda = useDebounce(busqueda, 300);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formData, setFormData] = useState(estadoInicial);
  const [guardando, setGuardando] = useState(false);

  // Modal moderno de confirmación / eliminación
  const [confirmModalData, setConfirmModalData] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Eliminar",
    requireReason: false,
    onConfirm: null,
    loading: false,
  });

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
      toast.error("Error al cargar los egresos", toastOptions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.config) fetchDatos();
  }, [auth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.monto || !formData.detalle.trim()) {
      toast.error("Completa el monto y detalle del gasto", toastOptions);
      return;
    }
    try {
      setGuardando(true);
      await axios.post(
        egresosRoute,
        {
          ...formData,
          monto: parseFloat(formData.monto),
          id_tipo_egreso: parseInt(formData.id_tipo_egreso),
        },
        auth.config
      );
      toast.success("Gasto registrado correctamente en el libro de caja", toastOptions);
      setModalAbierto(false);
      setFormData(estadoInicial);
      fetchDatos();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al registrar gasto", toastOptions);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (egreso) => {
    setConfirmModalData({
      isOpen: true,
      title: "Eliminar Egreso de Caja",
      message: `¿Está seguro de eliminar el registro de egreso por Bs. ${parseFloat(egreso.monto || 0).toFixed(2)} correspondiente a "${egreso.detalle}"? Esta acción no se puede deshacer.`,
      confirmText: "Sí, Eliminar Egreso",
      requireReason: false,
      onConfirm: async () => {
        try {
          setConfirmModalData((prev) => ({ ...prev, loading: true }));
          await axios.delete(`${egresosRoute}/${egreso.id_egreso}`, auth.config);
          toast.success("Egreso eliminado correctamente", toastOptions);
          setConfirmModalData({ isOpen: false });
          fetchDatos();
        } catch (err) {
          toast.error("Error al eliminar egreso", toastOptions);
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
    return egresosFiltrados.reduce((acc, eg) => acc + parseFloat(eg.monto || 0), 0);
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
                setModalAbierto(true);
              }}
            >
              + Registrar Salida de Dinero
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
                        - {parseFloat(eg.monto).toFixed(2)} Bs
                      </TableCell>
                      <TableCell>
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
                            gap: "0.25rem"
                          }}
                          title="Registro contable inmutable por trazabilidad financiera"
                        >
                          🔒 Inmutable
                        </span>
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
      {modalAbierto && (
        <ModalOverlay onClick={(e) => e.target === e.currentTarget && setModalAbierto(false)}>
          <ModalCard>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.25rem", color: theme.colors.textMain }}>Registrar Salida de Dinero (Egreso)</h2>
              <button style={{ background: "none", border: "none", color: "#aaa", fontSize: "1.5rem", cursor: "pointer" }} onClick={() => setModalAbierto(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Label>Categoría de Gasto *</Label>
                <Select
                  value={formData.id_tipo_egreso}
                  onChange={(e) => setFormData({ ...formData, id_tipo_egreso: e.target.value })}
                  required
                >
                  {tipos.map((t) => (
                    <option key={t.id_tipo_egreso} value={t.id_tipo_egreso}>
                      {t.nombre_categoria}
                    </option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Monto Gastado (Bs) *</Label>
                <Input
                  type="number"
                  step="0.50"
                  placeholder="Ej. 150.00"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Fecha del Gasto *</Label>
                <Input
                  type="date"
                  value={formData.fecha_gasto}
                  onChange={(e) => setFormData({ ...formData, fecha_gasto: e.target.value })}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Detalle / Motivo del Gasto *</Label>
                <Input
                  placeholder="Ej. Viáticos reunión directiva / Compra de focos y cables pasillo"
                  value={formData.detalle}
                  onChange={(e) => setFormData({ ...formData, detalle: e.target.value })}
                  required
                />
              </FormGroup>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button
                  type="button"
                  style={{ background: "none", border: `1px solid ${theme.colors.border}`, color: "#aaa", padding: "0.6rem 1.2rem", borderRadius: theme.radius.md, cursor: "pointer" }}
                  onClick={() => setModalAbierto(false)}
                >
                  Cancelar
                </button>
                <CreateButton type="submit" disabled={guardando}>
                  {guardando ? "Registrando..." : "Guardar Salida"}
                </CreateButton>
              </div>
            </form>
          </ModalCard>
        </ModalOverlay>
      )}

      {/* ─── MODAL DE CONFIRMACIÓN / ELIMINACIÓN MODERNO ─── */}
      <ConfirmModal
        isOpen={confirmModalData.isOpen}
        title={confirmModalData.title}
        message={confirmModalData.message}
        confirmText={confirmModalData.confirmText}
        cancelText="Volver"
        requireReason={confirmModalData.requireReason}
        onConfirm={confirmModalData.onConfirm}
        onClose={() => setConfirmModalData({ isOpen: false })}
        loading={confirmModalData.loading}
        danger={true}
      />
    </PageContainer>
  );
}

export default EgresosPage;
