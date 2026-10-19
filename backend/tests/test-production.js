/**
 * test-production.js
 * Suite de pruebas exhaustivas para MiSocios antes de producción
 * Valida autenticación, aislamiento multi-tenant, integridad de caja,
 * reportería, concurrencia (LOCK.UPDATE) y flujos contables.
 */
const http = require('http');

const BASE_URL = 'http://localhost:3031/api';
let PASS = 0;
let FAIL = 0;
let tokens = {};

function req(method, path, body = null, token = null) {
  return new Promise((resolve) => {
    const url = new URL(BASE_URL + path);
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
    };
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (postData) r.write(postData);
    r.end();
  });
}

function ok(name, cond, detail = '') {
  if (cond) {
    console.log(`  ✅ PASS: ${name}`);
    PASS++;
  } else {
    console.log(`  ❌ FAIL: ${name} ${detail ? '→ ' + detail : ''}`);
    FAIL++;
  }
}

async function section(title, fn) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  📋 ${title}`);
  console.log(`${'═'.repeat(60)}`);
  await fn();
}

async function main() {
  console.log('\n🔍 MiSocios - Suite de Pruebas de Producción');
  console.log('   Base URL:', BASE_URL);
  console.log('   Fecha:', new Date().toLocaleString('es-BO'));

  // ─── 1. AUTENTICACIÓN ─────────────────────────────────────────
  await section('1. AUTENTICACIÓN', async () => {
    // Login válido admin asoc 1
    let r = await req('POST', '/auth/login', { username: 'admin', password: 'misocios2024' });
    ok('Login admin (asoc 1)', r.status === 200 && r.body.token, `status=${r.status} msg=${r.body.mensaje||''}`);
    if (r.body.token) tokens.admin = r.body.token;
    ok('Login retorna nombre_asociacion', r.body.usuario?.nombre_asociacion !== undefined, JSON.stringify(r.body.usuario?.nombre_asociacion));
    ok('Login retorna rol correcto', r.body.usuario?.rol === 'PRESIDENTE', r.body.usuario?.rol);

    // Login admin asoc 2
    r = await req('POST', '/auth/login', { username: 'admin_sanantonio', password: 'misocios2024' });
    ok('Login admin_sanantonio (asoc 2)', r.status === 200 && r.body.token);
    if (r.body.token) tokens.admin2 = r.body.token;

    // Login cajero asoc 1
    r = await req('POST', '/auth/login', { username: 'cajero_central', password: 'misocios2024' });
    ok('Login cajero_central (asoc 1)', r.status === 200 && r.body.token);
    if (r.body.token) tokens.cajero = r.body.token;

    // Login superadmin
    r = await req('POST', '/auth/login', { username: 'superadmin', password: 'misocios2024' });
    ok('Login superadmin', r.status === 200 && r.body.token);
    if (r.body.token) tokens.superadmin = r.body.token;

    // Login admin asoc 5
    r = await req('POST', '/auth/login', { username: 'admin_ramada', password: 'misocios2024' });
    ok('Login admin_ramada (asoc 5)', r.status === 200 && r.body.token);
    if (r.body.token) tokens.admin5 = r.body.token;

    // Login con contraseña incorrecta
    r = await req('POST', '/auth/login', { username: 'admin', password: 'wrongpass' });
    ok('Login contraseña incorrecta → 401', r.status === 401, `status=${r.status}`);
    ok('Login incorrecta retorna intentos_fallidos', r.body.intentos_fallidos !== undefined);

    // Login sin token → endpoint protegido debe devolver 401
    r = await req('GET', '/socios');
    ok('Ruta protegida sin token → 401', r.status === 401, `status=${r.status}`);
  });

  // ─── 2. MULTI-TENANT: SOCIOS ──────────────────────────────────
  await section('2. MULTI-TENANT - SOCIOS', async () => {
    // Admin asoc 1 solo ve socios de asoc 1
    let r = await req('GET', '/socios', null, tokens.admin);
    ok('GET socios (asoc 1) → 200', r.status === 200, `status=${r.status}`);
    const sociosAsoc1 = Array.isArray(r.body) ? r.body : (r.body.socios || r.body.data || []);
    ok('Socios asoc 1: solo de asoc 1', sociosAsoc1.length > 0 && sociosAsoc1.every(s => s.id_asociacion === 1), `Total: ${sociosAsoc1.length}`);
    ok('Socios asoc 1: exactamente 10 activos', sociosAsoc1.length === 10, `count=${sociosAsoc1.length}`);

    // Admin asoc 2 solo ve socios de asoc 2
    r = await req('GET', '/socios', null, tokens.admin2);
    const sociosAsoc2 = Array.isArray(r.body) ? r.body : (r.body.socios || r.body.data || []);
    ok('Socios asoc 2: solo de asoc 2', sociosAsoc2.length > 0 && sociosAsoc2.every(s => s.id_asociacion === 2), `Total: ${sociosAsoc2.length}`);
    ok('Socios asoc 2: exactamente 10', sociosAsoc2.length === 10, `count=${sociosAsoc2.length}`);

    // Soft delete: socios inactivos no aparecen
    ok('Socios sin deleted_at nulo ocultos', sociosAsoc1.every(s => s.deleted_at == null || s.deleted_at === undefined));
  });

  // ─── 3. CARGOS ────────────────────────────────────────────────
  await section('3. CARGOS Y DEUDAS', async () => {
    let r = await req('GET', '/cargos', null, tokens.admin);
    ok('GET cargos → 200', r.status === 200, `status=${r.status}`);
    const cargos = Array.isArray(r.body) ? r.body : (r.body.cargos || r.body.data || []);
    ok('Cargos pertenecen a asoc 1', cargos.every(c => c.id_asociacion === 1), `count=${cargos.length}`);

    r = await req('GET', '/cargos/resumen-socios', null, tokens.admin);
    ok('GET resumen-socios → 200', r.status === 200, `status=${r.status}`);
    const resumen = Array.isArray(r.body) ? r.body : (r.body.resumen || r.body.data || []);
    ok('Resumen-socios retorna array con socios', Array.isArray(resumen) && resumen.length > 0, `count=${resumen.length}`);
    ok('Resumen-socios contiene desglose financiero (luz, serenaje, total)', resumen.some(s => s.luz !== undefined && s.serenaje !== undefined));
  });

  // ─── 4. INGRESOS ─────────────────────────────────────────────
  await section('4. INGRESOS', async () => {
    let r = await req('GET', '/ingresos', null, tokens.admin);
    ok('GET ingresos → 200', r.status === 200, `status=${r.status}`);
    const ingresos = Array.isArray(r.body) ? r.body : (r.body.ingresos || r.body.data || []);
    ok('Ingresos pertenecen a asoc 1', ingresos.every(i => i.id_asociacion === 1), `count=${ingresos.length}`);

    // Multi-tenant: admin asoc 2 no ve ingresos de asoc 1
    r = await req('GET', '/ingresos', null, tokens.admin2);
    const ingresosAsoc2 = Array.isArray(r.body) ? r.body : (r.body.ingresos || r.body.data || []);
    ok('Ingresos asoc 2 no mezclan asoc 1', ingresosAsoc2.every(i => i.id_asociacion === 2), `count=${ingresosAsoc2.length}`);
  });

  // ─── 5. EGRESOS ──────────────────────────────────────────────
  await section('5. EGRESOS', async () => {
    let r = await req('GET', '/egresos', null, tokens.admin);
    ok('GET egresos → 200', r.status === 200, `status=${r.status}`);

    // Crear egreso con rol directivo (PRESIDENTE/ADMIN_ASOCIACION)
    r = await req('POST', '/egresos', {
      id_tipo_egreso: 1,
      monto: 50.00,
      fecha_gasto: new Date().toISOString().split('T')[0],
      detalle: 'Prueba unitaria test-produccion',
    }, tokens.admin);
    ok('POST egreso (admin) → 201', r.status === 201, `status=${r.status} msg=${r.body.mensaje||''}`);
    const egresoId = r.body.egreso?.id_egreso;

    // Eliminar egreso creado (Soft Delete permitido para directivos)
    if (egresoId) {
      r = await req('DELETE', `/egresos/${egresoId}`, null, tokens.admin);
      ok('DELETE egreso (soft-delete admin) → 200', r.status === 200, `status=${r.status}`);
    } else {
      ok('DELETE egreso (id disponible)', false, 'No se pudo obtener id_egreso');
    }

    // Cajero no tiene permiso para crear egreso
    r = await req('POST', '/egresos', {
      id_tipo_egreso: 1,
      monto: 10,
      fecha_gasto: new Date().toISOString().split('T')[0],
      detalle: 'Intento no autorizado',
    }, tokens.cajero);
    ok('POST egreso (cajero no autorizado) → 403', r.status === 403, `status=${r.status}`);
  });

  // ─── 6. APORTES ──────────────────────────────────────────────
  await section('6. APORTES / ASAMBLEAS', async () => {
    let r = await req('GET', '/aportes', null, tokens.admin);
    ok('GET aportes → 200', r.status === 200, `status=${r.status}`);
  });

  // ─── 7. CONCEPTOS Y CONFIGURACIÓN ───────────────────────────
  await section('7. CONCEPTOS DE COBRO Y TIPOS DE EGRESO', async () => {
    let r = await req('GET', '/conceptos-cobro', null, tokens.admin);
    ok('GET conceptos-cobro → 200', r.status === 200, `status=${r.status}`);
    const conceptos = Array.isArray(r.body) ? r.body : (r.body.conceptos || r.body.data || []);
    ok('Conceptos de cobro existen', conceptos.length > 0, `count=${conceptos.length}`);

    r = await req('GET', '/tipos-egreso', null, tokens.admin);
    ok('GET tipos-egreso → 200', r.status === 200, `status=${r.status}`);
  });

  // ─── 8. REPORTES ──────────────────────────────────────────────
  await section('8. REPORTES', async () => {
    const hoy = new Date();
    const inicio = `${hoy.getFullYear()}-01-01`;
    const fin = `${hoy.getFullYear()}-12-31`;

    // Balance general
    let r = await req('GET', `/reportes/balance?fecha_inicio=${inicio}&fecha_fin=${fin}`, null, tokens.admin);
    ok('GET reportes/balance → 200', r.status === 200, `status=${r.status}`);
    const bal = r.body;
    ok('Balance tiene saldo_inicial', bal.saldo_inicial !== undefined, `saldo_inicial=${bal.saldo_inicial}`);
    ok('Balance tiene saldo_final', bal.saldo_final !== undefined, `saldo_final=${bal.saldo_final}`);
    ok('Balance tiene resumen_ingresos_publico', Array.isArray(bal.resumen_ingresos_publico), `type=${typeof bal.resumen_ingresos_publico}`);

    // Verificar sin duplicados en resumen
    if (Array.isArray(bal.resumen_ingresos_publico)) {
      const conceptosVistos = new Set();
      let duplicados = 0;
      bal.resumen_ingresos_publico.forEach(item => {
        if (conceptosVistos.has(item.concepto)) duplicados++;
        else conceptosVistos.add(item.concepto);
      });
      ok('Balance sin conceptos duplicados en resumen', duplicados === 0, `duplicados=${duplicados}`);
    }

    // Dashboard stats
    r = await req('GET', '/reportes/dashboard-stats', null, tokens.admin);
    ok('GET dashboard-stats → 200', r.status === 200, `status=${r.status}`);

    // Kardex socio
    r = await req('GET', '/reportes/socio/1', null, tokens.admin);
    ok('GET reportes/socio/1 → 200', r.status === 200, `status=${r.status}`);
    ok('Kardex tiene movimientos', Array.isArray(r.body?.movimientos), `keys=${Object.keys(r.body||{}).join(',')}`);
  });

  // ─── 9. RECUPERACIÓN DE CONTRASEÑA ───────────────────────────
  await section('9. RECUPERACIÓN DE CONTRASEÑA', async () => {
    let r = await req('POST', '/auth/olvide-password', { identificador: 'cajero_central' });
    ok('POST olvide-password → 200', r.status === 200, `status=${r.status}`);
    ok('Olvide-password retorna mensaje', r.body.mensaje !== undefined);
    const tokenDemo = r.body.token_demo;

    if (tokenDemo) {
      r = await req('POST', '/auth/reset-password', { token: tokenDemo, nueva_password: 'misocios2024' });
      ok('POST reset-password con token válido → 200', r.status === 200, `status=${r.status}`);
      ok('Reset-password retorna status true', r.body.status === true, `body=${JSON.stringify(r.body)}`);
    } else {
      ok('Token demo disponible (NODE_ENV≠production)', false, 'No se devolvió token_demo');
    }

    // Token inválido debe dar 400
    r = await req('POST', '/auth/reset-password', { token: 'tokeninvalido123', nueva_password: 'nueva123' });
    ok('POST reset-password token inválido → 400', r.status === 400, `status=${r.status}`);
  });

  // ─── 10. CONCURRENCIA: DOBLE COBRO (LOCK.UPDATE) ──────────────
  await section('10. CONCURRENCIA (Anti-Doble Cobro con LOCK.UPDATE)', async () => {
    // 1. Obtener un socio de asoc 1
    let r = await req('GET', '/socios', null, tokens.admin);
    const socios = r.body.socios || [];
    if (socios.length === 0) {
      ok('Socio disponible para prueba de concurrencia', false);
      return;
    }
    const idSocio = socios[0].id_socio;

    // 2. Crear un cargo temporal directamente en BD mediante el modelo de Sequelize
    const { Cargo } = require('../models');
    const cargoPrueba = await Cargo.create({
      id_asociacion: 1,
      id_socio: idSocio,
      id_concepto: 1,
      tipo_origen: 'manual',
      periodo: '2026-10',
      detalle: `[TEST CONCURRENCIA] Race condition test ${Date.now()}`,
      monto_capital_inicial: 100.00,
      saldo_capital_pendiente: 100.00,
      monto_mora_acumulada: 0.00,
      fecha_vencimiento: '2026-10-31',
      estado: 'Pendiente',
    });

    const idCargo = cargoPrueba.id_cargo;
    console.log(`  → Cargo de prueba creado: #${idCargo} (100.00 Bs, Pendiente)`);

    // 3. Disparar 5 peticiones simultáneas de cobro con Promise.all
    const promesas = Array.from({ length: 5 }, () =>
      req('POST', '/ingresos', {
        id_socio: idSocio,
        monto_total_recibido: 100.00,
        cargos: [
          {
            id_cargo: idCargo,
            monto_abonado_capital: 100.00,
            monto_abonado_mora: 0.00,
          },
        ],
        observacion: 'Pago prueba concurrente',
      }, tokens.cajero)
    );

    const resultados = await Promise.all(promesas);
    const exitosos = resultados.filter(res => res.status === 201).length;
    const rechazados = resultados.filter(res => res.status === 400).length;

    console.log(`  → Resultados: ${exitosos} exitoso(s) [201], ${rechazados} rechazado(s) [400]`);
    ok('Concurrencia: exactamente 1 cobro exitoso', exitosos === 1, `exitosos=${exitosos}`);
    ok('Concurrencia: 4 cobros duplicados rechazados atómicamente', rechazados === 4, `rechazados=${rechazados}`);

    // Verificar en BD que el cargo quedó en Pagado_Total y sin saldo negativo
    const cargoActualizado = await Cargo.findByPk(idCargo);
    ok('Cargo final en BD: estado Pagado_Total', cargoActualizado.estado === 'Pagado_Total', `estado=${cargoActualizado.estado}`);
    ok('Cargo final en BD: saldo exactamente 0.00 (sin saldo negativo)', parseFloat(cargoActualizado.saldo_capital_pendiente) === 0.00);
  });

  // ─── 11. INGRESOS DIRECTO (AFILIACIÓN) ───────────────────────
  await section('11. INGRESOS DIRECTO - AFILIACIÓN', async () => {
    let r = await req('GET', '/socios', null, tokens.admin);
    const socios = r.body.socios || [];
    ok('Socios disponibles para afiliación test', socios.length > 0, `count=${socios.length}`);

    // Validar rechazo limpio sin datos requeridos
    r = await req('POST', '/ingresos/directo', {}, tokens.cajero);
    ok('POST ingresos/directo sin datos → 400', r.status === 400, `status=${r.status}`);
  });

  // ─── 12. USUARIOS ─────────────────────────────────────────────
  await section('12. GESTIÓN DE USUARIOS', async () => {
    let r = await req('GET', '/usuarios', null, tokens.admin);
    ok('GET usuarios (admin) → 200', r.status === 200, `status=${r.status}`);

    // Cajero no puede ver lista de usuarios
    r = await req('GET', '/usuarios', null, tokens.cajero);
    ok('GET usuarios (cajero restringido) → 403', r.status === 403, `status=${r.status}`);
  });

  // ─── 13. ASOCIACIONES ──────────────────────────────────────────
  await section('13. ASOCIACIONES', async () => {
    let r = await req('GET', '/asociaciones', null, tokens.superadmin);
    ok('GET asociaciones (superadmin) → 200', r.status === 200, `status=${r.status}`);
    const asocs = Array.isArray(r.body) ? r.body : (r.body.asociaciones || r.body.data || []);
    ok('Existen 5 asociaciones en BD', asocs.length === 5, `count=${asocs.length}`);
  });

  // ─── RESUMEN FINAL ────────────────────────────────────────────
  const total = PASS + FAIL;
  console.log('\n' + '═'.repeat(60));
  console.log(`📊 RESUMEN FINAL: ${PASS}/${total} pruebas pasaron`);
  console.log(`   ✅ PASS: ${PASS}`);
  console.log(`   ❌ FAIL: ${FAIL}`);
  console.log('═'.repeat(60));
  if (FAIL === 0) {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON! Sistema 100% verificado para producción.');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${FAIL} prueba(s) fallida(s). Revisar los FAIL arriba.`);
    process.exit(1);
  }
}

main().catch(e => { console.error('ERROR FATAL:', e); process.exit(1); });
