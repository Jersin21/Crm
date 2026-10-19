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
} = require('../models');

async function seedMultiTenants() {
  const t = await sequelize.transaction();
  try {
    console.log('--- Creando Asociaciones Adicionales ---');

    // 1. ASOCIACIÓN 2: Mercado Modelo San Antonio
    let asoc2 = await Asociacion.findOne({ where: { nombre_mercado: 'Mercado Modelo San Antonio' }, transaction: t });
    if (!asoc2) {
      asoc2 = await Asociacion.create({
        nombre_mercado: 'Mercado Modelo San Antonio',
        direccion: 'Av. Brasil esq. Calle 7',
        estado: true,
        precio_kwh: 2.50,
        monto_serenaje: 25.00,
        dia_corte_serenaje: 5,
        multa_asamblea: 35.00,
        multa_marcha: 60.00,
        telefono: '3-3456789',
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
      console.log(`✅ Asociación 2 creada con ID: ${asoc2.id_asociacion}`);
    } else {
      console.log(`ℹ️ Asociación 2 ya existía con ID: ${asoc2.id_asociacion}`);
    }

    // 2. ASOCIACIÓN 3: Mercado Los Pozos Norte
    let asoc3 = await Asociacion.findOne({ where: { nombre_mercado: 'Mercado Los Pozos Norte' }, transaction: t });
    if (!asoc3) {
      asoc3 = await Asociacion.create({
        nombre_mercado: 'Mercado Los Pozos Norte',
        direccion: 'Av. Alemana esq. 3er Anillo',
        estado: true,
        precio_kwh: 3.00,
        monto_serenaje: 30.00,
        dia_corte_serenaje: 5,
        multa_asamblea: 40.00,
        multa_marcha: 70.00,
        telefono: '3-3889900',
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
      console.log(`✅ Asociación 3 creada con ID: ${asoc3.id_asociacion}`);
    } else {
      console.log(`ℹ️ Asociación 3 ya existía con ID: ${asoc3.id_asociacion}`);
    }

    const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);
    const hashedPasswordCajero = await bcrypt.hash('cajero123', 10);

    // Conceptos y Tipos de Egreso para Asociación 2
    const conceptosBase = ['Luz', 'Serenaje', 'Multa Asistencia', 'Multa Asamblea', 'Multa Marcha', 'Multa Mora Serenaje', 'Multa Mora Luz'];
    for (const nom of conceptosBase) {
      const existe = await ConceptoCobro.findOne({ where: { id_asociacion: asoc2.id_asociacion, nombre_concepto: nom }, transaction: t });
      if (!existe) {
        await ConceptoCobro.create({
          id_asociacion: asoc2.id_asociacion,
          nombre_concepto: nom,
          created_at: new Date(),
          updated_at: new Date(),
        }, { transaction: t });
      }
    }

    const tiposEgresoBase = ['Oficina', 'Viáticos', 'Mantenimiento', 'Limpieza'];
    for (const nom of tiposEgresoBase) {
      const existe = await TipoEgreso.findOne({ where: { id_asociacion: asoc2.id_asociacion, nombre_categoria: nom }, transaction: t });
      if (!existe) {
        await TipoEgreso.create({
          id_asociacion: asoc2.id_asociacion,
          nombre_categoria: nom,
          created_at: new Date(),
          updated_at: new Date(),
        }, { transaction: t });
      }
    }

    // Conceptos y Tipos de Egreso para Asociación 3
    for (const nom of conceptosBase) {
      const existe = await ConceptoCobro.findOne({ where: { id_asociacion: asoc3.id_asociacion, nombre_concepto: nom }, transaction: t });
      if (!existe) {
        await ConceptoCobro.create({
          id_asociacion: asoc3.id_asociacion,
          nombre_concepto: nom,
          created_at: new Date(),
          updated_at: new Date(),
        }, { transaction: t });
      }
    }
    for (const nom of tiposEgresoBase) {
      const existe = await TipoEgreso.findOne({ where: { id_asociacion: asoc3.id_asociacion, nombre_categoria: nom }, transaction: t });
      if (!existe) {
        await TipoEgreso.create({
          id_asociacion: asoc3.id_asociacion,
          nombre_categoria: nom,
          created_at: new Date(),
          updated_at: new Date(),
        }, { transaction: t });
      }
    }

    // Usuarios para Asociación 2
    let pAdmin2 = await Persona.findOne({ where: { ci: 'SA-ADM-01' }, transaction: t });
    if (!pAdmin2) {
      pAdmin2 = await Persona.create({
        ci: 'SA-ADM-01',
        nombres: 'Carlos',
        apellidos: 'Mendoza Roca',
        telefono: '70011223',
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
    }

    let uAdmin2 = await Usuario.findOne({ where: { username: 'admin_sanantonio' }, transaction: t });
    if (!uAdmin2) {
      uAdmin2 = await Usuario.create({
        id_persona: pAdmin2.id_persona,
        id_asociacion: asoc2.id_asociacion,
        username: 'admin_sanantonio',
        password: hashedPasswordAdmin,
        rol: 'ADMIN_ASOCIACION',
        estado: true,
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
      console.log('✅ Usuario admin_sanantonio creado');
    }

    let pCajero2 = await Persona.findOne({ where: { ci: 'SA-CAJ-01' }, transaction: t });
    if (!pCajero2) {
      pCajero2 = await Persona.create({
        ci: 'SA-CAJ-01',
        nombres: 'Patricia',
        apellidos: 'Flores Terrazas',
        telefono: '70022334',
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
    }

    let uCajero2 = await Usuario.findOne({ where: { username: 'cajero_sanantonio' }, transaction: t });
    if (!uCajero2) {
      uCajero2 = await Usuario.create({
        id_persona: pCajero2.id_persona,
        id_asociacion: asoc2.id_asociacion,
        username: 'cajero_sanantonio',
        password: hashedPasswordCajero,
        rol: 'CAJERO',
        estado: true,
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
      console.log('✅ Usuario cajero_sanantonio creado');
    }

    // Usuarios para Asociación 3
    let pAdmin3 = await Persona.findOne({ where: { ci: 'POZ-ADM-01' }, transaction: t });
    if (!pAdmin3) {
      pAdmin3 = await Persona.create({
        ci: 'POZ-ADM-01',
        nombres: 'Elena',
        apellidos: 'Chavez Mercado',
        telefono: '70033445',
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
    }

    let uAdmin3 = await Usuario.findOne({ where: { username: 'admin_pozos' }, transaction: t });
    if (!uAdmin3) {
      uAdmin3 = await Usuario.create({
        id_persona: pAdmin3.id_persona,
        id_asociacion: asoc3.id_asociacion,
        username: 'admin_pozos',
        password: hashedPasswordAdmin,
        rol: 'ADMIN_ASOCIACION',
        estado: true,
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
      console.log('✅ Usuario admin_pozos creado');
    }

    // Socios para Asociación 2
    let pSocio2A = await Persona.findOne({ where: { ci: 'SA-SOC-01' }, transaction: t });
    if (!pSocio2A) {
      pSocio2A = await Persona.create({
        ci: 'SA-SOC-01',
        nombres: 'Mario',
        apellidos: 'Torres Vaca',
        telefono: '71122334',
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
    }

    let socio2A = await Socio.findOne({ where: { id_asociacion: asoc2.id_asociacion, nro_caseta: 'A-101' }, transaction: t });
    if (!socio2A) {
      socio2A = await Socio.create({
        id_persona: pSocio2A.id_persona,
        id_asociacion: asoc2.id_asociacion,
        nro_caseta: 'A-101',
        estado_socio: 'Activo',
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
      console.log('✅ Socio A-101 creado en Asociación 2');
    }

    let pSocio2B = await Persona.findOne({ where: { ci: 'SA-SOC-02' }, transaction: t });
    if (!pSocio2B) {
      pSocio2B = await Persona.create({
        ci: 'SA-SOC-02',
        nombres: 'Juana',
        apellidos: 'Perez Gutierrez',
        telefono: '71133445',
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
    }

    let socio2B = await Socio.findOne({ where: { id_asociacion: asoc2.id_asociacion, nro_caseta: 'A-102' }, transaction: t });
    if (!socio2B) {
      socio2B = await Socio.create({
        id_persona: pSocio2B.id_persona,
        id_asociacion: asoc2.id_asociacion,
        nro_caseta: 'A-102',
        estado_socio: 'Activo',
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
      console.log('✅ Socio A-102 creado en Asociación 2');
    }

    // Socios para Asociación 3
    let pSocio3A = await Persona.findOne({ where: { ci: 'POZ-SOC-01' }, transaction: t });
    if (!pSocio3A) {
      pSocio3A = await Persona.create({
        ci: 'POZ-SOC-01',
        nombres: 'Dario',
        apellidos: 'Salvatierra Suarez',
        telefono: '72233445',
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
    }

    let socio3A = await Socio.findOne({ where: { id_asociacion: asoc3.id_asociacion, nro_caseta: 'P-01' }, transaction: t });
    if (!socio3A) {
      socio3A = await Socio.create({
        id_persona: pSocio3A.id_persona,
        id_asociacion: asoc3.id_asociacion,
        nro_caseta: 'P-01',
        estado_socio: 'Activo',
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction: t });
      console.log('✅ Socio P-01 creado en Asociación 3');
    }

    await t.commit();
    console.log('🎉 Seed de Multi-tenants completado exitosamente.');
  } catch (error) {
    await t.rollback();
    console.error('❌ Error en seedMultiTenants:', error);
  } finally {
    process.exit(0);
  }
}

seedMultiTenants();
