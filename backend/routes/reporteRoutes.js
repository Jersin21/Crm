const { Router } = require('express');
const {
  getReporteIngresos,
  getReporteEgresos,
  getReporteBalanceGeneral,
  getDashboardStats,
  getEstadoCuentaSocio,
} = require('../controllers/reporteController');
const { checkAuth } = require('../middleware/authMiddleware');

const router = Router();

router.use(checkAuth);

// GET /api/reportes/dashboard-stats - Métricas consolidadas en tiempo real para Dashboard
router.get('/dashboard-stats', getDashboardStats);
// GET /api/reportes/ingresos?fecha_inicio=2026-01-01&fecha_fin=2026-12-31
router.get('/ingresos',    getReporteIngresos);
// GET /api/reportes/egresos?fecha_inicio=2026-01-01&fecha_fin=2026-12-31
router.get('/egresos',     getReporteEgresos);
// GET /api/reportes/balance?fecha_inicio=2026-01-01&fecha_fin=2026-12-31
router.get('/balance',     getReporteBalanceGeneral);
// GET /api/reportes/socio/:id - Estado de cuenta completo de un socio
router.get('/socio/:id',   getEstadoCuentaSocio);

module.exports = router;
