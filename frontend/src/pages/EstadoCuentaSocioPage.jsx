import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Modal from "../components/Modal";
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

const CargoCheckRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: ${theme.radius.md};
  border: 1px solid ${theme.colors.border};
  background-color: ${theme.colors.bgInput};
  margin-bottom: 0.5rem;

  input[type="checkbox"] {
    cursor: pointer;
    width: 18px;
    height: 18px;
  }

  .cargo-info {
    flex: 1;
    p {
      font-size: 0.85rem;
      color: ${theme.colors.textMain};
      font-weight: 600;
    }
    span {
      font-size: 0.75rem;
      color: ${theme.colors.textMuted};
    }
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
  &:hover {
    color: ${theme.colors.textMain};
  }
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

  span {
    color: ${theme.colors.textMuted};
    font-size: 0.875rem;
  }
  strong {
    color: ${theme.colors.textMain};
    font-size: 1.1rem;
  }
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
  const [pagoItems, setPagoItems] = useState({});
  const [guardando, setGuardando] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resSocio, resCargos] = await Promise.all([
        axios.get(`${sociosRoute}/${id}`, auth.config),
        axios.get(`${cargosRoute}?id_socio=${id}`, auth.config),
      ]);
      const socioData = resSocio.data?.socio || resSocio.data;
      setSocio(socioData);
      const listaCargos = Array.isArray(resCargos.data)
        ? resCargos.data
        : resCargos.data?.cargos || [];
      setCargos(listaCargos);
    } catch (err) {
      toast.error(
        err.response?.data?.mensaje || "Error al cargar los datos del socio",
        toastOptions
      );
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

  const [pagoErrors, setPagoErrors] = useState({});

  const abrirPago = () => {
    const items = {};
    cargosPendientes.forEach((c) => {
      items[c.id_cargo] = {
        seleccionado: false,
        monto_capital: parseFloat(c.saldo_capital_pendiente || 0) || 0,
        monto_mora: parseFloat(c.monto_mora_acumulada || 0) || 0,
      };
    });
    setPagoItems(items);
    setPagoErrors({});
    setModalPago(true);
  };

  const toggleCargo = (id_cargo) => {
    setPagoItems((prev) => ({
      ...prev,
      [id_cargo]: { ...prev[id_cargo], seleccionado: !prev[id_cargo].seleccionado },
    }));
    setPagoErrors((prev) => {
      const next = { ...prev };
      delete next[`${id_cargo}_capital`];
      delete next[`${id_cargo}_mora`];
      delete next[`${id_cargo}_total`];
      delete next.general;
      return next;
    });
  };

  const updateMonto = (id_cargo, campo, valor) => {
    const val = parseFloat(valor);
    setPagoItems((prev) => ({
      ...prev,
      [id_cargo]: { ...prev[id_cargo], [campo]: isNaN(val) ? "" : valor },
    }));
    setPagoErrors((prev) => {
      const next = { ...prev };
      delete next[`${id_cargo}_${campo}`];
      delete next[`${id_cargo}_total`];
      delete next.general;
      return next;
    });
  };

  const validatePago = () => {
    const errors = {};
    const seleccionados = Object.entries(pagoItems).filter(([, v]) => v.seleccionado);
    if (seleccionados.length === 0) {
      errors.general = "Selecciona al menos un cargo a pagar";
      return errors;
    }
    seleccionados.forEach(([id_cargo, v]) => {
      const cargo = cargosPendientes.find((c) => String(c.id_cargo) === String(id_cargo));
      const saldoMax = parseFloat(cargo?.saldo_capital_pendiente || 0);
      const moraMax = parseFloat(cargo?.monto_mora_acumulada || 0);

      const cap = parseFloat(v.monto_capital);
      const mora = parseFloat(v.monto_mora);

      if (v.monto_capital === "" || isNaN(cap) || cap < 0) {
        errors[`${id_cargo}_capital`] = "Monto inválido";
      } else if (cap > saldoMax + 0.01) {
        errors[`${id_cargo}_capital`] = `Máx: ${saldoMax.toFixed(2)}`;
      }

      if (v.monto_mora === "" || isNaN(mora) || mora < 0) {
        errors[`${id_cargo}_mora`] = "Monto inválido";
      } else if (mora > moraMax + 0.01) {
        errors[`${id_cargo}_mora`] = `Máx: ${moraMax.toFixed(2)}`;
      }

      if ((cap || 0) + (mora || 0) <= 0) {
        errors[`${id_cargo}_total`] = "El monto debe ser mayor a 0";
      }
    });
    return errors;
  };

  const totalPago = useMemo(
    () =>
      Object.entries(pagoItems)
        .filter(([, v]) => v.seleccionado)
        .reduce((s, [, v]) => s + (parseFloat(v.monto_capital) || 0) + (parseFloat(v.monto_mora) || 0), 0),
    [pagoItems]
  );

  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    const errors = validatePago();
    setPagoErrors(errors);
    if (Object.keys(errors).length > 0) {
      if (errors.general) {
        toast.error(errors.general, toastOptions);
      } else {
        toast.error("Corrige los montos antes de registrar el pago", toastOptions);
      }
      return;
    }

    const cargosSeleccionados = Object.entries(pagoItems)
      .filter(([, v]) => v.seleccionado)
      .map(([id_cargo, v]) => ({
        id_cargo: parseInt(id_cargo, 10),
        monto_abonado_capital: parseFloat(v.monto_capital) || 0,
        monto_abonado_mora: parseFloat(v.monto_mora) || 0,
      }));

    try {
      setGuardando(true);
      // Corrección de contrato con el backend (ingresoController espera monto_total_recibido y cargos)
      await axios.post(
        ingresosRoute,
        {
          id_socio: parseInt(id, 10),
          monto_total_recibido: parseFloat(totalPago.toFixed(2)),
          observacion: `Pago en ventanilla registrado desde Estado de Cuenta de Socio #${id}`,
          cargos: cargosSeleccionados,
        },
        auth.config
      );
      toast.success("Pago registrado correctamente en el libro de caja", toastOptions);
      setModalPago(false);
      fetchData();
    } catch (err) {
      toast.error(
        err.response?.data?.mensaje || err.response?.data?.msg || "Error al registrar el pago",
        toastOptions
      );
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
          <p style={{ color: theme.colors.textMuted }}>Cargando estado de cuenta...</p>
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
            <p>Cargos, vencimientos y pagos del socio</p>
          </div>
          <div className="actions">
            <BackButton onClick={() => navigate("/socios")}>
              <ArrowLeft size={16} /> Volver
            </BackButton>
            {cargosPendientes.length > 0 && (
              <ActionButton $variant="success" onClick={abrirPago}>
                <CreditCard size={16} /> Registrar Pago
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
                      <TableCell>
                        {c.ConceptoCobro?.nombre_concepto ||
                          c.concepto?.nombre_concepto ||
                          c.concepto ||
                          "-"}
                      </TableCell>
                      <TableCell>{c.periodo || "-"}</TableCell>
                      <TableCell style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.detalle || "-"}
                      </TableCell>
                      <TableCell>{formatMonto(c.monto_capital_inicial)}</TableCell>
                      <TableCell>{formatMonto(c.saldo_capital_pendiente)}</TableCell>
                      <TableCell style={{ color: parseFloat(c.monto_mora_acumulada || 0) > 0 ? theme.colors.danger : "inherit" }}>
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
      <Modal
        isOpen={modalPago}
        onClose={() => setModalPago(false)}
        title="Registrar Pago de Cargos"
        maxWidth="600px"
      >
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
                  <p>
                    {c.ConceptoCobro?.nombre_concepto || c.concepto?.nombre_concepto || c.concepto} — {c.periodo || "General"}
                  </p>
                  <span>
                    Saldo: {formatMonto(c.saldo_capital_pendiente)} | Mora: {formatMonto(c.monto_mora_acumulada)}
                  </span>
                </div>
                {item?.seleccionado && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <div>
                        <Label>Capital</Label>
                        <Input
                          className="monto-input"
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.monto_capital}
                          $hasError={!!pagoErrors[`${c.id_cargo}_capital`]}
                          onChange={(e) => updateMonto(c.id_cargo, "monto_capital", e.target.value)}
                          style={{ width: 100 }}
                        />
                        {pagoErrors[`${c.id_cargo}_capital`] && (
                          <ErrorText>{pagoErrors[`${c.id_cargo}_capital`]}</ErrorText>
                        )}
                      </div>
                      <div>
                        <Label>Mora</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.monto_mora}
                          $hasError={!!pagoErrors[`${c.id_cargo}_mora`]}
                          onChange={(e) => updateMonto(c.id_cargo, "monto_mora", e.target.value)}
                          style={{ width: 80 }}
                        />
                        {pagoErrors[`${c.id_cargo}_mora`] && (
                          <ErrorText>{pagoErrors[`${c.id_cargo}_mora`]}</ErrorText>
                        )}
                      </div>
                    </div>
                    {pagoErrors[`${c.id_cargo}_total`] && (
                      <ErrorText>{pagoErrors[`${c.id_cargo}_total`]}</ErrorText>
                    )}
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
            <CancelButton type="button" onClick={() => setModalPago(false)}>
              Cancelar
            </CancelButton>
            <ActionButton $variant="success" type="submit" disabled={guardando || totalPago <= 0}>
              {guardando ? "Registrando..." : "Confirmar Pago"}
            </ActionButton>
          </FormActions>
        </form>
      </Modal>
    </PageContainer>
  );
}

export default EstadoCuentaSocioPage;
