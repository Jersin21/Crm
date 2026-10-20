const { sequelize } = require('../models');

/**
 * Script de migración de índices compuestos Multi-tenant para optimización de consultas
 */
async function migrateIndexes() {
  console.log('--- Iniciando creación de índices compuestos de rendimiento ---');
  await sequelize.authenticate();

  const queryInterface = sequelize.getQueryInterface();

  const indexDefinitions = [
    // 1. Cargos
    {
      table: 'cargos',
      name: 'idx_cargos_asoc_socio_estado',
      fields: ['id_asociacion', 'id_socio', 'estado'],
    },
    {
      table: 'cargos',
      name: 'idx_cargos_asoc_estado_venc',
      fields: ['id_asociacion', 'estado', 'fecha_vencimiento'],
    },
    {
      table: 'cargos',
      name: 'idx_cargos_asoc_concepto',
      fields: ['id_asociacion', 'id_concepto'],
    },
    {
      table: 'cargos',
      name: 'idx_cargos_asoc_periodo',
      fields: ['id_asociacion', 'periodo'],
    },
    {
      table: 'cargos',
      name: 'idx_cargos_origen',
      fields: ['tipo_origen', 'id_referencia_origen'],
    },

    // 2. Ingresos
    {
      table: 'ingresos',
      name: 'idx_ingresos_asoc_recibo',
      fields: ['id_asociacion', 'nro_recibo'],
    },
    {
      table: 'ingresos',
      name: 'idx_ingresos_asoc_socio',
      fields: ['id_asociacion', 'id_socio'],
    },
    {
      table: 'ingresos',
      name: 'idx_ingresos_asoc_fecha',
      fields: ['id_asociacion', 'fecha_pago'],
    },
    {
      table: 'ingresos',
      name: 'idx_ingresos_asoc_estado',
      fields: ['id_asociacion', 'estado'],
    },
    {
      table: 'ingresos',
      name: 'idx_ingresos_asoc_cajero',
      fields: ['id_asociacion', 'id_usuario'],
    },

    // 2.1 Ingresos Detalle
    {
      table: 'ingresos_detalle',
      name: 'idx_ingresos_det_ingreso',
      fields: ['id_ingreso'],
    },
    {
      table: 'ingresos_detalle',
      name: 'idx_ingresos_det_cargo',
      fields: ['id_cargo'],
    },

    // 3. Socios
    {
      table: 'socios',
      name: 'idx_socios_asoc_estado',
      fields: ['id_asociacion', 'estado_socio'],
    },
    {
      table: 'socios',
      name: 'idx_socios_asoc_persona',
      fields: ['id_asociacion', 'id_persona'],
    },
    {
      table: 'socios',
      name: 'idx_socios_asoc_caseta',
      fields: ['id_asociacion', 'nro_caseta'],
    },

    // 4. Consumos Luz
    {
      table: 'consumos_luz',
      name: 'idx_consumo_socio_mes',
      fields: ['id_socio', 'mes_anio'],
    },
    {
      table: 'consumos_luz',
      name: 'idx_consumo_socio_fecha',
      fields: ['id_socio', 'fecha_lectura'],
    },

    // 5. Personas
    {
      table: 'personas',
      name: 'idx_personas_ci',
      fields: ['ci'],
    },
    {
      table: 'personas',
      name: 'idx_personas_apellidos_nombres',
      fields: ['apellidos', 'nombres'],
    },

    // 6. Usuarios
    {
      table: 'usuarios',
      name: 'idx_usuarios_asociacion',
      fields: ['id_asociacion'],
    },
    {
      table: 'usuarios',
      name: 'idx_usuarios_persona',
      fields: ['id_persona'],
    },

    // 7. Conceptos y Tipos de Egreso
    {
      table: 'conceptos_cobro',
      name: 'idx_conceptos_asoc_nombre',
      fields: ['id_asociacion', 'nombre_concepto'],
    },
    {
      table: 'tipos_egreso',
      name: 'idx_tipos_egreso_asoc',
      fields: ['id_asociacion'],
    },

    // 8. Eventos y Asistencias
    {
      table: 'eventos',
      name: 'idx_eventos_asoc_fecha',
      fields: ['id_asociacion', 'fecha'],
    },
    {
      table: 'eventos',
      name: 'idx_eventos_asoc_tipo',
      fields: ['id_asociacion', 'tipo_evento'],
    },
    {
      table: 'asistencias',
      name: 'idx_asistencias_evento_socio',
      fields: ['id_evento', 'id_socio'],
    },
    {
      table: 'asistencias',
      name: 'idx_asistencias_socio',
      fields: ['id_socio'],
    },

    // 9. Aportes y Egresos
    {
      table: 'aportes_extraordinarios',
      name: 'idx_aportes_asoc_estado',
      fields: ['id_asociacion', 'estado'],
    },
    {
      table: 'egresos',
      name: 'idx_egresos_asoc_fecha',
      fields: ['id_asociacion', 'fecha_gasto'],
    },
    {
      table: 'egresos',
      name: 'idx_egresos_tipo',
      fields: ['id_tipo_egreso'],
    },
  ];

  for (const def of indexDefinitions) {
    try {
      await queryInterface.addIndex(def.table, def.fields, {
        name: def.name,
      });
      console.log(`✅ Índice creado: ${def.table}.${def.name} (${def.fields.join(', ')})`);
    } catch (error) {
      if (error.message && (error.message.includes('Duplicate key name') || error.message.includes('already exists'))) {
        console.log(`ℹ️ Índice ya existía: ${def.table}.${def.name}`);
      } else {
        console.warn(`⚠️ Advertencia al crear ${def.name}:`, error.message);
      }
    }
  }

  console.log('--- Migración de índices finalizada con éxito ---');
}

if (require.main === module) {
  migrateIndexes()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error fatal al migrar índices:', err);
      process.exit(1);
    });
}

module.exports = { migrateIndexes };
