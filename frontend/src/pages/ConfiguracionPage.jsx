import React, { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import Sidebar from "../components/Sidebar";
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
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textMain};
  font-size: 0.875rem;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
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
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
`;

function ConfiguracionPage() {
  const { auth } = useAuth();
  const [tab, setTab] = useState("parametros");
  const [loading, setLoading] = useState(true);
  const [guardandoParametros, setGuardandoParametros] = useState(false);

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

  // Modales secundarios
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

  // Guardar Parámetros de la Asociación (Tarifas, Luz, Serenaje, Multas)
  const handleGuardarParametros = async (e) => {
    e.preventDefault();
    try {
      setGuardandoParametros(true);
      const payload = {
        nombre_mercado: formAsoc.nombre_mercado.trim(),
        direccion: formAsoc.direccion.trim(),
        telefono: formAsoc.telefono.trim(),
        precio_kwh: parseFloat(formAsoc.precio_kwh),
        monto_serenaje: parseFloat(formAsoc.monto_serenaje),
        dia_corte_serenaje: parseInt(formAsoc.dia_corte_serenaje),
        multa_asamblea: parseFloat(formAsoc.multa_asamblea),
        multa_marcha: parseFloat(formAsoc.multa_marcha),
      };

      const { data } = await axios.put(asociacionConfigRoute, payload, auth.config);
      toast.success(data.mensaje || "Tarifas y parámetros actualizados exitosamente", toastOptions);
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
    try {
      const payload = {
        nombre_concepto: formConcepto.nombre_concepto,
        monto_fijo: formConcepto.monto_fijo ? parseFloat(formConcepto.monto_fijo) : null,
        aplica_mora: formConcepto.aplica_mora,
        tasa_mora_mensual: formConcepto.aplica_mora ? parseFloat(formConcepto.tasa_mora_mensual) : null,
        dias_gracia: formConcepto.aplica_mora ? parseInt(formConcepto.dias_gracia) : 0,
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
      fetchTodo();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al guardar concepto", toastOptions);
    }
  };

  const handleEliminarConcepto = async (c) => {
    if (!window.confirm(`¿Eliminar concepto de cobro "${c.nombre_concepto}"?`)) return;
    try {
      await axios.delete(`${conceptosRoute}/${c.id_concepto}`, auth.config);
      toast.success("Concepto eliminado", toastOptions);
      fetchTodo();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al eliminar concepto", toastOptions);
    }
  };

  // Tipos de Egreso
  const handleGuardarTipo = async (e) => {
    e.preventDefault();
    try {
      if (tipoEditando) {
        await axios.put(`${tipoEgresoRoute}/${tipoEditando.id_tipo_egreso}`, formTipo, auth.config);
        toast.success("Categoría actualizada", toastOptions);
      } else {
        await axios.post(tipoEgresoRoute, formTipo, auth.config);
        toast.success("Categoría creada", toastOptions);
      }
      setModalTipo(false);
      setTipoEditando(null);
      fetchTodo();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al guardar categoría", toastOptions);
    }
  };

  const handleEliminarTipo = async (t) => {
    if (!window.confirm(`¿Eliminar categoría "${t.nombre_categoria}"?`)) return;
    try {
      await axios.delete(`${tipoEgresoRoute}/${t.id_tipo_egreso}`, auth.config);
      toast.success("Categoría eliminada", toastOptions);
      fetchTodo();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || "Error al eliminar categoría", toastOptions);
    }
  };

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        <SectionHeader>
          <div className="titles">
            <h1>⚙️ Configuración y Tarifas del Mercado</h1>
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
            <span className="icon">👑</span>
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
            ⚡ Tarifas y Parámetros del Mercado
          </TabButton>
          <TabButton $active={tab === "conceptos"} onClick={() => setTab("conceptos")}>
            💳 Catálogo de Conceptos de Cobro
          </TabButton>
          <TabButton $active={tab === "tipos"} onClick={() => setTab("tipos")}>
            📤 Categorías de Gastos / Egresos
          </TabButton>
        </TabBar>

        {/* ─── PESTAÑA 1: PARÁMETROS GENERALES Y TARIFAS ─── */}
        {tab === "parametros" && (
          <form onSubmit={handleGuardarParametros}>
            <ConfigGrid>
              {/* Tarjeta 1: Energía Eléctrica (Luz) */}
              <ConfigCard>
                <div className="card-header">
                  <h3>💡 Tarifa de Energía Eléctrica</h3>
                  <p>Precio aplicado a las lecturas de los medidores de las casetas</p>
                </div>

                <FormGroup>
                  <Label>Precio por 1 Kilovatio-Hora (Bs / kWh) *</Label>
                  <Input
                    type="number"
                    step="0.10"
                    min="0.10"
                    value={formAsoc.precio_kwh}
                    onChange={(e) => setFormAsoc({ ...formAsoc, precio_kwh: e.target.value })}
                    required
                  />
                  <span style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                    Actualmente: <strong>{parseFloat(formAsoc.precio_kwh || 0).toFixed(2)} Bs</strong> por cada 1 kWh consumido.
                  </span>
                </FormGroup>

                <div
                  style={{
                    backgroundColor: "rgba(14, 165, 233, 0.08)",
                    border: "1px dashed rgba(14, 165, 233, 0.3)",
                    padding: "0.75rem",
                    borderRadius: theme.radius.sm,
                    fontSize: "0.78rem",
                    color: theme.colors.textMuted,
                  }}
                >
                  ℹ️ Al modificar esta tarifa, todas las nuevas lecturaciones que registre la Secretaria de Hacienda usarán automáticamente este precio por kWh.
                </div>
              </ConfigCard>

              {/* Tarjeta 2: Serenaje y Seguridad */}
              <ConfigCard>
                <div className="card-header">
                  <h3>🛡️ Serenaje y Seguridad Nocturna</h3>
                  <p>Cobro mensual recurrente generado automáticamente</p>
                </div>

                <FormGroup>
                  <Label>Cuota Mensual por Caseta (Bs) *</Label>
                  <Input
                    type="number"
                    step="0.50"
                    min="0"
                    value={formAsoc.monto_serenaje}
                    onChange={(e) => setFormAsoc({ ...formAsoc, monto_serenaje: e.target.value })}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Día del Mes para Generación Automática (1 - 28) *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    value={formAsoc.dia_corte_serenaje}
                    onChange={(e) => setFormAsoc({ ...formAsoc, dia_corte_serenaje: e.target.value })}
                    required
                  />
                  <span style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                    El sistema emite los cargos automáticamente a las 00:00 del día configurado (por defecto día 5).
                  </span>
                </FormGroup>
              </ConfigCard>

              {/* Tarjeta 3: Sanciones por Inasistencia */}
              <ConfigCard>
                <div className="card-header">
                  <h3>⚠️ Sanciones y Multas Sugeridas</h3>
                  <p>Montos sugeridos por inasistencia al crear asambleas y marchas</p>
                </div>

                <FormGroup>
                  <Label>Multa por Falta a Asamblea General (Bs) *</Label>
                  <Input
                    type="number"
                    step="0.50"
                    min="0"
                    value={formAsoc.multa_asamblea}
                    onChange={(e) => setFormAsoc({ ...formAsoc, multa_asamblea: e.target.value })}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Multa por Falta a Marcha o Movilización (Bs) *</Label>
                  <Input
                    type="number"
                    step="0.50"
                    min="0"
                    value={formAsoc.multa_marcha}
                    onChange={(e) => setFormAsoc({ ...formAsoc, multa_marcha: e.target.value })}
                    required
                  />
                </FormGroup>
              </ConfigCard>

              {/* Tarjeta 4: Datos Institucionales */}
              <ConfigCard>
                <div className="card-header">
                  <h3>🏢 Datos de la Asociación de Mercado</h3>
                  <p>Información que aparece en los recibos oficiales y reportes PDF</p>
                </div>

                <FormGroup>
                  <Label>Nombre del Mercado / Asociación *</Label>
                  <Input
                    value={formAsoc.nombre_mercado}
                    onChange={(e) => setFormAsoc({ ...formAsoc, nombre_mercado: e.target.value })}
                    required
                  />
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
              <CreateButton type="submit" disabled={guardandoParametros} style={{ padding: "0.85rem 2rem", fontSize: "1rem" }}>
                {guardandoParametros ? "Guardando..." : "💾 Guardar Todos los Parámetros"}
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
                          <DeleteButton onClick={() => handleEliminarConcepto(c)}>Eliminar</DeleteButton>
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
                          <DeleteButton onClick={() => handleEliminarTipo(t)}>Eliminar</DeleteButton>
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

      {/* Modal Concepto */}
      {modalConcepto && (
        <ModalOverlay onClick={(e) => e.target === e.currentTarget && setModalConcepto(false)}>
          <ModalCard>
            <h2 style={{ fontSize: "1.25rem", color: theme.colors.textMain, marginBottom: "1rem" }}>
              {conceptoEditando ? "Editar Concepto de Cobro" : "Nuevo Concepto de Cobro"}
            </h2>
            <form onSubmit={handleGuardarConcepto}>
              <FormGroup>
                <Label>Nombre del Concepto *</Label>
                <Input
                  placeholder="Ej. Alquiler de Caseta / Traspaso / Serenaje"
                  value={formConcepto.nombre_concepto}
                  onChange={(e) => setFormConcepto({ ...formConcepto, nombre_concepto: e.target.value })}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Monto Fijo en Bs (Dejar vacío si es variable como la luz)</Label>
                <Input
                  type="number"
                  step="0.50"
                  placeholder="Ej. 20.00"
                  value={formConcepto.monto_fijo}
                  onChange={(e) => setFormConcepto({ ...formConcepto, monto_fijo: e.target.value })}
                />
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
                      value={formConcepto.tasa_mora_mensual}
                      onChange={(e) => setFormConcepto({ ...formConcepto, tasa_mora_mensual: e.target.value })}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>Días de Gracia antes de aplicar mora</Label>
                    <Input
                      type="number"
                      value={formConcepto.dias_gracia}
                      onChange={(e) => setFormConcepto({ ...formConcepto, dias_gracia: e.target.value })}
                    />
                  </FormGroup>
                </>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                <ActionButton type="button" onClick={() => setModalConcepto(false)}>
                  Cancelar
                </ActionButton>
                <CreateButton type="submit">Guardar</CreateButton>
              </div>
            </form>
          </ModalCard>
        </ModalOverlay>
      )}

      {/* Modal Tipo Egreso */}
      {modalTipo && (
        <ModalOverlay onClick={(e) => e.target === e.currentTarget && setModalTipo(false)}>
          <ModalCard>
            <h2 style={{ fontSize: "1.25rem", color: theme.colors.textMain, marginBottom: "1rem" }}>
              {tipoEditando ? "Editar Categoría de Egreso" : "Nueva Categoría de Egreso"}
            </h2>
            <form onSubmit={handleGuardarTipo}>
              <FormGroup>
                <Label>Nombre de la Categoría *</Label>
                <Input
                  placeholder="Ej. Reparación de Baños / Papelería / Limpieza"
                  value={formTipo.nombre_categoria}
                  onChange={(e) => setFormTipo({ ...formTipo, nombre_categoria: e.target.value })}
                  required
                />
              </FormGroup>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                <ActionButton type="button" onClick={() => setModalTipo(false)}>
                  Cancelar
                </ActionButton>
                <CreateButton type="submit">Guardar</CreateButton>
              </div>
            </form>
          </ModalCard>
        </ModalOverlay>
      )}
    </PageContainer>
  );
}

export default ConfiguracionPage;
