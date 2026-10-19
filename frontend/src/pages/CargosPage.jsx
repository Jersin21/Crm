import React, { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import Sidebar from "../components/Sidebar";
import useAuth from "../hooks/authHooks";
import toastOptions from "../utils/toastOptions";
import theme from "../styles/theme";
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
  StatusBadge,
  SearchInput,
  ActionButton,
  DeleteButton,
} from "../styles/commonStyles";
import { cargosRoute } from "../utils/APIroutes";
import { formatDate } from "../utils/dateUtils";

const FilterSelect = styled.select`
  padding: 0.625rem 1rem;
  background-color: ${theme.colors.bgInput};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }

  option { background-color: ${theme.colors.bgCard}; }
`;

function CargosPage() {
  const { auth } = useAuth();
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("");
  const [calculandoMora, setCalculandoMora] = useState(false);

  const fetchCargos = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroPeriodo) params.periodo = filtroPeriodo;

      const { data } = await axios.get(cargosRoute, {
        ...auth.config,
        params,
      });
      setCargos(Array.isArray(data) ? data : data.cargos || []);
    } catch (err) {
      toast.error("Error al cargar los cargos y deudas", toastOptions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.config) fetchCargos();
  }, [auth, filtroEstado, filtroPeriodo]);

  const handleCalcularMoras = async () => {
    if (!window.confirm("¿Deseas ejecutar el cálculo automático de moras para todas las deudas vencidas?")) return;
    try {
      setCalculandoMora(true);
      const { data } = await axios.post(`${cargosRoute}/calcular-moras`, {}, auth.config);
      toast.success(data.mensaje || "Moras calculadas y actualizadas correctamente", toastOptions);
      fetchCargos();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al calcular moras", toastOptions);
    } finally {
      setCalculandoMora(false);
    }
  };

  const handleAnular = async (cargo) => {
    if (!window.confirm(`¿Deseas anular el cargo de ${cargo.detalle || "este concepto"}?`)) return;
    try {
      await axios.put(`${cargosRoute}/${cargo.id_cargo}/anular`, {}, auth.config);
      toast.success("Cargo anulado correctamente", toastOptions);
      fetchCargos();
    } catch (err) {
      toast.error("Error al anular cargo", toastOptions);
    }
  };

  const cargosFiltrados = cargos.filter((c) => {
    const socio = c.socio || c.Socio || {};
    const persona = socio.persona || socio.Persona || {};
    const nombre = `${persona.nombres || ""} ${persona.apellidos || ""}`.toLowerCase();
    const caseta = String(socio.nro_caseta || "").toLowerCase();
    const concepto = (c.concepto?.nombre_concepto || c.ConceptoCobro?.nombre_concepto || "").toLowerCase();
    const q = busqueda.toLowerCase();
    return nombre.includes(q) || caseta.includes(q) || concepto.includes(q);
  });

  const totalSaldoPendiente = cargosFiltrados.reduce((acc, c) => acc + parseFloat(c.saldo_capital_pendiente || 0), 0);
  const totalMoraAcumulada = cargosFiltrados.reduce((acc, c) => acc + parseFloat(c.monto_mora_acumulada || 0), 0);

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        <SectionHeader>
          <div className="titles">
            <h1>Cuentas por Cobrar (Deudas y Moras)</h1>
            <p>Monitoreo general de saldos pendientes, moras por retraso y multas</p>
          </div>
          <div className="actions">
            <ActionButton
              $variant="warning"
              disabled={calculandoMora}
              onClick={handleCalcularMoras}
            >
              {calculandoMora ? "Calculando..." : "⚡ Calcular Moras del Mes"}
            </ActionButton>
          </div>
        </SectionHeader>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`, padding: "1.25rem", borderRadius: theme.radius.lg }}>
            <span style={{ fontSize: "0.8rem", color: theme.colors.textMuted, textTransform: "uppercase" }}>Total Capital Pendiente</span>
            <h2 style={{ fontSize: "1.6rem", color: theme.colors.warning, marginTop: "0.4rem" }}>
              {totalSaldoPendiente.toFixed(2)} Bs
            </h2>
          </div>
          <div style={{ background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`, padding: "1.25rem", borderRadius: theme.radius.lg }}>
            <span style={{ fontSize: "0.8rem", color: theme.colors.textMuted, textTransform: "uppercase" }}>Mora Acumulada</span>
            <h2 style={{ fontSize: "1.6rem", color: theme.colors.danger, marginTop: "0.4rem" }}>
              {totalMoraAcumulada.toFixed(2)} Bs
            </h2>
          </div>
          <div style={{ background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`, padding: "1.25rem", borderRadius: theme.radius.lg }}>
            <span style={{ fontSize: "0.8rem", color: theme.colors.textMuted, textTransform: "uppercase" }}>Total Cartera Activa</span>
            <h2 style={{ fontSize: "1.6rem", color: theme.colors.primary, marginTop: "0.4rem" }}>
              {(totalSaldoPendiente + totalMoraAcumulada).toFixed(2)} Bs
            </h2>
          </div>
        </div>

        <TableCard>
          <TableToolbar>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", flex: 1 }}>
              <SearchInput
                placeholder="Buscar por socio, caseta o concepto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <FilterSelect value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">Todos los Estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Pagado_Parcial">Pagado Parcial</option>
                <option value="Pagado_Total">Pagado Total</option>
                <option value="Anulado">Anulado</option>
              </FilterSelect>
              <SearchInput
                style={{ minWidth: "140px", maxWidth: "160px" }}
                placeholder="Periodo (YYYY-MM)"
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
              />
            </div>
            <span style={{ color: theme.colors.textMuted, fontSize: "0.875rem" }}>
              {cargosFiltrados.length} cargo(s)
            </span>
          </TableToolbar>

          <TableResponsiveWrapper>
            <TableWrapper>
              <TableHead>
                <tr>
                  <th>Socio / Caseta</th>
                  <th>Concepto</th>
                  <th>Periodo</th>
                  <th>Detalle</th>
                  <th>Saldo Pendiente</th>
                  <th>Mora Acumulada</th>
                  <th>Total Deuda</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                      Cargando deudas...
                    </TableCell>
                  </TableRow>
                ) : cargosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                      No se encontraron deudas con los filtros actuales
                    </TableCell>
                  </TableRow>
                ) : (
                  cargosFiltrados.map((c) => {
                    const socio = c.socio || c.Socio || {};
                    const persona = socio.persona || socio.Persona || {};
                    const totalDeuda = parseFloat(c.saldo_capital_pendiente || 0) + parseFloat(c.monto_mora_acumulada || 0);
                    return (
                      <TableRow key={c.id_cargo}>
                        <TableCell>
                          <strong>Caseta #{socio.nro_caseta || "-"}</strong>
                          <div style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                            {persona.nombres || "-"} {persona.apellidos || ""}
                          </div>
                        </TableCell>
                        <TableCell>{c.concepto?.nombre_concepto || c.ConceptoCobro?.nombre_concepto || "Concepto"}</TableCell>
                        <TableCell>{c.periodo}</TableCell>
                        <TableCell style={{ maxWidth: "200px" }}>{c.detalle}</TableCell>
                        <TableCell style={{ fontWeight: 600 }}>
                          {parseFloat(c.saldo_capital_pendiente).toFixed(2)} Bs
                        </TableCell>
                        <TableCell style={{ color: parseFloat(c.monto_mora_acumulada) > 0 ? theme.colors.danger : theme.colors.textMuted }}>
                          {parseFloat(c.monto_mora_acumulada || 0).toFixed(2)} Bs
                        </TableCell>
                        <TableCell style={{ fontWeight: 700, color: theme.colors.textMain }}>
                          {totalDeuda.toFixed(2)} Bs
                        </TableCell>
                        <TableCell>{formatDate(c.fecha_vencimiento)}</TableCell>
                        <TableCell>
                          <StatusBadge $status={c.estado}>{c.estado}</StatusBadge>
                        </TableCell>
                        <TableCell>
                          {c.estado !== "Pagado_Total" && c.estado !== "Anulado" && (
                            <DeleteButton onClick={() => handleAnular(c)}>
                              Anular
                            </DeleteButton>
                          )}
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

export default CargosPage;
