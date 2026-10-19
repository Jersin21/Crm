const { Router } = require('express');
const { registrarConsumo, getConsumos, getConsumoSocio, getTarifaLuz } = require('../controllers/consumoLuzController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { consumoLuzSchema } = require('../validators/schemas');

const router = Router();

router.use(authMiddleware);

// GET /api/consumo-luz/tarifa - Tarifa actual configurada para la asociación
router.get('/tarifa',      getTarifaLuz);

// POST /api/consumo-luz - Registrar nueva lectura de medidor (LECTURADOR, SEC_NACIONAL, ADMIN_ASOCIACION, PRESIDENTE)
router.post(
  '/',
  requireRole(['LECTURADOR', 'SEC_NACIONAL', 'ADMIN_ASOCIACION', 'PRESIDENTE']),
  validate(consumoLuzSchema),
  registrarConsumo
);

// GET /api/consumo-luz?mes_anio=2026-10 - Listar consumos
router.get('/',            getConsumos);

// GET /api/consumo-luz/socio/:id - Historial de consumos de un socio
router.get('/socio/:id',   getConsumoSocio);

module.exports = router;
