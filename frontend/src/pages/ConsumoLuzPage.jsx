import React, { useEffect, useState, useMemo } from "react";
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
  Card,
  TableCard,
  TableResponsiveWrapper,
  TableWrapper,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CreateButton,
  SearchInput,
  StatusBadge,
} from "../styles/commonStyles";
import {
  consumoLuzRoute,
  consumoLuzTarifaRoute,
  sociosRoute,
  cargosRoute,
} from "../utils/APIroutes";
import { formatDate } from "../utils/dateUtils";

// ─── Estilos Personalizados ──────────────────────────────────────────────────

const WorkspaceLayout = styled.div`
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 1.5rem;
  align-items: start;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const SidebarSociosCard = styled(Card)`
  padding: 1.25rem;
  max-height: calc(100vh - 180px);
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const SociosScrollList = styled.div`
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  flex: 1;
  padding-right: 0.25rem;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.border};
    border-radius: 3px;
  }
`;

const SocioItemBtn = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0.85rem;
  border-radius: ${theme.radius.md};
  border: 1px solid
    ${({ $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background-color: ${({ $active }) =>
    $active ? theme.colors.primaryLight : theme.colors.bgInput};
  color: ${theme.colors.textMain};
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${theme.colors.primary};
    background-color: ${({ $active }) =>
      $active ? theme.colors.primaryLight : "rgba(255, 255, 255, 0.04)"};
  }

  .caseta {
    font-size: 0.9rem;
    font-weight: 800;
    color: ${({ $active }) => ($active ? theme.colors.primary : theme.colors.textMain)};
  }

  .nombre {
    font-size: 0.75rem;
    color: ${theme.colors.textMuted};
    margin-top: 0.15rem;
  }
`;

const DetailWorkspace = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const SocioHeaderBanner = styled(Card)`
  background: linear-gradient(
    135deg,
    ${theme.colors.bgCard} 0%,
    rgba(14, 165, 233, 0.08) 100%
  );
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`;

const FormContainerCard = styled(Card)`
  padding: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const Label = styled.label`
  font-size: 0.75rem;
  color: ${theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
`;

const Input = styled.input`
  padding: 0.75rem 1rem;
  background-color: ${theme.colors.bgInput};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  font-size: 0.9rem;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }

  &:disabled {
    background-color: rgba(255, 255, 255, 0.03);
    color: ${theme.colors.textMuted};
    cursor: not-allowed;
  }
`;

const CalculationLiveGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.75rem;
  background: rgba(14, 165, 233, 0.06);
  border: 1px dashed ${theme.colors.primary};
  border-radius: ${theme.radius.md};
  padding: 1rem;
  margin: 1.25rem 0;
  text-align: center;

  .item span {
    font-size: 0.7rem;
    color: ${theme.colors.textMuted};
    text-transform: uppercase;
    font-weight: 700;
    display: block;
    margin-bottom: 0.2rem;
  }

  .item strong {
    font-size: 1.2rem;
    color: ${theme.colors.primary};
    font-weight: 800;
  }
`;

const MoraWarningBanner = styled.div`
  background-color: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: ${theme.radius.md};
  padding: 0.85rem 1rem;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #fca5a5;
  font-size: 0.85rem;
  line-height: 1.4;

  strong {
    color: #ef4444;
  }
`;

function ConsumoLuzPage() {
  const { auth } = useAuth();

  // Estados principales
  const [socios, setSocios] = useState([]);
  const [cargosLuz, setCargosLuz] = useState([]);
  const [consumos, setConsumos] = useState([]);
  const [tarifaKwh, setTarifaKwh] = useState(2.0);
  const [loading, setLoading] = useState(true);
  const [busquedaSocio, setBusquedaSocio] = useState("");
  const [socioSeleccionadoId, setSocioSeleccionadoId] = useState(null);

  // Formulario en pantalla
  const [fechaLectura, setFechaLectura] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [lecturaActual, setLecturaActual] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Cargar datos
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resSocios, resConsumos, resCargos, resTarifa] = await Promise.all([
        axios.get(sociosRoute, auth.config),
        axios.get(consumoLuzRoute, auth.config),
        axios.get(cargosRoute, auth.config),
        axios.get(consumoLuzTarifaRoute, auth.config),
      ]);

      if (resTarifa.data?.precio_kwh) {
        setTarifaKwh(parseFloat(resTarifa.data.precio_kwh));
      }

      const listaSocios = Array.isArray(resSocios.data)
        ? resSocios.data
        : resSocios.data.socios || [];
      const listaConsumos = Array.isArray(resConsumos.data)
        ? resConsumos.data
        : resConsumos.data.consumos || [];
      const listaCargos = Array.isArray(resCargos.data)
        ? resCargos.data
        : resCargos.data.cargos || [];

      // Ordenar socios por número de caseta
      listaSocios.sort((a, b) => {
        const numA = parseInt(a.nro_caseta, 10) || 0;
        const numB = parseInt(b.nro_caseta, 10) || 0;
        return numA - numB;
      });

      // Filtrar solo cargos de luz
      const soloLuz = listaCargos.filter(
        (c) =>
          c.tipo_origen === "luz" ||
          (c.concepto?.nombre_concepto || "").toLowerCase().includes("luz")
      );

      setSocios(listaSocios);
      setConsumos(listaConsumos);
      setCargosLuz(soloLuz);

      // Auto-seleccionar primer socio si ninguno está seleccionado
      if (!socioSeleccionadoId && listaSocios.length > 0) {
        setSocioSeleccionadoId(listaSocios[0].id_socio);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar datos de consumo de luz", toastOptions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.config) fetchData();
  }, [auth]);

  // Socio activo actual
  const socioActivo = useMemo(() => {
    return socios.find((s) => s.id_socio === socioSeleccionadoId) || null;
  }, [socios, socioSeleccionadoId]);

  // Historial de lecturas del socio seleccionado ordenado descendentemente
  const lecturasSocio = useMemo(() => {
    if (!socioSeleccionadoId) return [];
    return consumos
      .filter((c) => c.id_socio === socioSeleccionadoId)
      .sort((a, b) => {
        if (a.fecha_lectura > b.fecha_lectura) return -1;
        if (a.fecha_lectura < b.fecha_lectura) return 1;
        return (b.id_consumo || 0) - (a.id_consumo || 0);
      });
  }, [consumos, socioSeleccionadoId]);

  // Última lectura conocida del socio
  const ultimaLecturaObj = lecturasSocio.length > 0 ? lecturasSocio[0] : null;
  const lecturaAnterior = ultimaLecturaObj
    ? parseFloat(ultimaLecturaObj.lectura_actual || 0)
    : 0;

  // Cargos de luz pendientes del socio
  const cargosLuzPendientes = useMemo(() => {
    if (!socioSeleccionadoId) return [];
    return cargosLuz.filter(
      (c) =>
        c.id_socio === socioSeleccionadoId &&
        ["Pendiente", "Pagado_Parcial"].includes(c.estado)
    );
  }, [cargosLuz, socioSeleccionadoId]);

  const mesesImpagosCount = cargosLuzPendientes.length;

  // Alerta si este registro se convertirá en el 3er mes de mora
  const alertaraTercerMesMora = mesesImpagosCount >= 2;

  // Cálculo en vivo
  const kwhConsumidos = useMemo(() => {
    const act = parseFloat(lecturaActual);
    if (isNaN(act) || act < lecturaAnterior) return 0;
    return parseFloat((act - lecturaAnterior).toFixed(2));
  }, [lecturaActual, lecturaAnterior]);

  const importeTotal = parseFloat((kwhConsumidos * tarifaKwh).toFixed(2));

  // Limpiar input de lectura al cambiar de socio
  const handleCambiarSocio = (id) => {
    setSocioSeleccionadoId(id);
    setLecturaActual("");
  };

  // Guardar nueva lectura
  const handleSubmitLectura = async (e) => {
    e.preventDefault();

    const act = parseFloat(lecturaActual);
    if (isNaN(act)) {
      toast.error("Por favor ingresa la lectura actual del medidor", toastOptions);
      return;
    }

    if (act < lecturaAnterior) {
      toast.error(
        `La lectura actual (${act} kWh) no puede ser menor a la lectura anterior (${lecturaAnterior} kWh)`,
        toastOptions
      );
      return;
    }

    if (ultimaLecturaObj) {
      const dNueva = new Date(fechaLectura);
      const dUlt = new Date(ultimaLecturaObj.fecha_lectura);
      if (dNueva < dUlt) {
        toast.error(
          `La fecha de lectura (${formatDate(fechaLectura)}) no puede ser anterior a la última lectura registrada (${formatDate(ultimaLecturaObj.fecha_lectura)})`,
          toastOptions
        );
        return;
      }
    }

    try {
      setGuardando(true);
      const { data } = await axios.post(
        consumoLuzRoute,
        {
          id_socio: socioSeleccionadoId,
          fecha_lectura: fechaLectura,
          lectura_anterior: lecturaAnterior,
          lectura_actual: act,
        },
        auth.config
      );

      if (data.multa_mora) {
        toast.warning(data.mensaje, { ...toastOptions, autoClose: 6000 });
      } else {
        toast.success(data.mensaje || "Lecturación registrada exitosamente", toastOptions);
      }

      setLecturaActual("");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al registrar la lectura", toastOptions);
    } finally {
      setGuardando(false);
    }
  };

  // Filtrado de socios para la barra lateral
  const sociosFiltradosLista = socios.filter((s) => {
    const q = busquedaSocio.toLowerCase().trim();
    if (!q) return true;
    const caseta = String(s.nro_caseta || "").toLowerCase();
    const p = s.persona || {};
    const nombre = `${p.nombres || ""} ${p.apellidos || ""}`.toLowerCase();
    return caseta.includes(q) || nombre.includes(q);
  });

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        <SectionHeader>
          <div className="titles">
            <h1>Toma y Registro de Consumo de Luz</h1>
            <p>
              Ronda mensual de medidores por caseta — Tarifa Oficial:{" "}
              <strong>1 kWh = 2.00 Bs</strong>
            </p>
          </div>
        </SectionHeader>

        <WorkspaceLayout>
          {/* ─── COLUMNA IZQUIERDA: LISTA DE CASETAS ─── */}
          <SidebarSociosCard>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "0.9rem", color: theme.colors.textMain }}>
                Padrón de Casetas ({socios.length})
              </strong>
            </div>

            <SearchInput
              placeholder="Buscar caseta o socio..."
              value={busquedaSocio}
              onChange={(e) => setBusquedaSocio(e.target.value)}
            />

            <SociosScrollList>
              {loading ? (
                <p style={{ color: theme.colors.textMuted, fontSize: "0.85rem", textAlign: "center", padding: "1rem" }}>
                  Cargando socios...
                </p>
              ) : sociosFiltradosLista.length === 0 ? (
                <p style={{ color: theme.colors.textMuted, fontSize: "0.85rem", textAlign: "center", padding: "1rem" }}>
                  No se encontraron casetas
                </p>
              ) : (
                sociosFiltradosLista.map((s) => {
                  const p = s.persona || {};
                  const pendientes = cargosLuz.filter(
                    (c) =>
                      c.id_socio === s.id_socio &&
                      ["Pendiente", "Pagado_Parcial"].includes(c.estado)
                  ).length;
                  const esActivo = s.id_socio === socioSeleccionadoId;

                  return (
                    <SocioItemBtn
                      key={s.id_socio}
                      $active={esActivo}
                      onClick={() => handleCambiarSocio(s.id_socio)}
                    >
                      <div>
                        <div className="caseta">
                          Caseta #{s.nro_caseta}
                          {s.total_casetas_dueno > 1 && (
                            <span style={{ fontSize: "0.68rem", fontWeight: 600, color: theme.colors.primary, marginLeft: "0.35rem" }}>
                              ({s.total_casetas_dueno} casetas)
                            </span>
                          )}
                        </div>
                        <div className="nombre">
                          {p.nombres || ""} {p.apellidos || ""}
                        </div>
                      </div>
                      <div>
                        {pendientes >= 2 ? (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              background: "rgba(239, 68, 68, 0.2)",
                              color: theme.colors.danger,
                              padding: "0.2rem 0.4rem",
                              borderRadius: "4px",
                              fontWeight: 700,
                            }}
                          >
                            ⚠️ {pendientes} meses
                          </span>
                        ) : pendientes === 1 ? (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              background: "rgba(245, 158, 11, 0.2)",
                              color: theme.colors.warning,
                              padding: "0.2rem 0.4rem",
                              borderRadius: "4px",
                              fontWeight: 700,
                            }}
                          >
                            1 mes
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              background: "rgba(16, 185, 129, 0.15)",
                              color: theme.colors.success,
                              padding: "0.2rem 0.4rem",
                              borderRadius: "4px",
                              fontWeight: 700,
                            }}
                          >
                            Al día
                          </span>
                        )}
                      </div>
                    </SocioItemBtn>
                  );
                })
              )}
            </SociosScrollList>
          </SidebarSociosCard>

          {/* ─── COLUMNA DERECHA: FORMULARIO IN-PLACE E HISTORIAL ─── */}
          {socioActivo ? (
            <DetailWorkspace>
              {/* Tarjeta de Datos del Socio Seleccionado */}
              <SocioHeaderBanner>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                    <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: theme.colors.textMain }}>
                      Caseta #{socioActivo.nro_caseta}
                    </h2>
                    <StatusBadge $status={socioActivo.estado_socio}>
                      {socioActivo.estado_socio}
                    </StatusBadge>
                    {socioActivo.total_casetas_dueno > 1 && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          backgroundColor: "rgba(14, 165, 233, 0.15)",
                          color: theme.colors.primary,
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                          fontWeight: 700,
                          border: "1px solid rgba(14, 165, 233, 0.3)",
                        }}
                      >
                        🏷️ Propietario de {socioActivo.total_casetas_dueno} casetas (#{socioActivo.todas_casetas?.join(", #")})
                      </span>
                    )}
                  </div>
                  <p style={{ color: theme.colors.textMuted, fontSize: "0.875rem", marginTop: "0.25rem" }}>
                    Titular:{" "}
                    <strong style={{ color: theme.colors.textMain }}>
                      {socioActivo.persona?.nombres} {socioActivo.persona?.apellidos}
                    </strong>{" "}
                    | CI: {socioActivo.persona?.ci || "S/D"} | Teléfono:{" "}
                    {socioActivo.persona?.telefono || "S/D"}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "1rem" }}>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.7rem", color: theme.colors.textMuted, textTransform: "uppercase", display: "block" }}>
                      Última Lectura
                    </span>
                    <strong style={{ fontSize: "1.1rem", color: theme.colors.primary }}>
                      {lecturaAnterior.toFixed(2)} kWh
                    </strong>
                    {ultimaLecturaObj && (
                      <span style={{ fontSize: "0.72rem", color: theme.colors.textDim, display: "block" }}>
                        ({formatDate(ultimaLecturaObj.fecha_lectura)})
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.7rem", color: theme.colors.textMuted, textTransform: "uppercase", display: "block" }}>
                      Meses Impagos Luz
                    </span>
                    <strong
                      style={{
                        fontSize: "1.1rem",
                        color: mesesImpagosCount >= 2 ? theme.colors.danger : theme.colors.success,
                      }}
                    >
                      {mesesImpagosCount} mes(es)
                    </strong>
                  </div>
                </div>
              </SocioHeaderBanner>

              {/* Formulario de Toma de Lectura */}
              <FormContainerCard>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: theme.colors.textMain, marginBottom: "1rem" }}>
                  📝 Ingresar Nueva Lecturación del Medidor
                </h3>

                {alertaraTercerMesMora && (
                  <MoraWarningBanner>
                    <span style={{ fontSize: "1.5rem" }}>⚠️</span>
                    <div>
                      <strong>Alerta de Sanción por Mora:</strong> Este socio ya tiene{" "}
                      <strong>{mesesImpagosCount} meses de luz impagos</strong>. Al registrar esta
                      nueva lecturación, alcanzará su <strong>3er mes consecutivo impago</strong> y el
                      sistema le aplicará automáticamente una{" "}
                      <strong>Multa por Mora en Consumo de Luz de 20.00 Bs</strong>.
                    </div>
                  </MoraWarningBanner>
                )}

                <form onSubmit={handleSubmitLectura}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                    <FormGroup>
                      <Label>Fecha de la Lectura *</Label>
                      <Input
                        type="date"
                        value={fechaLectura}
                        onChange={(e) => setFechaLectura(e.target.value)}
                        required
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Lectura Anterior (kWh) - Bloqueada</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={lecturaAnterior}
                        disabled
                        title="Toma automáticamente la última lectura registrada de este medidor"
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Lectura Actual del Medidor (kWh) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={lecturaAnterior}
                        placeholder={`Mínimo: ${lecturaAnterior}`}
                        value={lecturaActual}
                        onChange={(e) => setLecturaActual(e.target.value)}
                        required
                        autoFocus
                      />
                    </FormGroup>
                  </div>

                  {/* Cálculo en Vivo */}
                  <CalculationLiveGrid>
                    <div className="item">
                      <span>Lectura Ant.</span>
                      <strong style={{ color: theme.colors.textMuted }}>
                        {lecturaAnterior.toFixed(2)} kWh
                      </strong>
                    </div>
                    <div className="item">
                      <span>Lectura Act.</span>
                      <strong style={{ color: theme.colors.textMain }}>
                        {lecturaActual ? parseFloat(lecturaActual).toFixed(2) : "0.00"} kWh
                      </strong>
                    </div>
                    <div className="item">
                      <span>Consumo Neto</span>
                      <strong style={{ color: theme.colors.primary }}>
                        {kwhConsumidos.toFixed(2)} kWh
                      </strong>
                    </div>
                    <div className="item">
                      <span>Tarifa Mercado</span>
                      <strong style={{ color: theme.colors.textMuted }}>
                        {tarifaKwh.toFixed(2)} Bs / kWh
                      </strong>
                    </div>
                    <div className="item">
                      <span>Importe Calculado</span>
                      <strong style={{ color: theme.colors.success, fontSize: "1.3rem" }}>
                        {importeTotal.toFixed(2)} Bs
                      </strong>
                    </div>
                  </CalculationLiveGrid>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <CreateButton
                      type="submit"
                      disabled={guardando || !lecturaActual || parseFloat(lecturaActual) < lecturaAnterior}
                    >
                      {guardando
                        ? "Registrando..."
                        : `💾 Guardar Lectura y Generar Cargo (${importeTotal.toFixed(2)} Bs)`}
                    </CreateButton>
                  </div>
                </form>
              </FormContainerCard>

              {/* Historial de Lecturas del Socio */}
              <TableCard>
                <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${theme.colors.border}` }}>
                  <strong style={{ fontSize: "0.95rem", color: theme.colors.textMain }}>
                    📋 Historial de Lecturaciones del Medidor (Caseta #{socioActivo.nro_caseta})
                  </strong>
                </div>

                <TableResponsiveWrapper>
                  <TableWrapper>
                    <TableHead>
                      <tr>
                        <th>Fecha Lectura</th>
                        <th>Periodo</th>
                        <th>Lectura Anterior</th>
                        <th>Lectura Actual</th>
                        <th>Consumo (kWh)</th>
                        <th>Importe (Bs)</th>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {lecturasSocio.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                            Aún no hay lecturas registradas para este medidor. Realiza la primera toma en el formulario arriba.
                          </TableCell>
                        </TableRow>
                      ) : (
                        lecturasSocio.map((item) => (
                          <TableRow key={item.id_consumo}>
                            <TableCell>
                              <strong>{formatDate(item.fecha_lectura)}</strong>
                            </TableCell>
                            <TableCell>{item.mes_anio}</TableCell>
                            <TableCell>{parseFloat(item.lectura_anterior).toFixed(2)} kWh</TableCell>
                            <TableCell>
                              <strong style={{ color: theme.colors.textMain }}>
                                {parseFloat(item.lectura_actual).toFixed(2)} kWh
                              </strong>
                            </TableCell>
                            <TableCell style={{ fontWeight: 700, color: theme.colors.primary }}>
                              {parseFloat(item.kwh_consumidos).toFixed(2)} kWh
                            </TableCell>
                            <TableCell style={{ fontWeight: 800, color: theme.colors.success }}>
                              {parseFloat(item.monto_calculado).toFixed(2)} Bs
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </TableWrapper>
                </TableResponsiveWrapper>
              </TableCard>
            </DetailWorkspace>
          ) : (
            <Card style={{ padding: "2rem", textAlign: "center", color: theme.colors.textMuted }}>
              Selecciona una caseta del panel izquierdo para comenzar la toma de lecturas.
            </Card>
          )}
        </WorkspaceLayout>
      </ContentContainer>
    </PageContainer>
  );
}

export default ConsumoLuzPage;
