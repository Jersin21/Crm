const { z } = require('zod');

// Coerción numérica segura para montos e IDs
const numericId = z.coerce.number().int().positive({ message: 'El ID debe ser un número entero positivo' });
const nonNegativeAmount = z.coerce.number().min(0, { message: 'El monto no puede ser negativo' });
const positiveAmount = z.coerce.number().gt(0, { message: 'El monto debe ser estrictamente mayor a 0' });

// 1. Esquema de Autenticación
const loginSchema = z.object({
  body: z.object({
    username: z.string().trim().min(1, { message: 'El nombre de usuario es obligatorio' }),
    password: z.string().min(1, { message: 'La contraseña es obligatoria' }),
  }),
});

// 2. Esquema de Cobro en Caja (Ingresos por Cargos Pendientes)
const cobroIngresoSchema = z.object({
  body: z.object({
    id_socio: numericId,
    cargos: z.array(
      z.union([
        numericId,
        z.object({
          id_cargo: numericId,
          monto_abonado_capital: nonNegativeAmount.optional(),
          monto_abonado_mora: nonNegativeAmount.optional(),
        }).passthrough(),
      ])
    ).min(1, { message: 'Debe incluir al menos un cargo para procesar el cobro' }),
    monto_total_recibido: nonNegativeAmount,
    observacion: z.string().optional(),
    fecha_pago: z.string().optional(),
  }),
});

// 2.1 Esquema de Registro de Ingreso Directo (Traspaso 10%, Afiliación nuevo socio, Donaciones, etc.)
const ingresoDirectoSchema = z.object({
  body: z.object({
    id_socio: numericId.optional().nullable(),
    monto: positiveAmount,
    concepto: z.string().trim().min(3, { message: 'El concepto del ingreso debe tener al menos 3 caracteres' }).optional(),
    detalle: z.string().trim().optional(),
    observacion: z.string().trim().optional(),
    pagador: z.string().trim().optional(),
    fecha_pago: z.string().optional(),
    tipo_origen: z.string().optional(),
    porcentaje_traspaso: z.coerce.number().min(0).max(100).optional(),
    valor_venta_caseta: z.coerce.number().min(0).optional(),
  }),
});

// 3. Esquema de Anulación de Recibo (Obliga a justificar el motivo)
const anularIngresoSchema = z.object({
  params: z.object({
    id: numericId,
  }),
  body: z.object({
    observacion: z.string().trim().min(5, { message: 'El motivo de la anulación es obligatorio (mínimo 5 caracteres)' })
      .or(z.undefined()),
    motivo: z.string().trim().min(5, { message: 'El motivo de la anulación es obligatorio (mínimo 5 caracteres)' })
      .optional(),
  }).refine((data) => (data.observacion && data.observacion.length >= 5) || (data.motivo && data.motivo.length >= 5), {
    message: 'Debe proporcionar un motivo obligatorio para la anulación (mínimo 5 caracteres)',
    path: ['observacion'],
  }),
});

// 4. Esquema de Consumo de Luz
const consumoLuzSchema = z.object({
  body: z.object({
    id_socio: numericId,
    lectura_actual: nonNegativeAmount,
    lectura_anterior: nonNegativeAmount.optional(),
    fecha_lectura: z.string().optional(),
    mes_anio: z.string().optional(),
  }),
});

// 5. Esquema de Egresos
const egresoSchema = z.object({
  body: z.object({
    id_tipo_egreso: numericId,
    monto: positiveAmount,
    detalle: z.string().trim().min(3, { message: 'El detalle del gasto debe tener al menos 3 caracteres' }),
    fecha_gasto: z.string().optional(),
  }),
});

// 6. Esquema de Configuración y Tarifas
const configAsociacionSchema = z.object({
  body: z.object({
    precio_kwh: z.coerce.number().gt(0, { message: 'El precio del kWh debe ser mayor a 0' }).optional(),
    monto_serenaje: nonNegativeAmount.optional(),
    dia_corte_serenaje: z.coerce.number().int().min(1).max(31).optional(),
    multa_asamblea: nonNegativeAmount.optional(),
    multa_marcha: nonNegativeAmount.optional(),
    nombre_mercado: z.string().optional(),
    direccion: z.string().optional(),
    telefono: z.string().optional(),
  }),
});

module.exports = {
  loginSchema,
  cobroIngresoSchema,
  ingresoDirectoSchema,
  anularIngresoSchema,
  consumoLuzSchema,
  egresoSchema,
  configAsociacionSchema,
};
