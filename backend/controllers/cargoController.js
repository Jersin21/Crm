const { Op } = require('sequelize');
const { Cargo, Socio, ConceptoCobro, Persona, ConsumoLuz } = require('../models');

/**
 * getCargos: obtener cargos de la asociación con filtros opcionales
 */
const getCargos = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const { estado, id_socio, periodo, tipo_origen } = req.query;

    const filtro = { id_asociacion, deleted_at: null };
    if (estado) filtro.estado = estado;
    if (id_socio) filtro.id_socio = id_socio;
    if (periodo) filtro.periodo = periodo;
    if (tipo_origen) filtro.tipo_origen = tipo_origen;

    const cargos = await Cargo.findAll({
      where: filtro,
      include: [
        { model: Socio, as: 'socio', include: [{ model: Persona, as: 'persona' }] },
        { model: ConceptoCobro, as: 'concepto' },
      ],
      order: [['fecha_vencimiento', 'ASC']],
    });
    return res.status(200).json({ cargos });
  } catch (error) {
    next(error);
  }
};

/**
 * getCargosySocio: obtener cargos pendientes o parciales de un socio
 */
const getCargosySocio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;

    const socio = await Socio.findOne({ where: { id_socio: id, id_asociacion, deleted_at: null } });
    if (!socio) return res.status(404).json({ mensaje: 'Socio no encontrado.' });

    const cargos = await Cargo.findAll({
      where: {
        id_socio: id,
        id_asociacion,
        estado: { [Op.in]: ['Pendiente', 'Pagado_Parcial'] },
        deleted_at: null,
      },
      include: [{ model: ConceptoCobro, as: 'concepto' }],
      order: [['fecha_vencimiento', 'ASC']],
    });
    return res.status(200).json({ cargos });
  } catch (error) {
    next(error);
  }
};

/**
 * calcularMoras: calcular mora acumulada para todos los cargos vencidos con aplica_mora=true
 */
const calcularMoras = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const hoy = new Date();

    // Obtener cargos pendientes o parcialmente pagados de esta asociación
    const cargos = await Cargo.findAll({
      where: {
        id_asociacion,
        estado: { [Op.in]: ['Pendiente', 'Pagado_Parcial'] },
        deleted_at: null,
      },
      include: [{ model: ConceptoCobro, as: 'concepto' }],
    });

    let cargosActualizados = 0;

    for (const cargo of cargos) {
      const concepto = cargo.concepto;
      if (!concepto || !concepto.aplica_mora || !concepto.tasa_mora_mensual) continue;

      const fechaVencimiento = new Date(cargo.fecha_vencimiento);
      const diasGracia = concepto.dias_gracia || 0;
      const fechaInicioMora = new Date(fechaVencimiento);
      fechaInicioMora.setDate(fechaInicioMora.getDate() + diasGracia);

      if (hoy <= fechaInicioMora) continue; // Aún en período de gracia

      // Usar la fecha desde donde calcular mora (última calc o inicio mora)
      const fechaDesde = cargo.fecha_ultima_calc_mora
        ? new Date(cargo.fecha_ultima_calc_mora)
        : fechaInicioMora;

      if (hoy <= fechaDesde) continue;

      // Calcular días transcurridos desde la última vez que se calculó mora
      const diasTranscurridos = Math.floor((hoy - fechaDesde) / (1000 * 60 * 60 * 24));
      if (diasTranscurridos <= 0) continue;

      // Tasa diaria = tasa mensual / 30
      const tasaDiaria = parseFloat(concepto.tasa_mora_mensual) / 30;
      const moraAdicional = parseFloat(cargo.saldo_capital_pendiente) * tasaDiaria * diasTranscurridos;

      const nuevaMora = parseFloat(cargo.monto_mora_acumulada) + moraAdicional;

      await cargo.update({
        monto_mora_acumulada: nuevaMora.toFixed(2),
        fecha_ultima_calc_mora: hoy,
        updated_at: new Date(),
      });

      cargosActualizados++;
    }

    return res.status(200).json({
      mensaje: `Mora calculada para ${cargosActualizados} cargo(s).`,
      cargos_actualizados: cargosActualizados,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * anularCargo: cambiar estado a 'Anulado'
 */
const anularCargo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;

    const cargo = await Cargo.findOne({ where: { id_cargo: id, id_asociacion, deleted_at: null } });
    if (!cargo) return res.status(404).json({ mensaje: 'Cargo no encontrado.' });

    if (cargo.estado === 'Anulado') {
      return res.status(400).json({ mensaje: 'El cargo ya está anulado.' });
    }

    await cargo.update({ estado: 'Anulado', updated_at: new Date() });
    return res.status(200).json({ mensaje: 'Cargo anulado correctamente.', cargo });
  } catch (error) {
    next(error);
  }
};

/**
 * generarSerenajeMes: genera el cargo de Serenaje (20 Bs) a todos los socios activos para un periodo
 */
const generarSerenajeMes = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const { periodo } = req.body;

    if (!periodo) {
      return res.status(400).json({ mensaje: 'El periodo (YYYY-MM) es requerido.' });
    }

    let conceptoSerenaje = await ConceptoCobro.findOne({
      where: { id_asociacion, nombre_concepto: 'Serenaje', deleted_at: null },
    });

    if (!conceptoSerenaje) {
      conceptoSerenaje = await ConceptoCobro.create({
        id_asociacion,
        nombre_concepto: 'Serenaje',
        monto_fijo: 20.00,
        aplica_mora: true,
        tasa_mora_mensual: 0.02,
        dias_gracia: 10,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    const montoSerenaje = parseFloat(conceptoSerenaje.monto_fijo || 20.00);

    const sociosActivos = await Socio.findAll({
      where: { id_asociacion, estado_socio: 'Activo', deleted_at: null },
    });

    const [anio, mes] = periodo.split('-');
    const fechaVencimiento = new Date(parseInt(anio), parseInt(mes), 10);

    let cargosCreados = 0;
    let multasCreadas = 0;

    // Buscar o crear concepto de Multa por Mora Serenaje (20 Bs)
    const [conceptoMoraSerenaje] = await ConceptoCobro.findOrCreate({
      where: { id_asociacion, nombre_concepto: 'Multa Mora Serenaje', deleted_at: null },
      defaults: {
        id_asociacion,
        nombre_concepto: 'Multa Mora Serenaje',
        monto_fijo: 20.00,
        aplica_mora: false,
        tasa_mora_mensual: 0,
        dias_gracia: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // ─── OPTIMIZACIÓN RENDIMIENTO: Eliminar consultas N+1 ───
    // 1. Consultar en una sola query los cargos de serenaje y multa ya existentes para este periodo
    const existingCargosPeriodo = await Cargo.findAll({
      where: {
        id_asociacion,
        id_concepto: [conceptoSerenaje.id_concepto, conceptoMoraSerenaje.id_concepto],
        periodo,
        deleted_at: null,
      },
      attributes: ['id_socio', 'id_concepto'],
    });

    const existingSerenajeSet = new Set(
      existingCargosPeriodo
        .filter(c => c.id_concepto === conceptoSerenaje.id_concepto)
        .map(c => c.id_socio)
    );
    const existingMoraSet = new Set(
      existingCargosPeriodo
        .filter(c => c.id_concepto === conceptoMoraSerenaje.id_concepto)
        .map(c => c.id_socio)
    );

    // 2. Consultar en una sola query todos los meses pendientes de serenaje por socio
    const pendingSerenajes = await Cargo.findAll({
      where: {
        id_asociacion,
        id_concepto: conceptoSerenaje.id_concepto,
        estado: { [Op.in]: ['Pendiente', 'Pagado_Parcial'] },
        deleted_at: null,
      },
      attributes: ['id_socio'],
    });

    const countImpagosMap = new Map();
    for (const p of pendingSerenajes) {
      countImpagosMap.set(p.id_socio, (countImpagosMap.get(p.id_socio) || 0) + 1);
    }

    const cargosToInsert = [];
    const multasToInsert = [];

    for (const s of sociosActivos) {
      if (!existingSerenajeSet.has(s.id_socio)) {
        const impagosPrevios = countImpagosMap.get(s.id_socio) || 0;

        cargosToInsert.push({
          id_socio: s.id_socio,
          id_asociacion,
          id_concepto: conceptoSerenaje.id_concepto,
          tipo_origen: 'serenaje',
          periodo,
          detalle: `Aporte Serenaje y Seguridad (${periodo})`,
          monto_capital_inicial: montoSerenaje,
          saldo_capital_pendiente: montoSerenaje,
          monto_mora_acumulada: 0,
          fecha_vencimiento: fechaVencimiento,
          estado: 'Pendiente',
          created_at: new Date(),
          updated_at: new Date(),
        });

        // REGLA: Si con este nuevo cobro alcanza 3 meses impagos (2 previos + el nuevo)
        if (impagosPrevios >= 2 && !existingMoraSet.has(s.id_socio)) {
          multasToInsert.push({
            id_socio: s.id_socio,
            id_asociacion,
            id_concepto: conceptoMoraSerenaje.id_concepto,
            tipo_origen: 'mora_serenaje',
            periodo,
            detalle: `Multa por Mora en Serenaje (${impagosPrevios + 1} meses impagos)`,
            monto_capital_inicial: 20.00,
            saldo_capital_pendiente: 20.00,
            monto_mora_acumulada: 0,
            fecha_vencimiento: fechaVencimiento,
            estado: 'Pendiente',
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }
    }

    if (cargosToInsert.length > 0) {
      await Cargo.bulkCreate(cargosToInsert);
    }
    if (multasToInsert.length > 0) {
      await Cargo.bulkCreate(multasToInsert);
    }

    cargosCreados = cargosToInsert.length;
    multasCreadas = multasToInsert.length;

    return res.status(200).json({
      mensaje: `Serenaje del periodo ${periodo} procesado. Se generaron ${cargosCreados} cargos de serenaje y ${multasCreadas} multa(s) por 3er mes de mora.`,
      cargos_creados: cargosCreados,
      multas_creadas: multasCreadas,
      total_socios: sociosActivos.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Función interna reutilizable para el Cron / Scheduler automático del día 5
 */
const procesarSerenajeAsociacion = async (id_asociacion, periodo) => {
  let conceptoSerenaje = await ConceptoCobro.findOne({
    where: { id_asociacion, nombre_concepto: 'Serenaje', deleted_at: null },
  });

  if (!conceptoSerenaje) {
    conceptoSerenaje = await ConceptoCobro.create({
      id_asociacion,
      nombre_concepto: 'Serenaje',
      monto_fijo: 20.00,
      aplica_mora: true,
      tasa_mora_mensual: 0.02,
      dias_gracia: 10,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  const [conceptoMoraSerenaje] = await ConceptoCobro.findOrCreate({
    where: { id_asociacion, nombre_concepto: 'Multa Mora Serenaje', deleted_at: null },
    defaults: {
      id_asociacion,
      nombre_concepto: 'Multa Mora Serenaje',
      monto_fijo: 20.00,
      aplica_mora: false,
      tasa_mora_mensual: 0,
      dias_gracia: 0,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  const montoSerenaje = parseFloat(conceptoSerenaje.monto_fijo || 20.00);
  const sociosActivos = await Socio.findAll({
    where: { id_asociacion, estado_socio: 'Activo', deleted_at: null },
  });

  const [anio, mes] = periodo.split('-');
  const fechaVencimiento = new Date(parseInt(anio), parseInt(mes), 10);

  // Consultar en bloque
  const existingCargosPeriodo = await Cargo.findAll({
    where: {
      id_asociacion,
      id_concepto: [conceptoSerenaje.id_concepto, conceptoMoraSerenaje.id_concepto],
      periodo,
      deleted_at: null,
    },
    attributes: ['id_socio', 'id_concepto'],
  });

  const existingSerenajeSet = new Set(
    existingCargosPeriodo
      .filter(c => c.id_concepto === conceptoSerenaje.id_concepto)
      .map(c => c.id_socio)
  );
  const existingMoraSet = new Set(
    existingCargosPeriodo
      .filter(c => c.id_concepto === conceptoMoraSerenaje.id_concepto)
      .map(c => c.id_socio)
  );

  const pendingSerenajes = await Cargo.findAll({
    where: {
      id_asociacion,
      id_concepto: conceptoSerenaje.id_concepto,
      estado: { [Op.in]: ['Pendiente', 'Pagado_Parcial'] },
      deleted_at: null,
    },
    attributes: ['id_socio'],
  });

  const countImpagosMap = new Map();
  for (const p of pendingSerenajes) {
    countImpagosMap.set(p.id_socio, (countImpagosMap.get(p.id_socio) || 0) + 1);
  }

  const cargosToInsert = [];
  const multasToInsert = [];

  for (const s of sociosActivos) {
    if (!existingSerenajeSet.has(s.id_socio)) {
      const impagosPrevios = countImpagosMap.get(s.id_socio) || 0;

      cargosToInsert.push({
        id_socio: s.id_socio,
        id_asociacion,
        id_concepto: conceptoSerenaje.id_concepto,
        tipo_origen: 'serenaje',
        periodo,
        detalle: `Aporte Serenaje y Seguridad (${periodo})`,
        monto_capital_inicial: montoSerenaje,
        saldo_capital_pendiente: montoSerenaje,
        monto_mora_acumulada: 0,
        fecha_vencimiento: fechaVencimiento,
        estado: 'Pendiente',
        created_at: new Date(),
        updated_at: new Date(),
      });

      if (impagosPrevios >= 2 && !existingMoraSet.has(s.id_socio)) {
        multasToInsert.push({
          id_socio: s.id_socio,
          id_asociacion,
          id_concepto: conceptoMoraSerenaje.id_concepto,
          tipo_origen: 'mora_serenaje',
          periodo,
          detalle: `Multa por Mora en Serenaje (${impagosPrevios + 1} meses impagos)`,
          monto_capital_inicial: 20.00,
          saldo_capital_pendiente: 20.00,
          monto_mora_acumulada: 0,
          fecha_vencimiento: fechaVencimiento,
          estado: 'Pendiente',
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
  }

  if (cargosToInsert.length > 0) {
    await Cargo.bulkCreate(cargosToInsert);
  }
  if (multasToInsert.length > 0) {
    await Cargo.bulkCreate(multasToInsert);
  }

  return { cargosCreados: cargosToInsert.length, multasCreadas: multasToInsert.length, totalSocios: sociosActivos.length };
};

/**
 * getResumenDeudasSocios: devuelve el listado de todos los socios activos con el desglose
 * clasificado de deudas por servicio: Luz, Serenaje, Multas de Eventos, Cuotas y Total.
 */
const getResumenDeudasSocios = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;

    const [socios, cargosPendientes, consumosLuz] = await Promise.all([
      Socio.findAll({
        where: { id_asociacion, deleted_at: null },
        include: [{ model: Persona, as: 'persona' }],
        order: [['nro_caseta', 'ASC']],
      }),
      Cargo.findAll({
        where: {
          id_asociacion,
          estado: { [Op.in]: ['Pendiente', 'Pagado_Parcial'] },
          deleted_at: null,
        },
        include: [{ model: ConceptoCobro, as: 'concepto' }],
        order: [['fecha_vencimiento', 'ASC']],
      }),
      ConsumoLuz.findAll({
        include: [{
          model: Socio,
          as: 'socio',
          where: { id_asociacion, deleted_at: null },
          attributes: ['id_socio'],
        }],
        where: { deleted_at: null },
        order: [['mes_anio', 'DESC']],
      }),
    ]);

    // Mapear todas las casetas que pertenecen al mismo dueño
    const casetasPorPersona = {};
    for (const s of socios) {
      if (!casetasPorPersona[s.id_persona]) casetasPorPersona[s.id_persona] = [];
      if (s.nro_caseta) casetasPorPersona[s.id_persona].push(s.nro_caseta);
    }

    // Indexar cargos pendientes por socio en O(1)
    const cargosPorSocio = new Map();
    for (const c of cargosPendientes) {
      if (!cargosPorSocio.has(c.id_socio)) {
        cargosPorSocio.set(c.id_socio, []);
      }
      cargosPorSocio.get(c.id_socio).push(c);
    }

    // Indexar última lectura de luz por socio en O(1)
    const ultimaLecturaPorSocio = new Map();
    for (const cl of consumosLuz) {
      if (!ultimaLecturaPorSocio.has(cl.id_socio)) {
        ultimaLecturaPorSocio.set(cl.id_socio, cl.lectura_actual);
      }
    }

    const resumen = socios.map((s) => {
      const p = s.persona || {};
      const misCargos = cargosPorSocio.get(s.id_socio) || [];

      // Clasificación
      const cargosLuz = misCargos.filter(
        (c) => c.tipo_origen === 'luz' || (c.concepto?.nombre_concepto || '').toLowerCase().includes('luz')
      );
      const cargosSerenaje = misCargos.filter(
        (c) => c.tipo_origen === 'serenaje' || (c.concepto?.nombre_concepto || '').toLowerCase().includes('serenaje')
      );
      const cargosMultas = misCargos.filter(
        (c) =>
          (c.tipo_origen === 'evento' ||
            (c.concepto?.nombre_concepto || '').toLowerCase().includes('multa') ||
            (c.concepto?.nombre_concepto || '').toLowerCase().includes('falta')) &&
          c.tipo_origen !== 'mora_aporte' &&
          c.tipo_origen !== 'mora_serenaje'
      );
      const cargosAportes = misCargos.filter(
        (c) =>
          c.tipo_origen === 'aporte' ||
          c.tipo_origen === 'mora_aporte' ||
          (c.concepto?.nombre_concepto || '').toLowerCase().includes('aporte pro-mejora') ||
          (c.concepto?.nombre_concepto || '').toLowerCase().includes('pro-mejora')
      );
      const cargosOtros = misCargos.filter(
        (c) =>
          !cargosLuz.includes(c) &&
          !cargosSerenaje.includes(c) &&
          !cargosMultas.includes(c) &&
          !cargosAportes.includes(c)
      );

      const calcTotal = (arr) =>
        arr.reduce((acc, c) => acc + parseFloat(c.saldo_capital_pendiente || 0) + parseFloat(c.monto_mora_acumulada || 0), 0);

      const totalLuz = calcTotal(cargosLuz);
      const totalSerenaje = calcTotal(cargosSerenaje);
      const totalMultas = calcTotal(cargosMultas);
      const totalAportes = calcTotal(cargosAportes);
      const totalOtros = calcTotal(cargosOtros);
      const totalGeneral = totalLuz + totalSerenaje + totalMultas + totalAportes + totalOtros;

      const ultimaLectura = ultimaLecturaPorSocio.get(s.id_socio) ?? null;

      return {
        id_socio: s.id_socio,
        nro_caseta: s.nro_caseta,
        estado_socio: s.estado_socio,
        persona: {
          nombres: p.nombres,
          apellidos: p.apellidos,
          ci: p.ci,
          telefono: p.telefono,
          domicilio: p.domicilio,
        },
        luz: {
          meses_debe: cargosLuz.length,
          total: parseFloat(totalLuz.toFixed(2)),
          cargos: cargosLuz,
          ultima_lectura: ultimaLectura,
        },
        serenaje: {
          meses_debe: cargosSerenaje.length,
          total: parseFloat(totalSerenaje.toFixed(2)),
          cargos: cargosSerenaje,
        },
        multas: {
          cantidad: cargosMultas.length,
          total: parseFloat(totalMultas.toFixed(2)),
          cargos: cargosMultas,
        },
        aportes: {
          cantidad: cargosAportes.length,
          total: parseFloat(totalAportes.toFixed(2)),
          cargos: cargosAportes,
        },
        otros: {
          cantidad: cargosOtros.length,
          total: parseFloat(totalOtros.toFixed(2)),
          cargos: cargosOtros,
        },
        total_deuda_general: parseFloat(totalGeneral.toFixed(2)),
        total_casetas_dueno: casetasPorPersona[s.id_persona]?.length || 1,
        todas_casetas_dueno: casetasPorPersona[s.id_persona] || (s.nro_caseta ? [s.nro_caseta] : []),
        cargos_todos: misCargos,
      };
    });

    return res.status(200).json({ resumen, total_socios: resumen.length });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCargos,
  getCargosySocio,
  calcularMoras,
  anularCargo,
  generarSerenajeMes,
  getResumenDeudasSocios,
  procesarSerenajeAsociacion,
};
