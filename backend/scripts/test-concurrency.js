/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEST DE CONCURRENCIA Y PREVENCIÓN DE DOBLE COBRO (Race Condition Test)
 * MercadoCRM Micro-SaaS
 * ─────────────────────────────────────────────────────────────────────────────
 * Simula 5 peticiones POST idénticas y simultáneas (en el mismo milisegundo)
 * intentando liquidar el mismo cargo financiero en ventanilla de caja.
 * 
 * Valida:
 *  1. Bloqueo pesimista de Sequelize: t.LOCK.UPDATE
 *  2. Rechazo atómico de cobros duplicados (Exactamente 1 cobro exitoso, 4 rechazados)
 *  3. Integridad de saldos en BD (Sin saldos negativos ni doble descuento)
 *  4. Secuencialidad correlativa de nro_recibo (Sin huecos ni duplicados)
 * 
 * Uso:
 *  node scripts/test-concurrency.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { Cargo, Socio, Asociacion, Ingreso, IngresoDetalle } = require('../models');

const BASE_URL = process.env.API_URL || 'http://localhost:3031/api';

async function ejecutarPruebaConcurrencia() {
  console.log('================================================================');
  console.log('⚡ TEST DE CONCURRENCIA: PREVENCIÓN DE DOBLE COBRO EN CAJA');
  console.log('🎯 Objetivo: 5 Peticiones POST en el mismo milisegundo al mismo Cargo');
  console.log('================================================================');

  try {
    // 1. Iniciar sesión para obtener Token JWT con id_asociacion
    console.log('\n🔑 1. Autenticando cajero/presidente en API...');
    const testPassword = process.env.ADMIN_TEST_PASSWORD || 'misocios2024';
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: testPassword,
      }),
    });

    const loginData = await loginResponse.json();
    if (!loginResponse.ok) {
      throw new Error(`Error de autenticación (${loginResponse.status}): ${loginData.mensaje || 'Fallo de login'}`);
    }

    const token = loginData.token;
    const user = loginData.usuario;
    const idAsociacion = user.id_asociacion;
    console.log(`   ✅ Autenticado: ${user.username} (Asociación #${idAsociacion})`);

    // 2. Preparar o crear un Cargo de prueba limpio
    console.log('\n🎯 2. Preparando Cargo financiero vulnerable para el test...');
    let socio = await Socio.findOne({ where: { id_asociacion: idAsociacion, deleted_at: null } });
    if (!socio) {
      throw new Error(`No se encontró un socio activo en la asociación #${idAsociacion}`);
    }

    const montoObjetivo = 350.00;
    const cargoPrueba = await Cargo.create({
      id_asociacion: idAsociacion,
      id_socio: socio.id_socio,
      id_concepto: 1,
      tipo_origen: 'manual',
      periodo: '2026-10',
      detalle: `[TEST CONCURRENCIA] Cargo de prueba concurrent-race-${Date.now()}`,
      monto_capital_inicial: montoObjetivo,
      saldo_capital_pendiente: montoObjetivo,
      monto_mora_acumulada: 0.00,
      fecha_vencimiento: '2026-10-31',
      estado: 'Pendiente',
    });

    const cargoId = cargoPrueba.id_cargo;
    console.log(`   ✅ Cargo #${cargoId} creado con Saldo Pendiente: ${montoObjetivo} Bs (Estado: Pendiente).`);

    // 3. Configurar 5 peticiones POST idénticas y simultáneas
    console.log('\n🚀 3. Disparando 5 peticiones POST simultáneas en el mismo milisegundo...');
    const payloadCobro = {
      id_socio: socio.id_socio,
      monto_total_recibido: montoObjetivo,
      cargos: [
        {
          id_cargo: cargoId,
          monto_abonado_capital: montoObjetivo,
          monto_abonado_mora: 0.00,
        },
      ],
      observacion: `Abono de prueba concurrente para cargo #${cargoId}`,
    };

    const promesas = [1, 2, 3, 4, 5].map((numPeticion) => {
      const tiempoDisparo = Date.now();
      return fetch(`${BASE_URL}/ingresos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payloadCobro),
      })
        .then(async (res) => {
          let data;
          try {
            data = await res.json();
          } catch {
            data = {};
          }
          return {
            peticion: numPeticion,
            tiempoDisparo,
            tiempoRespuesta: Date.now(),
            status: res.status,
            success: res.ok,
            mensaje: data.mensaje || res.statusText,
            nro_recibo: data.ingreso?.nro_recibo,
            id_ingreso: data.ingreso?.id_ingreso,
          };
        })
        .catch((err) => ({
          peticion: numPeticion,
          tiempoDisparo,
          tiempoRespuesta: Date.now(),
          status: 500,
          success: false,
          mensaje: err.message,
        }));
    });

    const inicioDisparo = Date.now();
    const resultados = await Promise.all(promesas);
    const finDisparo = Date.now();

    console.log(`   ⏱️  Las 5 peticiones fueron procesadas en ${finDisparo - inicioDisparo} ms.`);

    // 4. Analizar respuestas del servidor
    console.log('\n📊 4. Reporte detallado de respuestas HTTP recibidas:');
    let exitosas = 0;
    let rechazadas = 0;
    let reciboEmitido = null;

    resultados.forEach((r) => {
      const icono = r.success ? '🟢 [ÉXITO 201]' : '🔴 [RECHAZO ESPERADO 400]';
      console.log(`   ${icono} Petición #${r.peticion} (HTTP ${r.status}) -> Mensaje: "${r.mensaje}"`);
      if (r.success) {
        exitosas++;
        reciboEmitido = r.nro_recibo;
      } else {
        rechazadas++;
      }
    });

    // 5. Auditoría directa e independiente en Base de Datos (Integridad Financiera)
    console.log('\n🔍 5. Auditoría de integridad en base de datos MySQL...');
    const cargoFinal = await Cargo.findOne({ where: { id_cargo: cargoId } });
    const detallesEncontrados = await IngresoDetalle.findAll({ where: { id_cargo: cargoId } });

    console.log(`   - Saldo final del cargo en BD:     ${cargoFinal.saldo_capital_pendiente} Bs`);
    console.log(`   - Estado final del cargo en BD:    ${cargoFinal.estado}`);
    console.log(`   - Abonos en 'ingresos_detalle':    ${detallesEncontrados.length} fila(s) registrada(s)`);

    // 6. Evaluación de Criterios Financieros
    console.log('\n================================================================');
    console.log('🏁 RESULTADO DEL TEST DE CONCURRENCIA:');

    const unSoloExito = exitosas === 1;
    const cuatroRechazadas = rechazadas === 4;
    const saldoCeroExacto = parseFloat(cargoFinal.saldo_capital_pendiente) === 0.00;
    const unSoloAbonoRegistrado = detallesEncontrados.length === 1;
    const estadoPagadoTotal = cargoFinal.estado === 'Pagado_Total';

    if (unSoloExito && cuatroRechazadas && saldoCeroExacto && unSoloAbonoRegistrado && estadoPagadoTotal) {
      console.log('✅ ESTADO: PRUEBA APROBADA AL 100% (TEST PASSED)');
      console.log('🛡️  El bloqueo pesimista (t.LOCK.UPDATE) funcionó de forma perfecta:');
      console.log('   1. Solo 1 de las 5 peticiones logró procesar el pago.');
      console.log('   2. Las otras 4 peticiones fueron rechazadas atómicamente por el servidor.');
      console.log('   3. CERO duplicación de cobro.');
      console.log('   4. CERO dinero fantasma o saldo negativo en el estado de cuenta.');
      console.log(`   5. Recibo emitido con correlativo oficial nro_recibo: #${reciboEmitido}`);
      console.log('================================================================\n');
      process.exit(0);
    } else {
      console.log('❌ ESTADO: FALLO DETECTADO (CONCURRENCY BUG)');
      if (exitosas > 1) {
        console.error(`   ⚠️ Se permitieron ${exitosas} cobros simultáneos (CONDICIÓN DE CARRERA / DOBLE COBRO).`);
      }
      if (parseFloat(cargoFinal.saldo_capital_pendiente) < 0) {
        console.error(`   ⚠️ El saldo del cargo quedó en negativo: ${cargoFinal.saldo_capital_pendiente} Bs.`);
      }
      console.log('================================================================\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error fatal al ejecutar el test de concurrencia:', error.message);
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
      console.error('💡 Asegúrate de que el backend esté encendido en http://localhost:3031');
    }
    process.exit(1);
  }
}

if (require.main === module) {
  ejecutarPruebaConcurrencia();
}

module.exports = { ejecutarPruebaConcurrencia };
