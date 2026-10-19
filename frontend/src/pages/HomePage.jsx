import React, { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Sidebar from "../components/Sidebar";
import useAuth from "../hooks/authHooks";
import toastOptions from "../utils/toastOptions";
import theme from "../styles/theme";
import {
  PageContainer,
  ContentContainer,
  SectionHeader,
  Card,
} from "../styles/commonStyles";
import {
  sociosRoute,
  cargosRoute,
  ingresosRoute,
  egresosRoute,
  reportesRoute,
} from "../utils/APIroutes";
import ROLES from "../utils/roles";

// ─── Estilos del Dashboard ────────────────────────────────────────────────────

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
`;

const StatCard = styled(Card)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.lg};
  }
`;

const StatIcon = styled.div`
  width: 52px;
  height: 52px;
  border-radius: ${theme.radius.md};
  background-color: ${({ $bg }) => $bg || theme.colors.primaryLight};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  flex-shrink: 0;
`;

const StatInfo = styled.div`
  h3 {
    font-size: 1.75rem;
    font-weight: 800;
    color: ${theme.colors.textMain};
    line-height: 1;
  }
  p {
    font-size: 0.8rem;
    color: ${theme.colors.textMuted};
    margin-top: 0.25rem;
    font-weight: 500;
  }
`;

const WelcomeCard = styled(Card)`
  border-left: 4px solid ${theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;

  h2 {
    font-size: 1.35rem;
    font-weight: 700;
    color: ${theme.colors.textMain};
  }

  p {
    font-size: 0.9rem;
    color: ${theme.colors.textMuted};
    margin-top: 0.25rem;
  }

  .rol-badge {
    padding: 0.4rem 1rem;
    border-radius: ${theme.radius.full};
    background-color: ${theme.colors.primaryLight};
    color: ${theme.colors.primary};
    font-size: 0.8rem;
    font-weight: 700;
    border: 1px solid rgba(14, 165, 233, 0.3);
    white-space: nowrap;
  }
`;

// ─── Componente ───────────────────────────────────────────────────────────────

function HomePage() {
  const { auth } = useAuth();
  const [stats, setStats] = useState({
    totalSocios: 0,
    cargosPendientes: 0,
    totalIngresos: 0,
    totalEgresos: 0,
    saldoNeto: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Obtiene estadísticas del dashboard en tiempo real
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);

        // 1. Intentar endpoint consolidado de alto rendimiento
        try {
          const { data } = await axios.get(`${reportesRoute}/dashboard-stats`, auth.config);
          if (data && data.status) {
            setStats({
              totalSocios: Number(data.totalSocios || 0),
              cargosPendientes: Number(data.cargosPendientes || 0),
              totalIngresos: Number(data.totalIngresosMes || data.totalIngresos || 0),
              totalEgresos: Number(data.totalEgresosMes || data.totalEgresos || 0),
              saldoNeto: Number(data.saldoNeto || 0),
            });
            return;
          }
        } catch (e) {
          // Si el endpoint aún no responde o da fallback, continuar con consultas paralelas seguras
        }

        // 2. Fallback de extracción resiliente para estructuras de datos envueltas
        const promesas = [
          axios.get(sociosRoute, auth.config).then((r) => r.data).catch(() => []),
          axios.get(`${cargosRoute}?estado=Pendiente`, auth.config).then((r) => r.data).catch(() => []),
          axios.get(ingresosRoute, auth.config).then((r) => r.data).catch(() => []),
          axios.get(egresosRoute, auth.config).then((r) => r.data).catch(() => []),
        ];

        const [sociosRes, cargosRes, ingresosRes, egresosRes] = await Promise.all(promesas);

        const sociosLista = sociosRes?.socios || (Array.isArray(sociosRes) ? sociosRes : []);
        const cargosLista = cargosRes?.cargos || (Array.isArray(cargosRes) ? cargosRes : []);
        const ingresosLista = ingresosRes?.ingresos || (Array.isArray(ingresosRes) ? ingresosRes : []);
        const egresosLista = egresosRes?.egresos || (Array.isArray(egresosRes) ? egresosRes : []);

        const activos = sociosLista.filter((s) => (s.estado_socio || s.estado) === "Activo" || !s.estado_socio);
        const totIng = ingresosLista
          .filter((i) => i.estado === "Valido" || !i.estado)
          .reduce((s, i) => s + parseFloat(i.monto_total_recibido || i.monto_total || 0), 0);
        const totEg = egresosLista.reduce((s, e) => s + parseFloat(e.monto || 0), 0);

        setStats({
          totalSocios: activos.length || sociosLista.length,
          cargosPendientes: cargosLista.length,
          totalIngresos: totIng,
          totalEgresos: totEg,
          saldoNeto: totIng - totEg,
        });
      } catch (err) {
        console.error("Error cargando estadísticas:", err);
        toast.error("No se pudieron cargar las estadísticas", toastOptions);
      } finally {
        setLoadingStats(false);
      }
    };

    if (auth?.config) fetchStats();
  }, [auth]);

  const getRoleLabel = () => {
    switch (auth?.rol) {
      case ROLES.SUPERADMIN_SAAS: return "Superadministrador SaaS";
      case ROLES.ADMIN_ASOCIACION: return "Administrador de Asociación";
      case ROLES.PRESIDENTE: return "Presidente de la Asociación";
      case ROLES.SEC_HACIENDA: return "Secretaria de Hacienda";
      case ROLES.SEC_NACIONAL: return "Secretaria de Conflictos";
      case ROLES.CAJERO: return "Cajero / Operador";
      case ROLES.LECTURADOR: return "Operador Lecturador";
      default: return auth?.rol || "Usuario";
    }
  };

  const formatMonto = (monto) =>
    `Bs. ${Number(monto || 0).toLocaleString("es-BO", { minimumFractionDigits: 2 })}`;

  const puedeVerFinanzas = [
    ROLES.PRESIDENTE,
    ROLES.SEC_HACIENDA,
    ROLES.ADMIN_ASOCIACION,
    ROLES.SUPERADMIN_SAAS,
    ROLES.CAJERO,
  ].includes(auth?.rol);

  return (
    <PageContainer>
      <Sidebar />
      <ContentContainer>
        {/* Cabecera */}
        <SectionHeader>
          <div className="titles">
            <h1>Panel de Control Principal</h1>
            <p>Métricas consolidadas y estado financiero de la asociación en tiempo real</p>
          </div>
        </SectionHeader>

        {/* Bienvenida personalizada por Asociación y Usuario */}
        <WelcomeCard>
          <div>
            <h2>
              ¡Bienvenido a {auth?.nombre_asociacion || auth?.asociacion?.nombre_mercado || "la Asociación"}! 👋
            </h2>
            <p>
              Usuario: <strong>{auth?.nombres ? `${auth.nombres} ${auth.apellidos || ""}`.trim() : (auth?.username || "Usuario")}</strong> ({auth?.username}) — Panel de control operativo.
            </p>
          </div>
          <span className="rol-badge">{getRoleLabel()}</span>
        </WelcomeCard>

        {/* Tarjetas de estadísticas */}
        <StatsGrid>
          <StatCard>
            <StatIcon $bg="rgba(16, 185, 129, 0.15)">👥</StatIcon>
            <StatInfo>
              <h3>{loadingStats ? "..." : stats.totalSocios}</h3>
              <p>Socios Activos</p>
            </StatInfo>
          </StatCard>

          <StatCard>
            <StatIcon $bg="rgba(245, 158, 11, 0.15)">📋</StatIcon>
            <StatInfo>
              <h3>{loadingStats ? "..." : stats.cargosPendientes}</h3>
              <p>Cargos Pendientes de Cobro</p>
            </StatInfo>
          </StatCard>

          {puedeVerFinanzas && (
            <>
              <StatCard>
                <StatIcon $bg="rgba(14, 165, 233, 0.15)">💰</StatIcon>
                <StatInfo>
                  <h3 style={{ fontSize: "1.25rem", color: theme.colors.primary }}>
                    {loadingStats ? "..." : formatMonto(stats.totalIngresos)}
                  </h3>
                  <p>Ingresos Recaudados (Mes)</p>
                </StatInfo>
              </StatCard>

              <StatCard>
                <StatIcon $bg="rgba(239, 68, 68, 0.15)">💸</StatIcon>
                <StatInfo>
                  <h3 style={{ fontSize: "1.25rem", color: theme.colors.danger }}>
                    {loadingStats ? "..." : formatMonto(stats.totalEgresos)}
                  </h3>
                  <p>Egresos y Gastos (Mes)</p>
                </StatInfo>
              </StatCard>

              <StatCard>
                <StatIcon $bg="rgba(16, 185, 129, 0.15)">🏦</StatIcon>
                <StatInfo>
                  <h3 style={{ fontSize: "1.25rem", color: stats.saldoNeto >= 0 ? theme.colors.success : theme.colors.danger }}>
                    {loadingStats ? "..." : formatMonto(stats.saldoNeto)}
                  </h3>
                  <p>Saldo Neto Disponible en Caja</p>
                </StatInfo>
              </StatCard>
            </>
          )}
        </StatsGrid>
      </ContentContainer>
    </PageContainer>
  );
}

export default HomePage;
