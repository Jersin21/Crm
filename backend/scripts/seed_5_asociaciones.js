const bcrypt = require('bcrypt');
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
  Egreso,
} = require('../models');

async function seedCincoAsociaciones() {
  console.log('========================================================');
  console.log('🚀 SEEDER: Generando 5 Asociaciones con 10 Socios c/u');
  console.log('========================================================');

  const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);
  const hashedPasswordCajero = await bcrypt.hash('cajero123', 10);
  const hashedPasswordSuper = await bcrypt.hash('superadmin123', 10);
  const hashedPasswordSecre = await bcrypt.hash('secre123', 10);

  // ─── 1. Definición de las 5 Asociaciones ─────────────────────────────────────
  const infoAsociaciones = [
    {
      id_asociacion: 1,
      nombre_mercado: 'Asociación Central de Comerciantes Minoristas',
      direccion: 'Calle Mercado esq. Colón #120, Casco Viejo',
      telefono: '3-3331122',
      precio_kwh: 2.00,
      monto_serenaje: 20.00,
      dia_corte_serenaje: 5,
      multa_asamblea: 30.00,
      multa_marcha: 50.00,
      usuarios: [
        { username: 'admin', password: hashedPasswordAdmin, rol: 'PRESIDENTE', nombre: 'Carlos', apellido: 'Mendoza Vaca', ci: '4589123' },
        { username: 'cajero_central', password: hashedPasswordCajero, rol: 'CAJERO', nombre: 'Patricia', apellido: 'Suárez Justiniano', ci: '5874123' },
        { username: 'secre_central', password: hashedPasswordSecre, rol: 'SEC_HACIENDA', nombre: 'Lucía', apellido: 'Fernández Torrez', ci: '6985214' },
      ],
    },
    {
      id_asociacion: 2,
      nombre_mercado: 'Mercado Modelo San Antonio',
      direccion: 'Av. Brasil esq. Calle 7, Zona Este',
      telefono: '3-3456789',
      precio_kwh: 2.50,
      monto_serenaje: 25.00,
      dia_corte_serenaje: 5,
      multa_asamblea: 35.00,
      multa_marcha: 60.00,
      usuarios: [
        { username: 'admin_sanantonio', password: hashedPasswordAdmin, rol: 'ADMIN_ASOCIACION', nombre: 'Roberto', apellido: 'Alba Céspedes', ci: '3214567' },
        { username: 'cajero_sanantonio', password: hashedPasswordCajero, rol: 'CAJERO', nombre: 'Elena', apellido: 'Roca Banegas', ci: '7896541' },
      ],
    },
    {
      id_asociacion: 3,
      nombre_mercado: 'Mercado Los Pozos Norte',
      direccion: 'Av. Alemana esq. 3er Anillo Interno',
      telefono: '3-3889900',
      precio_kwh: 3.00,
      monto_serenaje: 30.00,
      dia_corte_serenaje: 5,
      multa_asamblea: 40.00,
      multa_marcha: 70.00,
      usuarios: [
        { username: 'admin_pozos', password: hashedPasswordAdmin, rol: 'ADMIN_ASOCIACION', nombre: 'Germán', apellido: 'Antelo Gutiérrez', ci: '4561238' },
        { username: 'cajero_pozos', password: hashedPasswordCajero, rol: 'CAJERO', nombre: 'Valeria', apellido: 'Justiniano Parada', ci: '8529631' },
      ],
    },
    {
      id_asociacion: 4,
      nombre_mercado: 'Mercado Nuevo Abasto Mayorista',
      direccion: 'Doble Vía La Guardia Km 6, Zona Sur',
      telefono: '3-3774411',
      precio_kwh: 2.20,
      monto_serenaje: 20.00,
      dia_corte_serenaje: 5,
      multa_asamblea: 50.00,
      multa_marcha: 80.00,
      usuarios: [
        { username: 'admin_abasto', password: hashedPasswordAdmin, rol: 'ADMIN_ASOCIACION', nombre: 'Fernando', apellido: 'Vargas Mercado', ci: '5612347' },
        { username: 'cajero_abasto', password: hashedPasswordCajero, rol: 'CAJERO', nombre: 'Silvia', apellido: 'Morales Sandoval', ci: '9632587' },
      ],
    },
    {
      id_asociacion: 5,
      nombre_mercado: 'Mercado La Ramada Integral',
      direccion: 'Av. Grigotá esq. Calle Muchirí, Zona Oeste',
      telefono: '3-3552233',
      precio_kwh: 2.30,
      monto_serenaje: 25.00,
      dia_corte_serenaje: 5,
      multa_asamblea: 40.00,
      multa_marcha: 60.00,
      usuarios: [
        { username: 'admin_ramada', password: hashedPasswordAdmin, rol: 'ADMIN_ASOCIACION', nombre: 'Mauricio', apellido: 'Camacho Hurtado', ci: '6325874' },
        { username: 'cajero_ramada', password: hashedPasswordCajero, rol: 'CAJERO', nombre: 'Daniela', apellido: 'Soliz Arteaga', ci: '7412589' },
      ],
    },
  ];

  // Nombres base para crear socios realistas
  const personasSociosBase = [
    { nombres: 'Juan Carlos', apellidos: 'Pérez Ramos', ci: '4123890', tel: '71012345' },
    { nombres: 'María Esther', apellidos: 'Gonzales Flores', ci: '5234901', tel: '72023456' },
    { nombres: 'Pedro Antonio', apellidos: 'Mamani Quispe', ci: '6345012', tel: '73034567' },
    { nombres: 'Ana Rosa', apellidos: 'Gutiérrez Chávez', ci: '7456123', tel: '74045678' },
    { nombres: 'José Luis', apellidos: 'Morales Vaca', ci: '8567234', tel: '75056789' },
    { nombres: 'Carmen Gloria', apellidos: 'Torrez Justiniano', ci: '9678345', tel: '76067890' },
    { nombres: 'Rubén Darío', apellidos: 'Céspedes Roca', ci: '3789456', tel: '77078901' },
    { nombres: 'Teresa Beatriz', apellidos: 'Alba Banegas', ci: '4890567', tel: '78089012' },
    { nombres: 'Mario Andrés', apellidos: 'Hurtado Sandoval', ci: '5901678', tel: '79090123' },
    { nombres: 'Sonia Maribel', apellidos: 'Chávez Antelo', ci: '6012789', tel: '70101234' },
  ];

  const conceptosCobroNombres = [
    'Luz',
    'Serenaje',
    'Multa Asistencia',
    'Multa Asamblea',
    'Multa Marcha',
    'Multa Mora Serenaje',
    'Multa Mora Luz',
    'Traspaso de Caseta (10%)',
    'Cuota de Afiliación / Nuevo Socio',
    'Alquiler de Espacio Común',
  ];

  const tiposEgresoNombres = [
    'Gastos Operativos y Oficina',
    'Mantenimiento y Reparaciones',
    'Limpieza y Aseo Urbano',
    'Seguridad y Vigilancia Privada',
    'Viáticos y Representación Directiva',
  ];

  for (const info of infoAsociaciones) {
    const t = await sequelize.transaction();
    try {
      // 1. Crear o actualizar Asociación
      let asoc = await Asociacion.findOne({ where: { nombre_mercado: info.nombre_mercado }, transaction: t });
      if (!asoc) {
        asoc = await Asociacion.create({
          nombre_mercado: info.nombre_mercado,
          direccion: info.direccion,
          telefono: info.telefono,
          estado: true,
          precio_kwh: info.precio_kwh,
          monto_serenaje: info.monto_serenaje,
          dia_corte_serenaje: info.dia_corte_serenaje,
          multa_asamblea: info.multa_asamblea,
          multa_marcha: info.multa_marcha,
          created_at: new Date(),
          updated_at: new Date(),
        }, { transaction: t });
        console.log(`✅ Creada Asociación #${asoc.id_asociacion}: "${asoc.nombre_mercado}"`);
      } else {
        await asoc.update({
          estado: true,
          precio_kwh: info.precio_kwh,
          monto_serenaje: info.monto_serenaje,
          direccion: info.direccion,
        }, { transaction: t });
        console.log(`ℹ️ Asociación #${asoc.id_asociacion} ya existía: "${asoc.nombre_mercado}"`);
      }

      const idAsoc = asoc.id_asociacion;

      // 2. Crear Conceptos de Cobro
      const mapaConceptos = {};
      for (const nom of conceptosCobroNombres) {
        let conc = await ConceptoCobro.findOne({ where: { id_asociacion: idAsoc, nombre_concepto: nom }, transaction: t });
        if (!conc) {
          conc = await ConceptoCobro.create({
            id_asociacion: idAsoc,
            nombre_concepto: nom,
            created_at: new Date(),
            updated_at: new Date(),
          }, { transaction: t });
        }
        mapaConceptos[nom] = conc;
      }

      // 3. Crear Tipos de Egreso
      const mapaEgresos = {};
      for (const nom of tiposEgresoNombres) {
        let tipoEg = await TipoEgreso.findOne({ where: { id_asociacion: idAsoc, nombre_categoria: nom }, transaction: t });
        if (!tipoEg) {
          tipoEg = await TipoEgreso.create({
            id_asociacion: idAsoc,
            nombre_categoria: nom,
            created_at: new Date(),
            updated_at: new Date(),
          }, { transaction: t });
        }
        mapaEgresos[nom] = tipoEg;
      }

      // 4. Crear Usuarios de la Asociación
      let usuarioAdminId = null;
      for (const u of info.usuarios) {
        let userRecord = await Usuario.findOne({ where: { username: u.username }, transaction: t });
        if (!userRecord) {
          const personaU = await Persona.create({
            nombres: u.nombre,
            apellidos: u.apellido,
            ci: u.ci,
            domicilio: info.direccion,
            telefono: info.telefono,
            created_at: new Date(),
            updated_at: new Date(),
          }, { transaction: t });

          userRecord = await Usuario.create({
            id_persona: personaU.id_persona,
            id_asociacion: idAsoc,
            username: u.username,
            password: u.password,
            rol: u.rol,
            estado: true,
            intentos_fallidos: 0,
            bloqueado_hasta: null,
            created_at: new Date(),
            updated_at: new Date(),
          }, { transaction: t });
          console.log(`   👤 Creado usuario "${u.username}" (${u.rol}) para Asoc #${idAsoc}`);
        } else {
          await userRecord.update({
            password: u.password,
            estado: true,
            intentos_fallidos: 0,
            bloqueado_hasta: null,
            rol: u.rol,
            id_asociacion: idAsoc,
          }, { transaction: t });
        }
        if (u.rol === 'ADMIN_ASOCIACION' || u.rol === 'PRESIDENTE') {
          usuarioAdminId = userRecord.id_usuario;
        }
      }

      // 5. Garantizar exactamente o al menos 10 Socios para esta Asociación
      const sociosActuales = await Socio.findAll({ where: { id_asociacion: idAsoc, deleted_at: null }, transaction: t });
      const sociosFaltantes = Math.max(0, 10 - sociosActuales.length);

      const listaSociosTotal = [...sociosActuales];

      if (sociosFaltantes > 0) {
        console.log(`   ➕ Añadiendo ${sociosFaltantes} socios para completar 10 socios en Asoc #${idAsoc}...`);
        for (let i = 0; i < sociosFaltantes; i++) {
          const baseIdx = (sociosActuales.length + i) % personasSociosBase.length;
          const baseP = personasSociosBase[baseIdx];
          const nroCaseta = String(sociosActuales.length + i + 1);

          const persona = await Persona.create({
            nombres: `${baseP.nombres}`,
            apellidos: `${baseP.apellidos}`,
            ci: `${baseP.ci}-${idAsoc}`,
            telefono: baseP.tel,
            domicilio: `Mercado ${asoc.nombre_mercado}, Caseta #${nroCaseta}`,
            created_at: new Date(),
            updated_at: new Date(),
          }, { transaction: t });

          const socio = await Socio.create({
            id_persona: persona.id_persona,
            id_asociacion: idAsoc,
            nro_caseta: nroCaseta,
            estado_socio: 'Activo',
            created_at: new Date(),
            updated_at: new Date(),
          }, { transaction: t });

          listaSociosTotal.push(socio);
        }
      }

      console.log(`   👥 Total de Socios listos en Asoc #${idAsoc}: ${listaSociosTotal.length} socios`);

      // 6. Generar Cargos pendientes de prueba para los primeros socios de la asociación
      const primerSocio = listaSociosTotal[0];
      const segundoSocio = listaSociosTotal[1];
      const tercerSocio = listaSociosTotal[2];

      if (primerSocio) {
        // Cargo de Luz pendiente
        const cargoLuzExistente = await Cargo.findOne({
          where: { id_socio: primerSocio.id_socio, periodo: '2026-10', tipo_origen: 'consumo_luz' },
          transaction: t,
        });
        if (!cargoLuzExistente && mapaConceptos['Luz']) {
          await Cargo.create({
            id_asociacion: idAsoc,
            id_socio: primerSocio.id_socio,
            id_concepto: mapaConceptos['Luz'].id_concepto,
            tipo_origen: 'consumo_luz',
            periodo: '2026-10',
            detalle: `Consumo Energía Eléctrica (60 kWh x Bs. ${info.precio_kwh})`,
            monto_capital_inicial: (60 * info.precio_kwh).toFixed(2),
            saldo_capital_pendiente: (60 * info.precio_kwh).toFixed(2),
            monto_mora_acumulada: 0,
            fecha_vencimiento: '2026-10-25',
            estado: 'Pendiente',
            created_at: new Date(),
            updated_at: new Date(),
          }, { transaction: t });
        }

        // Cargo de Serenaje pendiente
        const cargoSerenajeExistente = await Cargo.findOne({
          where: { id_socio: primerSocio.id_socio, periodo: '2026-10', tipo_origen: 'serenaje' },
          transaction: t,
        });
        if (!cargoSerenajeExistente && mapaConceptos['Serenaje']) {
          await Cargo.create({
            id_asociacion: idAsoc,
            id_socio: primerSocio.id_socio,
            id_concepto: mapaConceptos['Serenaje'].id_concepto,
            tipo_origen: 'serenaje',
            periodo: '2026-10',
            detalle: `Aporte mensual de Serenaje y Seguridad (Octubre 2026)`,
            monto_capital_inicial: info.monto_serenaje.toFixed(2),
            saldo_capital_pendiente: info.monto_serenaje.toFixed(2),
            monto_mora_acumulada: 0,
            fecha_vencimiento: '2026-10-20',
            estado: 'Pendiente',
            created_at: new Date(),
            updated_at: new Date(),
          }, { transaction: t });
        }
      }

      if (segundoSocio && mapaConceptos['Multa Asamblea']) {
        const cargoMulta = await Cargo.findOne({
          where: { id_socio: segundoSocio.id_socio, tipo_origen: 'evento' },
          transaction: t,
        });
        if (!cargoMulta) {
          await Cargo.create({
            id_asociacion: idAsoc,
            id_socio: segundoSocio.id_socio,
            id_concepto: mapaConceptos['Multa Asamblea'].id_concepto,
            tipo_origen: 'evento',
            periodo: '2026-10',
            detalle: `Multa por inasistencia a Asamblea General Ordinaria`,
            monto_capital_inicial: info.multa_asamblea.toFixed(2),
            saldo_capital_pendiente: info.multa_asamblea.toFixed(2),
            monto_mora_acumulada: 0,
            fecha_vencimiento: '2026-10-30',
            estado: 'Pendiente',
            created_at: new Date(),
            updated_at: new Date(),
          }, { transaction: t });
        }
      }

      // 7. Generar algunos Ingresos de muestra (con nro_recibo secuencial) para la asociación si tiene menos de 2
      const totalIngresosAsoc = await Ingreso.count({ where: { id_asociacion: idAsoc }, transaction: t });
      if (totalIngresosAsoc === 0 && usuarioAdminId) {
        // Ingreso 1: Traspaso 10%
        const ingreso1 = await Ingreso.create({
          id_asociacion: idAsoc,
          nro_recibo: 1,
          id_socio: primerSocio ? primerSocio.id_socio : null,
          id_usuario: usuarioAdminId,
          id_concepto: mapaConceptos['Traspaso de Caseta (10%)'] ? mapaConceptos['Traspaso de Caseta (10%)'].id_concepto : null,
          concepto: 'Traspaso de Caseta (10%)',
          tipo_origen: 'traspaso',
          pagador: 'Carlos Eduardo Banegas (Comprador Caseta)',
          monto_total_recibido: 3500.00,
          fecha_pago: new Date(),
          estado: 'Valido',
          observacion: '[TRASPASO]: Venta de caseta comercial por Bs. 35,000.00 (Retención estatutaria del 10% para la asociación).',
          created_at: new Date(),
          updated_at: new Date(),
        }, { transaction: t });

        // Ingreso 2: Afiliación nuevo socio
        await Ingreso.create({
          id_asociacion: idAsoc,
          nro_recibo: 2,
          id_socio: segundoSocio ? segundoSocio.id_socio : null,
          id_usuario: usuarioAdminId,
          id_concepto: mapaConceptos['Cuota de Afiliación / Nuevo Socio'] ? mapaConceptos['Cuota de Afiliación / Nuevo Socio'].id_concepto : null,
          concepto: 'Cuota de Afiliación / Nuevo Socio',
          tipo_origen: 'afiliacion',
          pagador: 'Martha Claros Salvatierra',
          monto_total_recibido: 500.00,
          fecha_pago: new Date(),
          estado: 'Valido',
          observacion: '[AFILIACIÓN]: Cuota formal de incorporación al padrón oficial de socios comerciantes.',
          created_at: new Date(),
          updated_at: new Date(),
        }, { transaction: t });

        console.log(`   🧾 Generados 2 recibos oficiales de muestra para Asoc #${idAsoc} (Recibos #1 y #2)`);
      }

      // 8. Generar un Egreso de muestra para balance
      const totalEgresosAsoc = await Egreso.count({ where: { id_asociacion: idAsoc }, transaction: t });
      if (totalEgresosAsoc === 0 && usuarioAdminId && mapaEgresos['Limpieza y Aseo Urbano']) {
        await Egreso.create({
          id_asociacion: idAsoc,
          id_usuario: usuarioAdminId,
          id_tipo_egreso: mapaEgresos['Limpieza y Aseo Urbano'].id_tipo_egreso,
          monto: 350.00,
          fecha_gasto: new Date().toISOString().split('T')[0],
          detalle: 'Compra de insumos de desinfección, bolsas plásticas y escobillones para pasillos del mercado',
          created_at: new Date(),
          updated_at: new Date(),
        }, { transaction: t });
        console.log(`   💸 Generado egreso de prueba para Asoc #${idAsoc}`);
      }

      await t.commit();
      console.log(`✨ Asociación #${idAsoc} completamente aprovisionada y verificada.\n`);
    } catch (err) {
      await t.rollback();
      console.error(`❌ Error en Asociación ${info.nombre_mercado}:`, err);
    }
  }

  // ─── 2. Crear o actualizar SUPERADMIN_SAAS global ───────────────────────────
  const tGlobal = await sequelize.transaction();
  try {
    let superUser = await Usuario.findOne({ where: { username: 'superadmin' }, transaction: tGlobal });
    if (!superUser) {
      const personaSuper = await Persona.create({
        nombres: 'Super Administrador',
        apellidos: 'SaaS MercadoCRM',
        ci: '1000001',
        domicilio: 'Oficina Central SaaS',
        telefono: '800-10-MERCADO',
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: tGlobal });

      superUser = await Usuario.create({
        id_persona: personaSuper.id_persona,
        id_asociacion: 1, // Asociación ancla
        username: 'superadmin',
        password: hashedPasswordSuper,
        rol: 'SUPERADMIN_SAAS',
        estado: true,
        intentos_fallidos: 0,
        bloqueado_hasta: null,
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: tGlobal });
      console.log('👑 Creado Superadmin Global: "superadmin" / "superadmin123"');
    } else {
      await superUser.update({
        password: hashedPasswordSuper,
        estado: true,
        intentos_fallidos: 0,
        bloqueado_hasta: null,
      }, { transaction: tGlobal });
      console.log('👑 Superadmin Global actualizado: "superadmin" / "superadmin123"');
    }
    await tGlobal.commit();
  } catch (err) {
    await tGlobal.rollback();
    console.error('❌ Error al configurar Superadmin:', err);
  }

  console.log('========================================================');
  console.log('🎉 SEED COMPLETO: 5 Asociaciones con 10 Socios c/u listas');
  console.log('========================================================');
}

seedCincoAsociaciones().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
