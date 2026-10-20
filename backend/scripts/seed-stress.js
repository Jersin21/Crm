/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SEED DE ESTRÉS Y VOLUMEN MASIVO (Performance & Stress Testing)
 * MercadoCRM Micro-SaaS
 * ─────────────────────────────────────────────────────────────────────────────
 * Genera datos a escala masiva sin desbordamiento de memoria (OOM):
 *  - 5 Asociaciones (Reutiliza existentes o crea nuevas)
 *  - 1,500 Personas y Socios (300 por cada asociación)
 *  - 50,000 Cargos financieros (Mezcla: Pendiente, Pagado_Parcial, Pagado_Total)
 *  - 30,000 Ingresos con sus respectivos 30,000 IngresoDetalle
 * 
 * Uso:
 *  - Generar datos: node scripts/seed-stress.js
 *  - Limpiar datos:  node scripts/seed-stress.js --clean
 * ─────────────────────────────────────────────────────────────────────────────
 */

const {
  sequelize,
  Asociacion,
  Usuario,
  Persona,
  ConceptoCobro,
  TipoEgreso,
  Socio,
  Cargo,
  Ingreso,
  IngresoDetalle,
} = require('../models');

const CHUNK_SIZE = 1000;
const TAG_STRESS = '[STRESS]';
const DOMICILIO_TAG = '[STRESS_DATA]';

const formatMb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

// ─── FUNCIÓN DE LIMPIEZA ─────────────────────────────────────────────────────
async function limpiarDatosEstres() {
  console.log('\n🧹 Iniciando limpieza de datos de prueba masiva (STRESS)...');
  const t = await sequelize.transaction();
  try {
    const startTime = Date.now();

    // 1. Eliminar IngresoDetalle vinculado a cargos o ingresos marcados
    await sequelize.query(
      'DELETE d FROM ingresos_detalle d INNER JOIN cargos c ON d.id_cargo = c.id_cargo WHERE c.detalle LIKE :tag',
      { replacements: { tag: `${TAG_STRESS}%` }, transaction: t }
    );
    await sequelize.query(
      'DELETE d FROM ingresos_detalle d INNER JOIN ingresos i ON d.id_ingreso = i.id_ingreso WHERE i.observacion LIKE :tag',
      { replacements: { tag: `${TAG_STRESS}%` }, transaction: t }
    );
    console.log('   ✅ Detalles de ingreso eliminados.');

    // 2. Eliminar Ingresos
    await sequelize.query(
      'DELETE FROM ingresos WHERE observacion LIKE :tag',
      { replacements: { tag: `${TAG_STRESS}%` }, transaction: t }
    );
    console.log('   ✅ Ingresos de estrés eliminados.');

    // 3. Eliminar Cargos
    await sequelize.query(
      'DELETE FROM cargos WHERE detalle LIKE :tag',
      { replacements: { tag: `${TAG_STRESS}%` }, transaction: t }
    );
    console.log('   ✅ Cargos de estrés eliminados.');

    // 4. Eliminar Socios creados por estrés
    await sequelize.query(
      'DELETE s FROM socios s INNER JOIN personas p ON s.id_persona = p.id_persona WHERE p.domicilio = :domicilio',
      { replacements: { domicilio: DOMICILIO_TAG }, transaction: t }
    );
    console.log('   ✅ Socios de estrés eliminados.');

    // 5. Eliminar Personas creadas por estrés
    await sequelize.query(
      'DELETE FROM personas WHERE domicilio = :domicilio',
      { replacements: { domicilio: DOMICILIO_TAG }, transaction: t }
    );
    console.log('   ✅ Personas de estrés eliminadas.');

    await t.commit();
    const duracion = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Limpieza completada con éxito en ${duracion} segundos. Base de datos restaurada.\n`);
  } catch (err) {
    await t.rollback();
    console.error('❌ Error durante la limpieza de datos:', err);
    process.exit(1);
  }
}

// ─── FUNCIÓN GENERADORA MASIVA ───────────────────────────────────────────────
async function ejecutarSeedEstres() {
  console.log('================================================================');
  console.log('🚀 INICIANDO INYECCIÓN MASIVA DE RENDIMIENTO (SEED STRESS)');
  console.log('🎯 Objetivos: 5 Asocs | 1,500 Socios | 50,000 Cargos | 30,000 Ingresos');
  console.log('================================================================');
  const globalStartTime = Date.now();

  try {
    // 1. Obtener o garantizar 5 Asociaciones y sus conceptos base
    let asociaciones = await Asociacion.findAll({ limit: 5 });
    if (asociaciones.length < 5) {
      console.log('ℹ️ Se requieren 5 asociaciones activas. Creando las faltantes...');
      for (let i = asociaciones.length + 1; i <= 5; i++) {
        const nuevaAsoc = await Asociacion.create({
          nombre_mercado: `Mercado Stress Test #${i}`,
          direccion: `Av. Circunvalación #${i * 100}`,
          estado: true,
          precio_kwh: 2.00,
          monto_serenaje: 20.00,
          dia_corte_serenaje: 5,
        });
        asociaciones.push(nuevaAsoc);
      }
    }
    const asocIds = asociaciones.map((a) => a.id_asociacion);
    console.log(`✅ 5 Asociaciones listas para prueba: IDs [${asocIds.join(', ')}]`);

    // Obtener un usuario por asociación para asignar como cajero en los ingresos
    const usuariosAsoc = {};
    for (const aId of asocIds) {
      let u = await Usuario.findOne({ where: { id_asociacion: aId } });
      if (!u) {
        u = await Usuario.findOne(); // Fallback
      }
      usuariosAsoc[aId] = u ? u.id_usuario : 1;
    }

    // Obtener un concepto por asociación
    const conceptosAsoc = {};
    for (const aId of asocIds) {
      let c = await ConceptoCobro.findOne({ where: { id_asociacion: aId } });
      if (!c) {
        c = await ConceptoCobro.create({
          id_asociacion: aId,
          nombre_concepto: 'Cuota General Operativa',
        });
      }
      conceptosAsoc[aId] = c.id_concepto;
    }

    // 2. Insertar 1,500 Personas (300 por Asociación)
    console.log('\n📦 Generando 1,500 Personas para el padrón de socios...');
    const personasData = [];
    const fechaActual = new Date();

    let contadorGeneral = 1;
    for (const aId of asocIds) {
      for (let s = 1; s <= 300; s++) {
        personasData.push({
          nombres: `SocioStress_${aId}_${s}`,
          apellidos: `Pérez_${contadorGeneral}`,
          ci: `STR-${aId}-${s}-${contadorGeneral}`,
          telefono: `7${String(contadorGeneral).padStart(7, '0')}`,
          domicilio: DOMICILIO_TAG,
          created_at: fechaActual,
          updated_at: fechaActual,
        });
        contadorGeneral++;
      }
    }

    // Bulk insert Personas
    const personasCreadas = await Persona.bulkCreate(personasData, { validate: false });
    console.log(`   ✅ 1,500 Personas creadas con éxito. (Memoria Heap: ${formatMb(process.memoryUsage().heapUsed)})`);

    // 3. Insertar 1,500 Socios
    console.log('\n📦 Vinculando 1,500 Socios con casetas a las 5 asociaciones...');
    const sociosData = [];
    let pIdx = 0;
    for (const aId of asocIds) {
      for (let s = 1; s <= 300; s++) {
        sociosData.push({
          id_persona: personasCreadas[pIdx].id_persona,
          id_asociacion: aId,
          nro_caseta: `ST-${s}`,
          estado_socio: 'Activo',
          created_at: fechaActual,
          updated_at: fechaActual,
        });
        pIdx++;
      }
    }
    const sociosCreados = await Socio.bulkCreate(sociosData, { validate: false });
    console.log(`   ✅ 1,500 Socios creados con éxito (300 por mercado). (Memoria Heap: ${formatMb(process.memoryUsage().heapUsed)})`);

    // 4. Inyección Masiva de 50,000 Cargos Financieros
    console.log('\n📦 Generando e insertando 50,000 Cargos Financieros en batches de 5,000...');
    const TOTAL_CARGOS = 50000;
    const tiposOrigen = ['consumo_luz', 'serenaje', 'evento', 'traspaso', 'afiliacion'];
    const estados = ['Pendiente', 'Pagado_Parcial', 'Pagado_Total'];
    const idSociosList = sociosCreados.map((s) => ({ id_socio: s.id_socio, id_asociacion: s.id_asociacion }));

    const fechaBase = new Date('2024-01-01');

    for (let i = 0; i < TOTAL_CARGOS; i += CHUNK_SIZE) {
      const chunkCargos = [];
      const chunkEnd = Math.min(i + CHUNK_SIZE, TOTAL_CARGOS);

      for (let j = i; j < chunkEnd; j++) {
        const socioElegido = idSociosList[j % idSociosList.length];
        const aId = socioElegido.id_asociacion;
        const estadoCargo = estados[j % estados.length];
        const montoInicial = (20 + (j % 150)).toFixed(2);
        let saldoPendiente = montoInicial;

        if (estadoCargo === 'Pagado_Total') saldoPendiente = '0.00';
        else if (estadoCargo === 'Pagado_Parcial') saldoPendiente = (parseFloat(montoInicial) / 2).toFixed(2);

        const fechaVenc = new Date(fechaBase.getTime() + (j % 700) * 86400000).toISOString().slice(0, 10);
        const mesPeriodo = fechaVenc.slice(0, 7);

        chunkCargos.push({
          id_asociacion: aId,
          id_socio: socioElegido.id_socio,
          id_concepto: conceptosAsoc[aId] || 1,
          tipo_origen: tiposOrigen[j % tiposOrigen.length],
          periodo: mesPeriodo,
          detalle: `${TAG_STRESS} Cargo #${j + 1} histórico para prueba de carga masiva`,
          monto_capital_inicial: montoInicial,
          saldo_capital_pendiente: saldoPendiente,
          monto_mora_acumulada: (j % 5 === 0) ? '10.00' : '0.00',
          fecha_vencimiento: fechaVenc,
          estado: estadoCargo,
          created_at: fechaActual,
          updated_at: fechaActual,
        });
      }

      await Cargo.bulkCreate(chunkCargos, { validate: false, hooks: false });
      console.log(`   ➡️ Cargos insertados: ${chunkEnd}/${TOTAL_CARGOS} (Heap: ${formatMb(process.memoryUsage().heapUsed)})`);
    }

    // 5. Inyección Masiva de 30,000 Ingresos y sus Detalles
    console.log('\n📦 Generando e insertando 30,000 Ingresos y 30,000 IngresoDetalle en batches...');
    const TOTAL_INGRESOS = 30000;

    // Obtener los primeros 30,000 cargos generados para vincularlos con exactitud relacional
    const [cargosParaIngreso] = await sequelize.query(
      `SELECT id_cargo, id_asociacion, id_socio, monto_capital_inicial FROM cargos WHERE detalle LIKE '${TAG_STRESS}%' LIMIT ${TOTAL_INGRESOS}`
    );

    for (let i = 0; i < TOTAL_INGRESOS; i += CHUNK_SIZE) {
      const chunkIngresos = [];
      const chunkEnd = Math.min(i + CHUNK_SIZE, TOTAL_INGRESOS);

      for (let j = i; j < chunkEnd; j++) {
        const refCargo = cargosParaIngreso[j] || cargosParaIngreso[0];
        const aId = refCargo.id_asociacion;
        const monto = parseFloat(refCargo.monto_capital_inicial || '50.00').toFixed(2);
        const fechaPago = new Date(fechaBase.getTime() + (j % 650) * 86400000).toISOString().slice(0, 10);

        chunkIngresos.push({
          nro_recibo: 100000 + j,
          id_asociacion: aId,
          id_socio: refCargo.id_socio,
          id_usuario: usuariosAsoc[aId] || 1,
          id_concepto: conceptosAsoc[aId] || 1,
          concepto: 'Cobro de Cuota Ordinaria',
          tipo_origen: 'cargos',
          pagador: `Socio Contribuyente #${refCargo.id_socio}`,
          monto_total_recibido: monto,
          fecha_pago: fechaPago,
          estado: 'Valido',
          observacion: `${TAG_STRESS} Pago procesado exitosamente por caja`,
          created_at: fechaActual,
          updated_at: fechaActual,
        });
      }

      // Insertar ingresos de este chunk
      const ingresosInsertados = await Ingreso.bulkCreate(chunkIngresos, { validate: false, hooks: false });

      // Generar detalles correspondientes al chunk
      const chunkDetalles = [];
      for (let k = 0; k < ingresosInsertados.length; k++) {
        const ing = ingresosInsertados[k];
        const refCargo = cargosParaIngreso[i + k];

        chunkDetalles.push({
          id_ingreso: ing.id_ingreso,
          id_cargo: refCargo ? refCargo.id_cargo : cargosParaIngreso[0].id_cargo,
          monto_abonado_capital: ing.monto_total_recibido,
          monto_abonado_mora: '0.00',
          created_at: fechaActual,
          updated_at: fechaActual,
        });
      }

      await IngresoDetalle.bulkCreate(chunkDetalles, { validate: false, hooks: false });
      console.log(`   ➡️ Ingresos y Detalles insertados: ${chunkEnd}/${TOTAL_INGRESOS} (Heap: ${formatMb(process.memoryUsage().heapUsed)})`);
    }

    const duracionTotal = ((Date.now() - globalStartTime) / 1000).toFixed(2);
    console.log('================================================================');
    console.log(`🏆 SEED DE ESTRÉS COMPLETADO EXITOSAMENTE`);
    console.log(`⏱️  Tiempo total empleado: ${duracionTotal} segundos`);
    console.log(`📊 Estadísticas inyectadas:`);
    console.log(`   - 5 Asociaciones preparadas`);
    console.log(`   - 1,500 Socios y Personas`);
    console.log(`   - 50,000 Cargos`);
    console.log(`   - 30,000 Ingresos y 30,000 IngresosDetalle`);
    console.log(`💡 Para limpiar esta data en cualquier momento ejecuta:`);
    console.log(`   node scripts/seed-stress.js --clean`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ Error fatal en el proceso de inyección masiva:', err);
    process.exit(1);
  }
}

// ─── CONTROL DE EJECUCIÓN (CLI) ──────────────────────────────────────────────
if (require.main === module) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_STRESS_SEED !== 'true') {
    console.error('⛔ SEGURIDAD: seed-stress está deshabilitado en producción sin ALLOW_STRESS_SEED=true');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (args.includes('--clean') || args.includes('-c') || args.includes('--purge')) {
    limpiarDatosEstres().then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    ejecutarSeedEstres().then(() => process.exit(0)).catch(() => process.exit(1));
  }
}

module.exports = { ejecutarSeedEstres, limpiarDatosEstres };
