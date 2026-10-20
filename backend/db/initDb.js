const bcrypt = require('bcrypt');
const {
  sequelize,
  Asociacion,
  Persona,
  Usuario,
  ConceptoCobro,
  TipoEgreso,
} = require('../models');

const initDb = async () => {
  try {
    console.log('--- Iniciando sincronización de base de datos ---');
    await sequelize.authenticate();
    console.log('Conexión a MySQL establecida correctamente.');

    await sequelize.sync({ alter: true });
    console.log('Modelos y tablas sincronizados exitosamente (alter: true).');

    // 1. Asociación por defecto
    let asociacion = await Asociacion.findOne({
      where: { nombre_mercado: 'Asociación Central de Comerciantes Minoristas' },
    });
    if (!asociacion) {
      asociacion = await Asociacion.create({
        nombre_mercado: 'Asociación Central de Comerciantes Minoristas',
        direccion: 'Av. Principal #100, Sector Central',
        estado: true,
      });
      console.log(`Asociación creada con ID: ${asociacion.id_asociacion}`);
    }

    const idAsociacion = asociacion.id_asociacion;

    // 2. Conceptos de Cobro estándar
    const conceptosBase = [
      {
        nombre_concepto: 'Luz',
        monto_fijo: null,
        aplica_mora: true,
        tasa_mora_mensual: 0.0300,
        dias_gracia: 5,
      },
      {
        nombre_concepto: 'Serenaje',
        monto_fijo: 20.00,
        aplica_mora: true,
        tasa_mora_mensual: 0.0200,
        dias_gracia: 10,
      },
      {
        nombre_concepto: 'Multa Asistencia',
        monto_fijo: 30.00,
        aplica_mora: false,
        tasa_mora_mensual: null,
        dias_gracia: 0,
      },
      {
        nombre_concepto: 'Cuota Aniversario',
        monto_fijo: 20.00,
        aplica_mora: false,
        tasa_mora_mensual: null,
        dias_gracia: 0,
      },
      {
        nombre_concepto: 'Traspaso Caseta',
        monto_fijo: null,
        aplica_mora: false,
        tasa_mora_mensual: null,
        dias_gracia: 0,
      },
    ];

    for (const c of conceptosBase) {
      const existe = await ConceptoCobro.findOne({
        where: { id_asociacion: idAsociacion, nombre_concepto: c.nombre_concepto },
      });
      if (!existe) {
        await ConceptoCobro.create({
          id_asociacion: idAsociacion,
          ...c,
        });
        console.log(`Concepto de cobro creado: ${c.nombre_concepto}`);
      }
    }

    // 3. Tipos de Egreso estándar
    const tiposEgresoBase = ['Oficina', 'Viáticos', 'Mantenimiento', 'Limpieza'];

    for (const cat of tiposEgresoBase) {
      const existe = await TipoEgreso.findOne({
        where: { id_asociacion: idAsociacion, nombre_categoria: cat },
      });
      if (!existe) {
        await TipoEgreso.create({
          id_asociacion: idAsociacion,
          nombre_categoria: cat,
        });
        console.log(`Tipo de egreso creado: ${cat}`);
      }
    }

    // 4. Usuario Administrador (Presidente) por defecto
    const adminUser = await Usuario.findOne({ where: { username: 'admin' } });
    if (!adminUser) {
      let personaAdmin = await Persona.findOne({ where: { ci: '1000001' } });
      if (!personaAdmin) {
        personaAdmin = await Persona.create({
          nombres: 'Administrador',
          apellidos: 'Presidente Central',
          ci: '1000001',
          telefono: '70000001',
          domicilio: 'Edificio Central del Mercado, Of. Presidencia',
        });
      }

      const adminPass = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
      const salt = await bcrypt.genSalt(10);
      const passwordHashed = await bcrypt.hash(adminPass, salt);

      await Usuario.create({
        id_persona: personaAdmin.id_persona,
        id_asociacion: idAsociacion,
        username: 'admin',
        password: passwordHashed,
        rol: 'PRESIDENTE',
        estado: true,
      });
      console.log('Usuario Administrador inicial creado con éxito.');
    }

    console.log('--- Base de datos inicializada y sembrada con éxito ---');
    return { ok: true, mensaje: 'Base de datos inicializada con éxito.' };
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
};

if (require.main === module) {
  initDb()
    .then(() => {
      console.log('Proceso de initDb finalizado correctamente.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fallo en initDb:', err);
      process.exit(1);
    });
}

module.exports = { initDb };
