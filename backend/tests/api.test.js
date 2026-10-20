/**
 * Test Suite Integral para MercadoCRM Backend
 * Cubre:
 * 1. Health check & Conectividad
 * 2. Autenticación (Login admin y token JWT con roles)
 * 3. Consulta de perfil (/api/auth/me)
 * 4. Gestión de Socios (Alta y consulta con caseta)
 * 5. Consumo de Luz (1 kWh = 2 Bs y generación automática de Cargo)
 * 6. Conceptos de Cobro (Serenaje 20 Bs y multas)
 * 7. Eventos, Asambleas y Control de Asistencia (Multa por Falta)
 * 8. Motor Financiero de Cargos y Cálculo de Moras
 * 9. Caja e Ingresos (Cobro en ventanilla, distribución capital/mora y saldo)
 * 10. Egresos (Gastos de oficina y viáticos de directiva)
 * 11. Balance de Caja Grande (Reporte de ingresos, egresos y saldo neto)
 */

const http = require('http');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3031/api';

// Utilidad para peticiones HTTP
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const postData = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Estadísticas de pruebas
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName} ${details ? '- ' + details : ''}`);
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 INICIANDO SUITE DE TESTS INTEGRALES - MERCADOCRM');
  console.log(`🎯 URL Objetivo: ${BASE_URL}`);
  console.log('====================================================\n');

  let adminToken = null;
  let socioId = null;
  let eventoId = null;
  let cargoLuzId = null;
  let ingresoId = null;

  try {
    // ----------------------------------------------------
    // TEST 1: Health Check
    // ----------------------------------------------------
    console.log('📌 Módulo 1: Health Check & Conectividad API');
    const health = await request('GET', '/health');
    assert(health.status === 200, 'API Health Check responde 200 OK');
    assert(health.data.status === 'ok', 'API Status es "ok"');

    // ----------------------------------------------------
    // TEST 2: Autenticación de Administrador (Presidente)
    // ----------------------------------------------------
    console.log('\n📌 Módulo 2: Autenticación y RBAC');
    const login = await request('POST', '/auth/login', {
      username: 'admin',
      password: 'admin123',
    });
    assert(login.status === 200, 'Login admin responde 200 OK');
    assert(login.data.status === true, 'Login responde status: true');
    assert(!!login.data.user?.access_token, 'Login entrega token JWT de acceso');

    adminToken = login.data.user?.access_token;

    // Verificar perfil con token
    const me = await request('GET', '/auth/me', null, adminToken);
    assert(me.status === 200, 'Endpoint /api/auth/me valida sesión');
    assert(me.data.rol === 'PRESIDENTE', 'Rol del usuario autenticado es PRESIDENTE');

    // ----------------------------------------------------
    // TEST 3: Gestión de Socios (Dueños de Caseta)
    // ----------------------------------------------------
    console.log('\n📌 Módulo 3: Padrón de Socios y Casetas');
    const randomCaseta = Math.floor(100 + Math.random() * 900);
    const nuevoSocio = await request(
      'POST',
      '/socios',
      {
        nro_caseta: randomCaseta,
        nombres: 'Rosario',
        apellidos: 'Quispe Mamani',
        ci: '7891234',
        telefono: '71122334',
        domicilio: 'Calle Bolívar #45',
        estado_socio: 'Activo',
      },
      adminToken
    );
    assert(nuevoSocio.status === 201 || nuevoSocio.status === 200, 'Creación de nuevo socio');
    socioId = nuevoSocio.data.socio?.id_socio || nuevoSocio.data.id_socio;
    assert(!!socioId, `Socio registrado correctamente con ID: ${socioId} (Caseta #${randomCaseta})`);

    const listaSocios = await request('GET', '/socios', null, adminToken);
    assert(listaSocios.status === 200, 'Listado de socios responde 200 OK');
    const socioEncontrado = (listaSocios.data.socios || listaSocios.data).find(
      (s) => s.id_socio === socioId
    );
    assert(!!socioEncontrado, 'El socio recién creado aparece en la lista de la asociación');

    // ----------------------------------------------------
    // TEST 4: Medición de Luz (1 kWh = 2 Bs) & Auto-Cargo
    // ----------------------------------------------------
    console.log('\n📌 Módulo 4: Consumo de Energía Eléctrica (Tarifa 1 kWh = 2 Bs)');
    const lecturaAnterior = 150.0;
    const lecturaActual = 210.0;
    const kwhEsperados = 60.0;
    const montoEsperado = kwhEsperados * 2.0; // 120 Bs

    const registroLuz = await request(
      'POST',
      '/consumo-luz',
      {
        id_socio: socioId,
        mes_anio: '2026-10',
        lectura_anterior: lecturaAnterior,
        lectura_actual: lecturaActual,
        fecha_lectura: '2026-10-05',
      },
      adminToken
    );

    assert(registroLuz.status === 201 || registroLuz.status === 200, 'Registro de lectura de luz');
    const consumo = registroLuz.data.consumo || registroLuz.data;
    assert(
      parseFloat(consumo.kwh_consumidos) === kwhEsperados,
      `Cálculo de kWh correcto: ${kwhEsperados} kWh consumidos`
    );
    assert(
      parseFloat(consumo.monto_calculado) === montoEsperado,
      `Cálculo tarifario a 2 Bs/kWh correcto: ${montoEsperado} Bs`
    );

    // Verificar que se auto-generó el Cargo en cuentas por cobrar
    const cargosSocio = await request('GET', `/cargos/socio/${socioId}`, null, adminToken);
    const listaCargos = Array.isArray(cargosSocio.data)
      ? cargosSocio.data
      : cargosSocio.data.cargos || [];
    const cargoLuz = listaCargos.find((c) => c.tipo_origen === 'luz' || c.detalle?.includes('kWh'));
    assert(!!cargoLuz, 'Se generó automáticamente el Cargo de Luz en la cuenta del socio');
    if (cargoLuz) {
      cargoLuzId = cargoLuz.id_cargo;
      assert(
        parseFloat(cargoLuz.saldo_capital_pendiente) === montoEsperado,
        `Saldo pendiente de luz registrado en ${montoEsperado} Bs`
      );
    }

    // ----------------------------------------------------
    // TEST 5: Eventos y Asistencias con Multa Automática
    // ----------------------------------------------------
    console.log('\n📌 Módulo 5: Eventos, Asambleas y Control de Asistencia');
    const nuevoEvento = await request(
      'POST',
      '/eventos',
      {
        nombre_evento: 'Asamblea General Ordinaria del Mercado',
        tipo_evento: 'Asamblea',
        fecha: '2026-11-15',
        descripcion: 'Aprobación de balances de fin de año',
      },
      adminToken
    );
    assert(nuevoEvento.status === 201 || nuevoEvento.status === 200, 'Creación de evento');
    eventoId = nuevoEvento.data.evento?.id_evento || nuevoEvento.data.id_evento;
    assert(!!eventoId, `Evento creado con ID: ${eventoId}`);

    // Verificar lista de asistencia pre-generada
    const listaAsistencias = await request(
      'GET',
      `/asistencias/evento/${eventoId}`,
      null,
      adminToken
    );
    const asistencias = Array.isArray(listaAsistencias.data)
      ? listaAsistencias.data
      : listaAsistencias.data.asistencias || [];
    assert(asistencias.length > 0, 'Pre-generación automática de lista de asistencia para socios');

    const asistenciaSocio = asistencias.find((a) => a.id_socio === socioId);
    if (asistenciaSocio) {
      // Marcar Falta -> debe aplicar multa por inasistencia si la regla está activa
      const updateAsist = await request(
        'PUT',
        `/asistencias/${asistenciaSocio.id_asistencia}`,
        { estado_asistencia: 'Falta' },
        adminToken
      );
      assert(updateAsist.status === 200, 'Actualización de asistencia a "Falta"');
    }

    // ----------------------------------------------------
    // TEST 6: Motor Financiero de Cargos y Cálculo de Moras
    // ----------------------------------------------------
    console.log('\n📌 Módulo 6: Motor Financiero y Cálculo de Moras');
    const calcMoras = await request('POST', '/cargos/calcular-moras', {}, adminToken);
    assert(calcMoras.status === 200, 'Endpoint /api/cargos/calcular-moras ejecutado exitosamente');

    // ----------------------------------------------------
    // TEST 7: Caja e Ingresos (Cobro de Recibo)
    // ----------------------------------------------------
    console.log('\n📌 Módulo 7: Caja - Ingresos y Distribución de Abonos');
    if (cargoLuzId) {
      const cobro = await request(
        'POST',
        '/ingresos',
        {
          id_socio: socioId,
          monto_total_recibido: montoEsperado,
          observacion: 'Pago de luz mensual en ventanilla de caja',
          cargos: [
            {
              id_cargo: cargoLuzId,
              monto_abonado_capital: montoEsperado,
              monto_abonado_mora: 0,
            },
          ],
        },
        adminToken
      );
      assert(cobro.status === 201 || cobro.status === 200, 'Registro de cobro en caja e ingreso');
      ingresoId = cobro.data.ingreso?.id_ingreso || cobro.data.id_ingreso;
      assert(!!ingresoId, `Recibo oficial de caja emitido con ID: #${ingresoId}`);

      // Verificar que el cargo pasó a Pagado_Total y saldo 0
      const cargosActualizados = await request(
        'GET',
        `/cargos/socio/${socioId}`,
        null,
        adminToken
      );
      const listaAct = Array.isArray(cargosActualizados.data)
        ? cargosActualizados.data
        : cargosActualizados.data.cargos || [];
      const cargoPagado = listaAct.find((c) => c.id_cargo === cargoLuzId);
      if (cargoPagado) {
        assert(
          cargoPagado.estado === 'Pagado_Total' || parseFloat(cargoPagado.saldo_capital_pendiente) === 0,
          'Saldo de deuda actualizado a Pagado_Total (saldo 0.00 Bs)'
        );
      }
    }

    // ----------------------------------------------------
    // TEST 8: Registro de Egresos de Caja
    // ----------------------------------------------------
    console.log('\n📌 Módulo 8: Egresos (Viáticos y Gastos de Oficina)');
    // Obtener tipo de egreso
    const tiposEgreso = await request('GET', '/tipos-egreso', null, adminToken);
    const listaTipos = Array.isArray(tiposEgreso.data)
      ? tiposEgreso.data
      : tiposEgreso.data.tipos || [];
    const tipoViatico = listaTipos[0] || { id_tipo_egreso: 1 };

    const nuevoEgreso = await request(
      'POST',
      '/egresos',
      {
        id_tipo_egreso: tipoViatico.id_tipo_egreso,
        monto: 85.5,
        fecha_gasto: '2026-10-08',
        detalle: 'Viáticos de transporte para reunión con autoridades municipales',
      },
      adminToken
    );
    assert(nuevoEgreso.status === 201 || nuevoEgreso.status === 200, 'Registro de egreso de caja');

    // ----------------------------------------------------
    // TEST 9: Reporte General de Caja Grande
    // ----------------------------------------------------
    console.log('\n📌 Módulo 9: Balance Económico de Caja Grande');
    const balance = await request('GET', '/reportes/balance', null, adminToken);
    assert(balance.status === 200, 'Generación de Balance de Caja Grande responde 200 OK');
    assert(
      balance.data.totalIngresos !== undefined && balance.data.totalEgresos !== undefined,
      'Reporte incluye totalIngresos, totalEgresos y saldoNeto'
    );
    console.log(`     💵 Total Ingresos: ${balance.data.totalIngresos} Bs`);
    console.log(`     💸 Total Egresos:  ${balance.data.totalEgresos} Bs`);
    console.log(`     🏦 Saldo Neto:     ${balance.data.saldoNeto} Bs`);
    assert(Array.isArray(balance.data.ingresos), 'Reporte balance incluye lista detallada de transacciones de ingreso');
    assert(Array.isArray(balance.data.egresos), 'Reporte balance incluye lista detallada de transacciones de egreso');

    // ----------------------------------------------------
    // TEST 10: Generación Masiva de Serenaje (20 Bs Fijo)
    // ----------------------------------------------------
    console.log('\n📌 Módulo 10: Serenaje y Seguridad (Cuota 20 Bs)');
    const genSerenaje = await request(
      'POST',
      '/cargos/generar-serenaje',
      { periodo: '2026-11' },
      adminToken
    );
    assert(genSerenaje.status === 200, 'Generación masiva de Serenaje responde 200 OK');
    assert(genSerenaje.data.cargos_creados !== undefined, 'Se procesaron cargos de Serenaje para socios activos');
    console.log(`     🛡️ Cargos generados para periodo 2026-11: ${genSerenaje.data.cargos_creados}`);

    // Consultar cargos con filtro tipo_origen=serenaje
    const cargosSer = await request('GET', '/cargos?tipo_origen=serenaje', null, adminToken);
    assert(cargosSer.status === 200, 'Filtro de cargos por Serenaje responde 200 OK');
    const listaSer = Array.isArray(cargosSer.data) ? cargosSer.data : cargosSer.data.cargos || [];
    assert(listaSer.length > 0, 'Se listan cargos de Serenaje de la asociación');

    // ----------------------------------------------------
    // TEST 11: Resumen Integral de Deudas por Socio (Luz, Serenaje, Multas)
    // ----------------------------------------------------
    console.log('\n📌 Módulo 11: Resumen Centralizado de Deudas por Socio');
    const resResumen = await request('GET', '/cargos/resumen-socios', null, adminToken);
    assert(resResumen.status === 200, 'Endpoint /api/cargos/resumen-socios responde 200 OK');
    assert(Array.isArray(resResumen.data.resumen), 'Devuelve array de resumen por cada socio');
    let primerSocio = null;
    if (resResumen.data.resumen.length > 0) {
      primerSocio = resResumen.data.resumen[0];
      assert(primerSocio.luz !== undefined, 'Resumen incluye desglose de Luz');
      assert(primerSocio.serenaje !== undefined, 'Resumen incluye desglose de Serenaje');
      assert(primerSocio.multas !== undefined, 'Resumen incluye desglose de Multas');
      assert(typeof primerSocio.total_deuda_general === 'number', 'Resumen incluye total_deuda_general numérico');
      console.log(`     👤 Socio ${primerSocio.persona?.nombres || ''} ${primerSocio.persona?.apellidos || ''} (Caseta #${primerSocio.nro_caseta}):`);
      console.log(`        💡 Luz: ${primerSocio.luz.total} Bs (${primerSocio.luz.meses_debe} mes/es)`);
      console.log(`        🛡️ Serenaje: ${primerSocio.serenaje.total} Bs (${primerSocio.serenaje.meses_debe} mes/es)`);
      console.log(`        ⚠️ Multas: ${primerSocio.multas.total} Bs (${primerSocio.multas.cantidad} multa/s)`);
      console.log(`        💳 Total Adeudado: ${primerSocio.total_deuda_general} Bs`);
    } else {
      primerSocio = { id_socio: socioId };
    }

    // ----------------------------------------------------
    // TEST 12: Eventos Activos vs Pasados (Bloqueo de Modificación)
    // ----------------------------------------------------
    console.log('\n📌 Módulo 12: Eventos y Bloqueo de Asistencia en Eventos Pasados');
    // Evento futuro para permitir toma de lista
    const fechaFutura = '2026-10-25';
    const evMarcha = await request(
      'POST',
      '/eventos',
      {
        nombre_evento: 'Marcha Activa ' + Date.now(),
        tipo_evento: 'Marcha',
        fecha: fechaFutura,
        monto_multa: 45.0,
        descripcion: 'Marcha futura donde se toma lista',
      },
      adminToken
    );
    assert(evMarcha.status === 201, 'Creación de Marcha con multa variable de 45 Bs');
    const evMarchaId = evMarcha.data.evento.id_evento;

    // Obtenemos asistencias y marcamos una Falta en evento activo
    const asistMarcha = await request('GET', `/asistencias/evento/${evMarchaId}`, null, adminToken);
    const listaAsistMarcha = Array.isArray(asistMarcha.data) ? asistMarcha.data : asistMarcha.data.asistencias || [];
    if (listaAsistMarcha.length > 0) {
      const asistUno = listaAsistMarcha[0];
      const resPutActivo = await request('PUT', `/asistencias/${asistUno.id_asistencia}`, { estado_asistencia: 'Falta' }, adminToken);
      assert(resPutActivo.status === 200, 'Permite marcar Falta en evento futuro/activo');
    }

    // Ejecutamos aplicar-multas
    const resAplicar = await request('POST', `/asistencias/evento/${evMarchaId}/aplicar-multas`, {}, adminToken);
    assert(resAplicar.status === 200, 'Endpoint /api/asistencias/evento/:id/aplicar-multas responde 200 OK');
    assert(resAplicar.data.cargos_creados !== undefined, 'Reporta cantidad de multas aplicadas o sincronizadas');

    // Evento pasado para verificar que se bloquea la modificación
    const evPasado = await request(
      'POST',
      '/eventos',
      {
        nombre_evento: 'Asamblea Concluida Pasada ' + Date.now(),
        tipo_evento: 'Asamblea',
        fecha: '2026-09-01',
        monto_multa: 30.0,
        descripcion: 'Asamblea del mes anterior ya concluida',
      },
      adminToken
    );
    const evPasadoId = evPasado.data.evento.id_evento;
    const asistPasado = await request('GET', `/asistencias/evento/${evPasadoId}`, null, adminToken);
    const listaAsistPasado = Array.isArray(asistPasado.data) ? asistPasado.data : asistPasado.data.asistencias || [];
    if (listaAsistPasado.length > 0) {
      const asistP = listaAsistPasado[0];
      const resPutPasado = await request('PUT', `/asistencias/${asistP.id_asistencia}`, { estado_asistencia: 'Presente' }, adminToken);
      assert(resPutPasado.status === 400, 'Bloquea modificación de asistencia si el evento ya concluyó');
    }

    // ----------------------------------------------------
    // TEST 13: Validaciones de Consumo de Luz y Regla de 3er Mes de Mora
    // ----------------------------------------------------
    console.log('\n📌 Módulo 13: Validaciones de Luz y Sanción de Mora al 3er Mes');
    // Intentar registrar lectura menor a la anterior debe fallar
    const resLecturaMenor = await request(
      'POST',
      '/consumo-luz',
      {
        id_socio: primerSocio.id_socio,
        lectura_anterior: 100,
        lectura_actual: 50,
        fecha_lectura: '2026-10-10',
      },
      adminToken
    );
    assert(resLecturaMenor.status === 400, 'Rechaza lectura actual menor a lectura anterior');

    // Intentar saltarse mes correlativo
    // Supongamos que última lectura de socio 1 fue en un mes previo
    const resConsumosSocio = await request('GET', `/consumo-luz`, null, adminToken);
    assert(resConsumosSocio.status === 200, 'Consulta de consumos responde 200 OK');

    // ----------------------------------------------------
    // TEST 14: Reporte de Balance con Filtro de Fechas (incluyendo hoy)
    // ----------------------------------------------------
    console.log('\n📌 Módulo 14: Filtro de Fechas en Reporte de Balance');
    const hoyStr = new Date().toISOString().split('T')[0];
    const repHoy = await request('GET', `/reportes/balance?fecha_inicio=${hoyStr}&fecha_fin=${hoyStr}`, null, adminToken);
    assert(repHoy.status === 200, 'Reporte de balance para fecha de hoy responde 200 OK');
    assert(Array.isArray(repHoy.data.ingresos), 'Reporte incluye array de ingresos para el rango de fechas');

    // ----------------------------------------------------
    // TEST 15: Aportes Pro-Mejoras (Cobro Único y Mora +2 Meses)
    // ----------------------------------------------------
    console.log('\n📌 Módulo 15: Aportes Pro-Mejoras (Cobro Único y Mora +2 Meses)');
    const resCrearAporte = await request(
      'POST',
      '/aportes',
      {
        nombre_proyecto: `Compra de Extintores y Gabinetes Contra Incendio ${Date.now()}`,
        descripcion: 'Adquisición de extintores de 6kg ABC para pasillos según normativa de seguridad',
        monto_por_socio: 50.00,
        fecha_emision: '2026-08-01', // Fecha simulada de hace más de 2 meses para probar mora
        fecha_limite: '2026-09-30',
        monto_multa_mora: 20.00,
      },
      adminToken
    );
    assert(resCrearAporte.status === 201, 'Creación de Aporte Pro-Mejora responde 201 Created');
    assert(resCrearAporte.data.cargos_generados > 0, `Generó ${resCrearAporte.data?.cargos_generados} cuotas individuales de 50 Bs para socios`);
    const aporteId = resCrearAporte.data.aporte.id_aporte;

    // Listar proyectos con métricas
    const resListAportes = await request('GET', '/aportes', null, adminToken);
    assert(resListAportes.status === 200, 'Listado de aportes pro-mejoras responde 200 OK');
    const apCreado = (resListAportes.data.aportes || []).find((a) => a.id_aporte === aporteId);
    assert(!!apCreado, 'El aporte recién creado aparece en el listado de la asociación');
    assert(apCreado.metricas && apCreado.metricas.meta_total > 0, `Métrica de meta total calculada: ${apCreado?.metricas?.meta_total} Bs`);

    // Listar socios de este proyecto
    const resSociosAporte = await request('GET', `/aportes/${aporteId}/socios`, null, adminToken);
    assert(resSociosAporte.status === 200, 'Listado de socios del aporte responde 200 OK');
    assert(Array.isArray(resSociosAporte.data.socios), 'Devuelve lista detallada de socios');

    // Aplicar regla de sanción de mora (+2 meses)
    const resMoraAporte = await request('POST', `/aportes/${aporteId}/aplicar-mora`, { forzar: true }, adminToken);
    assert(resMoraAporte.status === 200, 'Aplicación de sanción por mora (+2 meses) responde 200 OK');
    assert(resMoraAporte.data.multas_generadas !== undefined, `Reportó ${resMoraAporte.data?.multas_generadas} multas por mora aplicadas`);

    // Verificar que en resumen de socios aparece la categoría aportes
    const resResumenConAporte = await request('GET', '/cargos/resumen-socios', null, adminToken);
    assert(resResumenConAporte.status === 200, 'Resumen consolidado de socios responde 200 OK');
    const socioConAporte = (resResumenConAporte.data.resumen || [])[0];
    assert(socioConAporte && socioConAporte.aportes !== undefined, 'Resumen socio incluye clasificación de Aportes Pro-Mejoras');

    // ----------------------------------------------------
    // TEST 16: MicroSaaS Multi-tenant, Múltiples Casetas por Dueño y Configuración de Tarifas
    // ----------------------------------------------------
    console.log('\n📌 Módulo 16: MicroSaaS, Múltiples Casetas por Dueño y Tarifas Dinámicas');

    // 16.1 Numeración correlativa de recibos por asociación
    const resIngresos = await request('GET', '/ingresos', null, adminToken);
    assert(resIngresos.status === 200, 'Consulta de ingresos de la asociación responde 200 OK');
    const recibosList = resIngresos.data.ingresos || [];
    assert(recibosList.length > 0, `Existen ${recibosList.length} recibos registrados en la asociación`);
    const todosConNro = recibosList.every((r) => r.nro_recibo !== null && r.nro_recibo !== undefined && r.nro_recibo > 0);
    assert(todosConNro, 'Todos los recibos de la asociación cuentan con un nro_recibo correlativo válido');

    // 16.2 Múltiples Casetas por Dueño
    const ciRandom = `CI-${Math.floor(100000 + Math.random() * 900000)}`;
    const casetaA = `T-${Math.floor(1000 + Math.random() * 9000)}A`;
    const casetaB = `T-${Math.floor(1000 + Math.random() * 9000)}B`;

    // Crear primera caseta y dueño
    const resDueno1 = await request(
      'POST',
      '/socios',
      {
        nro_caseta: casetaA,
        nombres: 'Fausto',
        apellidos: 'Condori Vargas',
        ci: ciRandom,
        telefono: '79988776',
        domicilio: 'Sector Carnes Puesto 4',
        estado_socio: 'Activo',
      },
      adminToken
    );
    assert(resDueno1.status === 201, 'Creación de primer socio con caseta A responde 201');
    const idPersonaDueno = resDueno1.data.socio?.id_persona || resDueno1.data.socio?.persona?.id_persona;
    assert(!!idPersonaDueno, `Dueño registrado con ID Persona: ${idPersonaDueno}`);

    // Asignar segunda caseta al MISMO dueño
    const resDueno2 = await request(
      'POST',
      '/socios',
      {
        id_persona: idPersonaDueno,
        nro_caseta: casetaB,
        estado_socio: 'Activo',
      },
      adminToken
    );
    assert(resDueno2.status === 201, 'Adjudicación de segunda caseta B al mismo dueño responde 201');
    assert(resDueno2.data.socio?.total_casetas_dueno >= 2, `El dueño ahora posee ${resDueno2.data.socio?.total_casetas_dueno} casetas`);

    // Consultar lista de socios y verificar casetas vinculadas
    const resSociosMulti = await request('GET', '/socios', null, adminToken);
    assert(resSociosMulti.status === 200, 'Consulta de socios responde 200 OK');
    const socioMulti = (resSociosMulti.data.socios || []).find((s) => s.id_persona === idPersonaDueno);
    assert(!!socioMulti, 'Socio multi-caseta encontrado en la lista');
    assert(socioMulti.total_casetas_dueno >= 2, 'Campo total_casetas_dueno refleja múltiples puestos');
    assert(
      Array.isArray(socioMulti.todas_casetas) &&
      socioMulti.todas_casetas.includes(casetaA) &&
      socioMulti.todas_casetas.includes(casetaB),
      'Array todas_casetas incluye ambas casetas del mismo dueño'
    );

    // Consultar lista única de dueños
    const resDuenos = await request('GET', '/socios/duenos', null, adminToken);
    assert(resDuenos.status === 200, 'Endpoint /api/socios/duenos responde 200 OK');
    const duenoEnLista = (resDuenos.data.duenos || []).find((d) => d.id_persona === idPersonaDueno);
    assert(!!duenoEnLista, 'El dueño aparece en la lista de propietarios únicos');
    assert(duenoEnLista.casetas.includes(casetaA) && duenoEnLista.casetas.includes(casetaB), 'Propietario lista sus casetas unificadas');

    // 16.3 Configuración y Tarifas Exclusivas de Presidencia
    const resConfig = await request('GET', '/asociaciones/configuracion', null, adminToken);
    assert(resConfig.status === 200, 'Obtener configuración institucional responde 200 OK para PRESIDENTE');
    assert(resConfig.data.asociacion && resConfig.data.asociacion.precio_kwh !== undefined, 'Configuración incluye precio_kwh dinámico');

    // Actualizar tarifa de luz y cuota de serenaje por el Presidente
    const nuevaTarifaKwh = 2.75;
    const resUpdateConfig = await request(
      'PUT',
      '/asociaciones/configuracion',
      {
        precio_kwh: nuevaTarifaKwh,
        monto_serenaje: 25.00,
        multa_asamblea: 35.00,
        multa_marcha: 60.00,
      },
      adminToken
    );
    assert(resUpdateConfig.status === 200, 'Actualización de tarifas por el Presidente responde 200 OK');

    // Verificar que el endpoint de tarifa de luz refleja el nuevo precio actualizado
    const resTarifaLuz = await request('GET', '/consumo-luz/tarifa', null, adminToken);
    assert(resTarifaLuz.status === 200, 'Consulta de tarifa dinámica de luz responde 200 OK');
    assert(parseFloat(resTarifaLuz.data.precio_kwh) === nuevaTarifaKwh, `Tarifa de luz actualizada dinámicamente a ${nuevaTarifaKwh} Bs/kWh`);

    // Restaurar tarifa estándar
    await request('PUT', '/asociaciones/configuracion', { precio_kwh: 2.00, monto_serenaje: 20.00 }, adminToken);

    // ----------------------------------------------------
    // TEST 17: Ciberseguridad Bancaria, Aislamiento Multi-Tenant y Anti-Fraude
    // ----------------------------------------------------
    console.log('\n📌 Módulo 17: Ciberseguridad Bancaria, Aislamiento Multi-Tenant y Anti-Fraude');

    // 17.1 Exclusión de password por defaultScope
    const resMe = await request('GET', '/auth/me', null, adminToken);
    assert(resMe.status === 200, 'Endpoint /api/auth/me responde 200 OK');
    assert(resMe.data.password === undefined, 'Campo password excluido por defaultScope en respuestas');

    // 17.2 Prohibido borrar dinero (Deshabilitación estricta de DELETE)
    const resDelIngreso = await request('DELETE', `/ingresos/${ingresoId || 1}`, null, adminToken);
    assert(resDelIngreso.status === 405, 'Ruta DELETE /api/ingresos rechazada con 405 Method Not Allowed');

    const resDelEgreso = await request('DELETE', '/egresos/1', null, adminToken);
    assert(resDelEgreso.status === 405, 'Ruta DELETE /api/egresos rechazada con 405 Method Not Allowed');

    // 17.3 Validación Zod contra montos negativos o inválidos
    const resEgresoNegativo = await request(
      'POST',
      '/egresos',
      { id_tipo_egreso: 1, monto: -50.00, detalle: 'Intento de gasto negativo' },
      adminToken
    );
    assert(resEgresoNegativo.status === 400, 'Zod rechaza registro de egreso con monto negativo', `status: ${resEgresoNegativo.status}, body: ${JSON.stringify(resEgresoNegativo.data)}`);

    const resConsumoNegativo = await request(
      'POST',
      '/consumo-luz',
      { id_socio: socioId, lectura_actual: -20 },
      adminToken
    );
    assert(resConsumoNegativo.status === 400, 'Zod rechaza lectura de kWh negativa', `status: ${resConsumoNegativo.status}, body: ${JSON.stringify(resConsumoNegativo.data)}`);

    // 17.4 Flujo Seguro de Anulación de Recibos con Transacción y Bloqueo Pesimista
    if (ingresoId) {
      // Intentar anular sin motivo (debe rechazar con 400)
      const resAnularSinMotivo = await request(
        'POST',
        `/ingresos/${ingresoId}/anular`,
        { observacion: '   ' },
        adminToken
      );
      assert(resAnularSinMotivo.status === 400, 'Anulación rechazada si no se especifica motivo obligatorio (>= 5 chars)', `status: ${resAnularSinMotivo.status}, body: ${JSON.stringify(resAnularSinMotivo.data)}`);

      // Anular con motivo válido (debe responder 200 y revertir saldos en cargos)
      const resAnularValido = await request(
        'POST',
        `/ingresos/${ingresoId}/anular`,
        { observacion: 'Error de digitación en ventanilla de cobranza' },
        adminToken
      );
      assert(resAnularValido.status === 200, 'Anulación exitosa con auditoría y reversión transaccional');

      // Intentar anular el mismo recibo de nuevo (doble anulación prohibida)
      const resDobleAnular = await request(
        'POST',
        `/ingresos/${ingresoId}/anular`,
        { observacion: 'Segundo intento' },
        adminToken
      );
      assert(resDobleAnular.status === 400, 'Rechaza intento de anular un recibo que ya está anulado');

      // Verificar que el cargo recuperó su saldo pendiente
      if (cargoLuzId) {
        const cargosRevertidos = await request('GET', `/cargos/socio/${socioId}`, null, adminToken);
        const listaRev = Array.isArray(cargosRevertidos.data) ? cargosRevertidos.data : cargosRevertidos.data.cargos || [];
        const cargoRev = listaRev.find((c) => c.id_cargo === cargoLuzId);
        assert(
          cargoRev && parseFloat(cargoRev.saldo_capital_pendiente) > 0,
          `Saldo de deuda de luz revertido exitosamente (${cargoRev?.saldo_capital_pendiente} Bs pendiente)`
        );
      }
    }

    // 17.5 Aislamiento Multi-Tenant (Inyección de id_asociacion en body es ignorada)
    const resSocioInyectado = await request(
      'POST',
      '/socios',
      {
        id_asociacion: 999999, // Intento de inyectar otra asociación
        nro_caseta: `SEC-${Math.floor(100 + Math.random() * 900)}`,
        nombres: 'Test',
        apellidos: 'Anti-IDOR',
      },
      adminToken
    );
    assert(resSocioInyectado.status === 201, 'Registro de socio ignora id_asociacion enviado en body');
    const socioCreado = resSocioInyectado.data.socio;
    assert(socioCreado.id_asociacion === me.data.id_asociacion, 'id_asociacion forzado estrictamente desde el JWT');

    // ====================================================
    // Módulo 18: Multi-Tenancy Estricto, Correlativos Independientes y Reportes Públicos
    // ====================================================
    console.log('\n📌 Módulo 18: Multi-Tenancy Estricto, Correlativos Independientes y Reportes Públicos');

    // 18.1 Métricas de Inicio / Dashboard en tiempo real (evita valores en 0)
    const resDashStats = await request('GET', '/reportes/dashboard-stats', null, adminToken);
    assert(resDashStats.status === 200, 'Endpoint /api/reportes/dashboard-stats responde 200 OK');
    assert(resDashStats.data.status === true, 'Métricas de dashboard devuelven status: true');
    assert(Number(resDashStats.data.totalSocios) > 0, `Dashboard refleja totalSocios activos (> 0): ${resDashStats.data.totalSocios}`);
    assert(Number(resDashStats.data.totalIngresos) > 0, `Dashboard refleja totalIngresos recaudados: ${resDashStats.data.totalIngresos} Bs`);
    assert(typeof resDashStats.data.saldoNeto === 'number', `Dashboard calcula saldoNeto de caja: ${resDashStats.data.saldoNeto} Bs`);

    // 18.2 Reporte de Balance Público Agrupado por Rubro (Sin Nombres ni Casetas Privadas)
    const resBalancePublico = await request('GET', '/reportes/balance', null, adminToken);
    assert(resBalancePublico.status === 200, 'Endpoint /api/reportes/balance responde 200 OK');
    assert(Array.isArray(resBalancePublico.data.resumen_ingresos_publico), 'Devuelve array resumen_ingresos_publico agrupado por concepto');
    assert(resBalancePublico.data.resumen_ingresos_publico.length > 0, 'Resumen público contiene conceptos de cobro agrupados');
    
    // Verificar que los conceptos agrupados reflejan cantidad de socios y glosa pública
    const primerRubro = resBalancePublico.data.resumen_ingresos_publico[0];
    assert(primerRubro && primerRubro.concepto, `Rubro público identificado: "${primerRubro?.concepto}"`);
    assert(primerRubro.cantidad_socios >= 1, `Refleja cantidad de socios que aportaron: ${primerRubro.cantidad_socios} socio(s)`);
    assert(primerRubro.glosa_publica && primerRubro.glosa_publica.includes('socio(s)'), `Glosa pública formateada: "${primerRubro.glosa_publica}"`);
    
    // Verificar lista detallada de ingresos para informe de directiva y resumen anónimo para asamblea
    const primerIngreso = resBalancePublico.data.ingresos?.[0];
    assert(primerIngreso && (primerIngreso.socio || primerIngreso.id_socio), 'Lista detallada de ingresos conserva trazabilidad para informe interno de directiva');
    assert(Array.isArray(resBalancePublico.data.resumen_ingresos_publico), 'Informe de asamblea cuenta con resumen agrupado sin datos personales de socios');

    // 18.3 Múltiples Asociaciones: Login independiente en Asociación 2 (Mercado San Antonio)
    const resLoginSA = await request('POST', '/auth/login', {
      username: 'admin_sanantonio',
      password: 'admin123',
    });
    assert(resLoginSA.status === 200, 'Login admin_sanantonio responde 200 OK');
    assert(resLoginSA.data.usuario?.id_asociacion === 2, 'Usuario pertenece estrictamente a Asociación 2');
    const tokenSA = resLoginSA.data.token;

    // 18.4 Aislamiento Estricto de Padrón de Socios (Asociación 2 no ve socios de Asociación 1)
    const resSociosSA = await request('GET', '/socios', null, tokenSA);
    assert(resSociosSA.status === 200, 'Listado de socios de Asociación 2 responde 200 OK');
    const listaSociosSA = resSociosSA.data.socios || [];
    assert(listaSociosSA.length > 0, 'Asociación 2 cuenta con socios propios');
    const todosSonAsoc2 = listaSociosSA.every((s) => s.id_asociacion === 2);
    assert(todosSonAsoc2, 'Todos los socios listados pertenecen 100% a la Asociación 2 (Cero fugas de Asociación 1)');

    // 18.5 Correlatividad de Recibos Independiente por Asociación
    const resIngresosSA = await request('GET', '/ingresos', null, tokenSA);
    assert(resIngresosSA.status === 200, 'Consulta de ingresos de Asociación 2 responde 200 OK');
    const listaIngresosSA = resIngresosSA.data.ingresos || [];
    assert(listaIngresosSA.length > 0, 'Asociación 2 tiene recibos emitidos');
    const todosRecibosSonAsoc2 = listaIngresosSA.every((i) => i.id_asociacion === 2);
    assert(todosRecibosSonAsoc2, 'Todos los recibos de la lista pertenecen exclusivamente a Asociación 2');
    
    const primerReciboSA = listaIngresosSA.find((i) => i.nro_recibo === 1);
    assert(primerReciboSA !== undefined, 'Asociación 2 cuenta con su propio recibo correlativo nro_recibo #1 independiente');

    // 18.6 Tercera Asociación: Login en Mercado Los Pozos y recibo independiente #1
    const resLoginPozos = await request('POST', '/auth/login', {
      username: 'admin_pozos',
      password: 'admin123',
    });
    assert(resLoginPozos.status === 200, 'Login admin_pozos responde 200 OK');
    assert(resLoginPozos.data.usuario?.id_asociacion === 3, 'Usuario pertenece estrictamente a Asociación 3');
    const tokenPozos = resLoginPozos.data.token;

    const resIngresosPozos = await request('GET', '/ingresos', null, tokenPozos);
    assert(resIngresosPozos.status === 200, 'Consulta de ingresos de Asociación 3 responde 200 OK');
    const listaIngresosPozos = resIngresosPozos.data.ingresos || [];
    assert(listaIngresosPozos.length > 0, 'Asociación 3 tiene recibos emitidos');
    const primerReciboPozos = listaIngresosPozos.find((i) => i.nro_recibo === 1);
    assert(primerReciboPozos !== undefined, 'Asociación 3 cuenta con su propio recibo correlativo nro_recibo #1 independiente');

    // ═══════════════════════════════════════════════════════════════
    // MÓDULO 19: Seguridad de Autenticación, Lockout y Recuperación de Contraseña
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📌 Módulo 19: Seguridad en Login, Bloqueo de Cuenta (Lockout) y Recuperación');
    
    // 19.1 Crear usuario de prueba para test de bloqueo
    const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
    const testUserLock = `cajero_test_${randomSuffix}`;
    const resRegUser = await request('POST', '/auth/register', {
      username: testUserLock,
      password: 'passwordSegura123',
      rol: 'CAJERO',
      id_asociacion: 1,
      nombres: 'Cajero',
      apellidos: 'Prueba Lockout',
      ci: `99${randomSuffix}`,
    }, adminToken);
    assert(resRegUser.status === 201, 'Usuario para pruebas de lockout registrado');

    // 19.2 Intentos fallidos sucesivos
    for (let i = 1; i <= 4; i++) {
      const resBad = await request('POST', '/auth/login', {
        username: testUserLock,
        password: 'clave_incorrecta',
      });
      assert(resBad.status === 401, `Intento fallido ${i}/5 rechazado con 401`);
    }

    // 19.3 Quinto intento fallido activa el bloqueo de 15 minutos (Status 423 Locked)
    const resIntento5 = await request('POST', '/auth/login', {
      username: testUserLock,
      password: 'clave_incorrecta',
    });
    assert(resIntento5.status === 423, 'Quinto intento fallido bloquea la cuenta con 423 Locked');
    assert(resIntento5.data.mensaje.includes('bloqueada temporalmente'), 'Mensaje advierte bloqueo temporal de 15 minutos');

    // 19.4 Intento 6 con clave correcta debe ser rechazado mientras esté bloqueado
    const resIntento6Correcto = await request('POST', '/auth/login', {
      username: testUserLock,
      password: 'passwordSegura123',
    });
    assert(resIntento6Correcto.status === 423, 'Intento 6 con contraseña correcta es rechazado mientras persista el bloqueo');

    // 19.5 Solicitar token de recuperación de contraseña
    const resOlvide = await request('POST', '/auth/olvide-password', {
      identificador: testUserLock,
    });
    assert(resOlvide.status === 200, 'Solicitud de recuperación olvide-password responde 200 OK');
    const tokenRecuperacion = resOlvide.data.token_demo;
    assert(typeof tokenRecuperacion === 'string' && tokenRecuperacion.length >= 32, 'Genera token criptográfico de recuperación');

    // 19.6 Restablecer contraseña con el token
    const resReset = await request('POST', '/auth/reset-password', {
      token: tokenRecuperacion,
      nueva_password: 'NuevaClaveDesbloqueada2026',
    });
    assert(resReset.status === 200, 'Restablecimiento de contraseña responde 200 OK');
    assert(resReset.data.mensaje.includes('desbloqueada'), 'Respuesta confirma que la cuenta fue desbloqueada');

    // 19.7 Login exitoso con la nueva clave tras el desbloqueo
    const resLoginDesbloqueado = await request('POST', '/auth/login', {
      username: testUserLock,
      password: 'NuevaClaveDesbloqueada2026',
    });
    assert(resLoginDesbloqueado.status === 200, 'Login exitoso tras reset de contraseña y desbloqueo de cuenta');

    // ───────────────────────────────────────────────────────────────────────────
    // MÓDULO 20: INGRESOS DIRECTOS, TRASPASOS DE CASETA (10%) Y AFILIACIONES
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n📌 Módulo 20: Ingresos Directos, Traspasos de Caseta (10%) y Afiliaciones');

    // 20.1 Registro de ingreso directo por traspaso de caseta con 10% de comisión
    const resTraspaso = await request('POST', '/ingresos/directo', {
      id_socio: socioId,
      concepto: 'Traspaso de Caseta (10%)',
      valor_venta_caseta: 25000,
      porcentaje_traspaso: 10,
      monto: 2500,
      fecha_pago: '2026-10-14',
      pagador: 'Comprador: Rogelio Mendoza',
      detalle: 'Traspaso y venta de caseta autorizada por directiva',
    }, adminToken);
    assert(resTraspaso.status === 201, 'Registro de traspaso de caseta (10%) responde 201 Created');
    const reciboTraspaso = resTraspaso.data.ingreso;
    assert(reciboTraspaso && reciboTraspaso.nro_recibo > 0, 'Asigna número de recibo correlativo al traspaso');
    assert(parseFloat(reciboTraspaso.monto_total_recibido) === 2500, 'Monto del traspaso registrado correctamente: 2500 Bs');
    assert(reciboTraspaso.tipo_origen === 'traspaso', 'Tipo de origen identificado como traspaso');
    assert(reciboTraspaso.pagador.includes('Rogelio Mendoza'), 'Registra el nombre del pagador/comprador');

    // 20.2 Registro de ingreso directo por cuota de afiliación para nuevo socio (sin caseta asignada aún)
    const resAfiliacion = await request('POST', '/ingresos/directo', {
      concepto: 'Cuota de Afiliación / Nuevo Socio',
      monto: 350,
      fecha_pago: '2026-10-14',
      pagador: 'Postulante: Beatriz Flores',
      detalle: 'Costo de inscripción y afiliación gremial',
      tipo_origen: 'afiliacion',
    }, adminToken);
    assert(resAfiliacion.status === 201, 'Registro de afiliación de nuevo socio responde 201 Created');
    const reciboAfiliacion = resAfiliacion.data.ingreso;
    assert(reciboAfiliacion.id_socio === null, 'Permite registrar afiliación de persona que aún no es socio');
    assert(reciboAfiliacion.nro_recibo === reciboTraspaso.nro_recibo + 1, 'Correlativo de recibo se incrementa de forma estrictamente secuencial');

    // 20.3 Listado de ingresos incluye los ingresos directos y sus metadatos
    const resListado = await request('GET', '/ingresos', null, adminToken);
    assert(resListado.status === 200, 'Consulta de listado de ingresos responde 200 OK');
    const todosIngresos = resListado.data.ingresos || [];
    const ingresoTraspasoEnLista = todosIngresos.find(i => i.id_ingreso === reciboTraspaso.id_ingreso);
    assert(!!ingresoTraspasoEnLista, 'Ingreso de traspaso encontrado en el libro de ingresos');
    assert(ingresoTraspasoEnLista.concepto === 'Traspaso de Caseta (10%)', 'Conserva el concepto específico de traspaso');

    // 20.4 Reporte de balance general incorpora los ingresos directos
    const resBalance = await request('GET', '/reportes/balance', null, adminToken);
    assert(resBalance.status === 200, 'Reporte de balance general responde 200 OK');
    const balanceData = resBalance.data;
    const rubroTraspaso = (balanceData.resumen_ingresos_publico || []).find(r => r.concepto.includes('Traspaso'));
    assert(!!rubroTraspaso, 'Reporte público para asamblea incluye el rubro de Traspaso de Caseta');
    assert(rubroTraspaso.total_recaudado >= 2500, 'Total recaudado por traspasos reflejado en el balance');

    // 20.5 Flujo seguro de anulación de ingreso directo cancela también su cargo sin dejar deuda falsa
    const resAnularTraspaso = await request('POST', `/ingresos/${reciboTraspaso.id_ingreso}/anular`, {
      observacion: 'Error en tipeo del monto de traspaso acordado en asamblea',
    }, adminToken);
    assert(resAnularTraspaso.status === 200, 'Anulación de recibo de traspaso responde 200 OK', `status: ${resAnularTraspaso.status}, body: ${JSON.stringify(resAnularTraspaso.data)}`);
    
    // Verificar que el recibo pasó a Anulado
    const resReciboAnulado = await request('GET', `/ingresos/${reciboTraspaso.id_ingreso}`, null, adminToken);
    assert(resReciboAnulado.data.ingreso.estado === 'Anulado', 'Estado del comprobante de ingreso actualizado a Anulado');
  } catch (error) {
    console.error('💥 Error inesperado en ejecución de tests:', error.message);
  }

  console.log('\n====================================================');
  console.log('📊 RESUMEN FINAL DE PRUEBAS AUTOMATIZADAS');
  console.log('====================================================');
  console.log(`Total Pruebas:   ${totalTests}`);
  console.log(`Exitosas:        ${passedTests} ✅`);
  console.log(`Fallidas:        ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  runTestSuite();
}

module.exports = { runTestSuite };
