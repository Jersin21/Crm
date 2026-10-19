import React, { useEffect, useState, useMemo, useCallback } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useParams, useNavigate } from "react-router-dom";
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
  StatusBadge,
  ActionButton,
} from "../styles/commonStyles";
import { sociosRoute, cargosRoute, ingresosRoute } from "../utils/APIroutes";
import { formatDate } from "../utils/dateUtils";

// ─── Estilos adicionales ──────────────────────────────────────────────────────

const BackButton = styled.button`
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMuted};
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    color: ${theme.colors.textMain};
    border-color: ${theme.colors.primary};
  }
`;

const SocioInfoCard = styled(Card)`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;

  .avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background-color: ${theme.colors.primaryLight};
    color: ${theme.colors.primary};
    font-size: 1.5rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(14, 165, 233, 0.3);
    flex-shrink: 0;
  }

  .info h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: ${theme.colors.textMain};
  }

  .info p {
    font-size: 0.875rem;
    color: ${theme.colors.textMuted};
    margin-top: 0.25rem;
  }
`;

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
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;

  h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: ${theme.colors.textMain};
  }

  button {
    background: none;
    border: none;
    color: ${theme.colors.textMuted};
    font-size: 1.5rem;
    cursor: pointer;
    &:hover { color: ${theme.colors.textMain}; }
  }
`;

const CargoCheckRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: ${theme.radius.md};
  border: 1px solid ${theme.colors.border};
  background-color: ${theme.colors.bgInput};
  margin-bottom: 0.5rem;

  input[type="checkbox"] { cursor: pointer; width: 18px; height: 18px; }

  .cargo-info {
    flex: 1;
    p { font-size: 0.85rem; color: ${theme.colors.textMain}; font-weight: 600; }
    span { font-size: 0.75rem; color: ${theme.colors.textMuted}; }
  }

  .monto-input {
    width: 130px;
  }
`;

const Label = styled.label`
  font-size: 0.75rem;
  color: ${theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  display: block;
  margin-bottom: 0.25rem;
`;

const Input = styled.input`
  padding: 0.625rem 0.875rem;
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
  &:hover { color: ${theme.colors.textMain}; }
`;

const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: ${theme.colors.bgCard};
  border-radius: ${theme.radius.md};
  margin-top: 1rem;
  border: 1px solid ${theme.colors.border};

  span { color: ${theme.colors.textMuted}; font-size: 0.875rem; }
  strong { color: ${theme.colors.textMain}; font-size: 1.1rem; }
`;

// ─── Componente ───────────────────────────────────────────────────────────────

function EstadoCuentaSocioPage() {
  const { id } = useParams();
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [socio, setSocio] = useState(null);
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalPago, setModalPago] = useState(false);
  // Estado para los cargos seleccionados a pagar y sus montos
  const [pagoItems, setPagoItems] = useState({});
  const [guardando, setGuardando] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resSocio, resCargos] = await Promise.all([
        axios.get(`${sociosRoute}/${id}`, auth.config),
        axios.get(`${cargosRoute}?id_socio=${id}`, auth.config),
      ]);
      const socioData = resSocio.data.socio || resSocio.data;
      setSocio(socioData);
      const listaCargos = Array.isArray(resCargos.data)
        ? resCargos.data
        : resCargos.data.cargos || [];
      setCargos(listaCargos);
    } catch (err) {
      toast.error("Error al cargar los datos del socio", toastOptions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.config && id) fetchData();
  }, [auth, id]);

  const cargosPendientes = useMemo(
    () => cargos.filter((c) => c.estado === "Pendiente" || c.estado === "Pagado_Parcial"),
    [cargos]
  );

  const abrirPago = () => {
    // Inicializa los montos con el saldo pendiente + mora
    const items = {};
    cargosPendientes.forEach((c) => {
      items[c.id_cargo] = {
        seleccionado: false,
        monto_capital: parseFloat(c.saldo_capital_pendiente || 0),
        monto_mora: parseFloat(c.monto_mora_acumulada || 0),
      };
    });
    setPagoItems(items);
    setModalPago(true);
  };

  const toggleCargo = (id_cargo) => {
    setPagoItems((prev) => ({
      ...prev,
      [id_cargo]: { ...prev[id_cargo], seleccionado: !prev[id_cargo].seleccionado },
    }));
  };

  const updateMonto = (id_cargo, campo, valor) => {
    setPagoItems((prev) => ({
      ...prev,
      [id_cargo]: { ...prev[id_cargo], [campo]: parseFloat(valor) || 0 },
    }));
  };

  // Cálculo financiero memoizado para evitar bucles de suma en renderizados
  const totalPago = useMemo(
    () =>
      Object.entries(pagoItems)
        .filter(([, v]) => v.seleccionado)
        .reduce((s, [, v]) => s + v.monto_capital + v.monto_mora, 0),
    [pagoItems]
  );

  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    const cargosSeleccionados = Object.entries(pagoItems)
      .filter(([, v]) => v.seleccionado)
      .map(([id_cargo, v]) => ({
        id_cargo: parseInt(id_cargo),
        monto_capital: v.monto_capital,
        monto_mora: v.monto_mora,
      }));

    if (cargosSeleccionados.length === 0) {
      toast.error("Selecciona al menos un cargo a pagar", toastOptions);
      return;
    }

    try {
      setGuardando(true);
      await axios.post(
        ingresosRoute,
        {
          id_socio: parseInt(id),
          monto_total: totalPago,
          detalle_pagos: cargosSeleccionados,
        },
        auth.config
      );
      toast.success("Pago registrado correctamente", toastOptions);
      setModalPago(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Error al registrar el pago", toastOptions);
    } finally {
      setGuardando(false);
    }
  };

  const formatMonto = (v) => `Bs. ${parseFloat(v || 0).toFixed(2)}`;

  if (loading) {
    return (
      <PageContainer>
        <Sidebar />
        <ContentContainer>
          <p style={{ color: theme.colors.textMuted }}>Cargando...</p>
        </ContentContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        <SectionHeader>
          <div className="titles">
            <h1>Estado de Cuenta</h1>
            <p>Cargos y pagos del socio</p>
          </div>
          <div className="actions">
            <BackButton onClick={() => navigate("/socios")}>← Volver</BackButton>
            {cargosPendientes.length > 0 && (
              <ActionButton $variant="success" onClick={abrirPago}>
                💳 Registrar Pago
              </ActionButton>
            )}
          </div>
        </SectionHeader>

        {/* Info del socio */}
        {socio && (() => {
          const p = socio.persona || socio.Persona || {};
          return (
            <SocioInfoCard>
              <div className="avatar">
                {(p.nombres || "S").charAt(0).toUpperCase()}
              </div>
              <div className="info">
                <h2>
                  {p.nombres} {p.apellidos}
                </h2>
                <p>
                  Caseta #{socio.nro_caseta} &nbsp;·&nbsp;
                  <StatusBadge $status={socio.estado_socio}>{socio.estado_socio}</StatusBadge>
                </p>
              </div>
            </SocioInfoCard>
          );
        })()}

        {/* Tabla de cargos */}
        <TableCard>
          <TableResponsiveWrapper>
            <TableWrapper>
              <TableHead>
                <tr>
                  <th>Concepto</th>
                  <th>Periodo</th>
                  <th>Detalle</th>
                  <th>Capital Inicial</th>
                  <th>Saldo Pendiente</th>
                  <th>Mora Acumulada</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                </tr>
              </TableHead>
              <TableBody>
                {cargos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} style={{ textAlign: "center", color: theme.colors.textMuted }}>
                      No hay cargos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  cargos.map((c) => (
                    <TableRow key={c.id_cargo}>
                      <TableCell>{c.ConceptoCobro?.nombre || c.concepto || "-"}</TableCell>
                      <TableCell>{c.periodo || "-"}</TableCell>
                      <TableCell style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.detalle || "-"}
                      </TableCell>
                      <TableCell>{formatMonto(c.monto_capital_inicial)}</TableCell>
                      <TableCell>{formatMonto(c.saldo_capital_pendiente)}</TableCell>
                      <TableCell style={{ color: parseFloat(c.monto_mora_acumulada) > 0 ? theme.colors.danger : "inherit" }}>
                        {formatMonto(c.monto_mora_acumulada)}
                      </TableCell>
                      <TableCell>{c.fecha_vencimiento ? formatDate(c.fecha_vencimiento) : "-"}</TableCell>
                      <TableCell>
                        <StatusBadge $status={c.estado}>{c.estado}</StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </TableWrapper>
          </TableResponsiveWrapper>
        </TableCard>
      </ContentContainer>

      {/* Modal de Pago */}
      {modalPago && (
        <ModalOverlay onClick={(e) => e.target === e.currentTarget && setModalPago(false)}>
          <ModalCard>
            <ModalHeader>
              <h2>💳 Registrar Pago</h2>
              <button onClick={() => setModalPago(false)}>×</button>
            </ModalHeader>
            <form onSubmit={handleRegistrarPago}>
              <p style={{ color: theme.colors.textMuted, fontSize: "0.875rem", marginBottom: "1rem" }}>
                Selecciona los cargos a cancelar e ingresa el monto a pagar por cada uno.
              </p>
              {cargosPendientes.map((c) => {
                const item = pagoItems[c.id_cargo];
                return (
                  <CargoCheckRow key={c.id_cargo}>
                    <input
                      type="checkbox"
                      checked={item?.seleccionado || false}
                      onChange={() => toggleCargo(c.id_cargo)}
                    />
                    <div className="cargo-info">
                      <p>{c.ConceptoCobro?.nombre || c.concepto} — {c.periodo}</p>
                      <span>
                        Saldo: {formatMonto(c.saldo_capital_pendiente)} | Mora: {formatMonto(c.monto_mora_acumulada)}
                      </span>
                    </div>
                    {item?.seleccionado && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <div>
                          <Label>Capital</Label>
                          <Input
                            className="monto-input"
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.monto_capital}
                            onChange={(e) => updateMonto(c.id_cargo, "monto_capital", e.target.value)}
                            style={{ width: 100 }}
                          />
                        </div>
                        <div>
                          <Label>Mora</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.monto_mora}
                            onChange={(e) => updateMonto(c.id_cargo, "monto_mora", e.target.value)}
                            style={{ width: 80 }}
                          />
                        </div>
                      </div>
                    )}
                  </CargoCheckRow>
                );
              })}
              <TotalRow>
                <span>Total a pagar:</span>
                <strong>Bs. {totalPago.toFixed(2)}</strong>
              </TotalRow>
              <FormActions>
                <CancelButton type="button" onClick={() => setModalPago(false)}>Cancelar</CancelButton>
                <ActionButton $variant="success" type="submit" disabled={guardando}>
                  {guardando ? "Registrando..." : "Confirmar Pago"}
                </ActionButton>
              </FormActions>
            </form>
          </ModalCard>
        </ModalOverlay>
      )}
    </PageContainer>
  );
}

export default EstadoCuentaSocioPage;
