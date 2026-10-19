const { Router } = require('express');
const { createIngreso, createIngresoDirecto, getIngresos, getIngreso, anularIngreso } = require('../controllers/ingresoController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { cobroIngresoSchema, ingresoDirectoSchema, anularIngresoSchema } = require('../validators/schemas');

const router = Router();

// Todas las operaciones requieren autenticación JWT y asociación activa
router.use(authMiddleware);

// 1. Listar y consultar recibos de ingreso
router.get('/', getIngresos);
router.get('/:id', getIngreso);

// 2. Registro de pagos en ventanilla por cargos acumulados (Luz, Serenaje, Multas)
router.post(
  '/',
  requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE', 'CAJERO', 'SEC_HACIENDA']),
  validate(cobroIngresoSchema),
  createIngreso
);

// 2.1 Registro de ingresos directos (Traspaso de caseta 10%, Afiliación nuevo socio, Donaciones, etc.)
router.post(
  '/directo',
  requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE', 'CAJERO', 'SEC_HACIENDA']),
  validate(ingresoDirectoSchema),
  createIngresoDirecto
);

// 3. Flujo seguro de anulación de recibos (Exclusivo para ADMIN_ASOCIACION / PRESIDENTE)
router.post(
  '/:id/anular',
  requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']),
  validate(anularIngresoSchema),
  anularIngreso
);

// Compatibilidad con clientes que envíen PUT para anular
router.put(
  '/:id/anular',
  requireRole(['ADMIN_ASOCIACION', 'PRESIDENTE']),
  validate(anularIngresoSchema),
  anularIngreso
);

// 4. REGLA DE ORO: PROHIBIDO BORRAR DINERO (Deshabilitar DELETE)
router.delete('*', (req, res) => {
  return res.status(405).json({
    status: 'error',
    mensaje: 'Prohibido eliminar registros contables o financieros de ingresos. Utilice el procedimiento de anulación auditada.',
  });
});

module.exports = router;
