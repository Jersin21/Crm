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
