const { Router } = require('express');
const { getCargos, getCargosySocio, calcularMoras, anularCargo, generarSerenajeMes, getResumenDeudasSocios } = require('../controllers/cargoController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

// GET /api/cargos/resumen-socios - Resumen unificado de deudas por socio (Luz, Serenaje, Multas, etc.)
router.get('/resumen-socios',     getResumenDeudasSocios);
// GET /api/cargos?estado=Pendiente&id_socio=1&periodo=2026-10
router.get('/',                  getCargos);
// GET /api/cargos/socio/:id - Cargos pendientes de un socio
router.get('/socio/:id',         getCargosySocio);

// POST /api/cargos/calcular-moras - Ejecutar cálculo de mora (Administración)
router.post('/calcular-moras',   requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']), calcularMoras);
// POST /api/cargos/generar-serenaje - Generar cobro mensual de Serenaje para socios activos
router.post('/generar-serenaje', requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']), generarSerenajeMes);
// PUT /api/cargos/:id/anular - Anular un cargo (Exclusivo ADMIN_ASOCIACION / PRESIDENTE)
router.put('/:id/anular',        requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']), anularCargo);

module.exports = router;
