const { Op } = require('sequelize');
const {
  AporteExtraordinario,
  Cargo,
  Socio,
  Persona,
  ConceptoCobro,
  Asociacion,
} = require('../models');

/**
 * createAporte:
 * Registra un proyecto u obra pro-mejora (cerámica de pisos, compra de extintores, techos)
 * y genera automáticamente el cargo individual a todos los socios activos de la asociación.
 */
const createAporte = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const {
      nombre_proyecto,
      descripcion,
      monto_por_socio,
      fecha_emision,
      fecha_limite,
      monto_multa_mora,
    } = req.body;

    if (!nombre_proyecto || !monto_por_socio || !fecha_emision) {
      return res.status(400).json({
        mensaje: 'Nombre del proyecto, monto por socio y fecha de emisión son requeridos.',
      });
    }

    const montoNum = parseFloat(monto_por_socio);
    if (isNaN(montoNum) || montoNum <= 0) {
      return res.status(400).json({ mensaje: 'El monto por socio debe ser mayor a 0 Bs.' });
    }

    // Si no se especifica fecha límite, por defecto 60 días (2 meses) después de la emisión
    let fechaLimiteEfectiva = fecha_limite;
    if (!fechaLimiteEfectiva) {
      const fechaEmis = new Date(fecha_emision);
      fechaEmis.setDate(fechaEmis.getDate() + 60);
      fechaLimiteEfectiva = fechaEmis.toISOString().split('T')[0];
    }

    const multaNum = monto_multa_mora !== undefined && monto_multa_mora !== null && monto_multa_mora !== ''
      ? parseFloat(monto_multa_mora)
      : 20.00;

    // Crear o vincular Concepto de Cobro para este proyecto pro-mejora
    const nombreConcepto = `Aporte Pro-Mejora: ${nombre_proyecto}`;
    const [concepto] = await ConceptoCobro.findOrCreate({
      where: {
        id_asociacion,
        nombre_concepto: nombreConcepto,
        deleted_at: null,
      },
      defaults: {
        id_asociacion,
        nombre_concepto: nombreConcepto,
        monto_fijo: montoNum,
        aplica_mora: true,
        tasa_mora_mensual: 0.05,
        dias_gracia: 60, // 2 meses de gracia antes de mora
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Crear el registro de Aporte Extraordinario
    const aporte = await AporteExtraordinario.create({
      id_asociacion,
      id_concepto: concepto.id_concepto,
      nombre_proyecto,
      descripcion: descripcion || '',
      monto_por_socio: montoNum,
      fecha_emision,
      fecha_limite: fechaLimiteEfectiva,
      monto_multa_mora: multaNum,
      estado: 'Activo',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Obtener todos los socios activos de la asociación
    const sociosActivos = await Socio.findAll({
      where: { id_asociacion, estado_socio: 'Activo', deleted_at: null },
    });

    const periodoEmision = fecha_emision.substring(0, 7); // Formato YYYY-MM
    
    // Generar cargos masivos con bulkCreate de alto rendimiento
    const cargosParaInsertar = sociosActivos.map((socio) => ({
      id_socio: socio.id_socio,
      id_asociacion,
      id_concepto: concepto.id_concepto,
      id_referencia_origen: aporte.id_aporte,
      tipo_origen: 'aporte',
      periodo: periodoEmision,
      detalle: `Aporte Pro-Mejora: ${nombre_proyecto}`,
      monto_capital_inicial: montoNum,
      saldo_capital_pendiente: montoNum,
      monto_mora_acumulada: 0.00,
      fecha_vencimiento: fechaLimiteEfectiva,
      estado: 'Pendiente',
      created_at: new Date(),
      updated_at: new Date(),
    }));

    if (cargosParaInsertar.length > 0) {
      await Cargo.bulkCreate(cargosParaInsertar);
    }
    const cargosCreados = cargosParaInsertar.length;

    return res.status(201).json({
      mensaje: `Proyecto "${nombre_proyecto}" registrado. Se generaron ${cargosCreados} cuotas individuales de ${montoNum.toFixed(2)} Bs para socios activos.`,
      aporte,
      cargos_generados: cargosCreados,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getAportes:
 * Lista los proyectos de aportes pro-mejoras de la asociación con métricas consolidadas:
 * meta total, total recaudado en caja, porcentaje de cumplimiento y socios al día vs pendientes.
 */
const getAportes = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const aportes = await AporteExtraordinario.findAll({
      where: { id_asociacion, deleted_at: null },
      include: [{ model: ConceptoCobro, as: 'concepto' }],
      order: [['fecha_emision', 'DESC']],
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const aportesConMetricas = await Promise.all(
      aportes.map(async (ap) => {
        const cargos = await Cargo.findAll({
          where: {
            id_asociacion,
            id_referencia_origen: ap.id_aporte,
            tipo_origen: 'aporte',
            deleted_at: null,
          },
        });

        const totalSociosAsignados = cargos.length;
        const metaTotal = cargos.reduce((acc, c) => acc + parseFloat(c.monto_capital_inicial || 0), 0);
        const totalPendiente = cargos.reduce((acc, c) => acc + parseFloat(c.saldo_capital_pendiente || 0), 0);
        const totalRecaudado = metaTotal - totalPendiente;
        const porcentajeRecaudado = metaTotal > 0 ? ((totalRecaudado / metaTotal) * 100) : 0;

        const sociosPagaron = cargos.filter((c) => c.estado === 'Pagado_Total').length;
        const sociosPendientes = cargos.filter((c) => c.estado !== 'Pagado_Total').length;

        // Calcular si han transcurrido más de 2 meses (60 días) desde la fecha de emisión
        const fechaEmis = new Date(ap.fecha_emision);
        const diffTiempo = hoy.getTime() - fechaEmis.getTime();
        const diasTranscurridos = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));
        const vencidoDosMeses = diasTranscurridos >= 60;

        // Contar multas de mora generadas para este proyecto
        const multasMoraCount = await Cargo.count({
          where: {
            id_asociacion,
            id_referencia_origen: ap.id_aporte,
            tipo_origen: 'mora_aporte',
            deleted_at: null,
          },
        });

        return {
          id_aporte: ap.id_aporte,
          id_asociacion: ap.id_asociacion,
          id_concepto: ap.id_concepto,
          nombre_proyecto: ap.nombre_proyecto,
          descripcion: ap.descripcion,
          monto_por_socio: parseFloat(ap.monto_por_socio),
          fecha_emision: ap.fecha_emision,
          fecha_limite: ap.fecha_limite,
          monto_multa_mora: parseFloat(ap.monto_multa_mora || 20.00),
          estado: ap.estado,
          dias_transcurridos: diasTranscurridos,
          vencido_dos_meses: vencidoDosMeses,
          metricas: {
            total_socios: totalSociosAsignados,
            meta_total: parseFloat(metaTotal.toFixed(2)),
            total_recaudado: parseFloat(totalRecaudado.toFixed(2)),
            total_pendiente: parseFloat(totalPendiente.toFixed(2)),
            porcentaje_recaudado: parseFloat(porcentajeRecaudado.toFixed(1)),
            socios_pagaron: sociosPagaron,
            socios_pendientes: sociosPendientes,
            multas_mora_aplicadas: multasMoraCount,
          },
          concepto: ap.concepto,
        };
      })
    );

    return res.status(200).json({ aportes: aportesConMetricas });
  } catch (error) {
    next(error);
  }
};

/**
 * getAporteDetalleSocios:
 * Obtiene el listado completo de socios asignados a un proyecto con el estado
 * detallado de su pago (Pagado Total, Pendiente, Moroso, Saldo adeudado).
 */
const getAporteDetalleSocios = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;

    const aporte = await AporteExtraordinario.findOne({
      where: { id_aporte: id, id_asociacion, deleted_at: null },
      include: [{ model: ConceptoCobro, as: 'concepto' }],
    });

    if (!aporte) {
      return res.status(404).json({ mensaje: 'Proyecto de aporte no encontrado.' });
    }

    const cargosAporte = await Cargo.findAll({
      where: {
        id_asociacion,
        id_referencia_origen: id,
        tipo_origen: 'aporte',
        deleted_at: null,
      },
      include: [
        {
          model: Socio,
          as: 'socio',
          include: [{ model: Persona, as: 'persona' }],
        },
      ],
      order: [[{ model: Socio, as: 'socio' }, 'nro_caseta', 'ASC']],
    });

    const multasAporte = await Cargo.findAll({
      where: {
        id_asociacion,
        id_referencia_origen: id,
        tipo_origen: 'mora_aporte',
        deleted_at: null,
      },
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaEmis = new Date(aporte.fecha_emision);
    const diasTranscurridos = Math.floor((hoy.getTime() - fechaEmis.getTime()) / (1000 * 60 * 60 * 24));
    const vencidoDosMeses = diasTranscurridos >= 60;

    const listadoSocios = cargosAporte.map((c) => {
      const socio = c.socio || {};
      const persona = socio.persona || {};
      const moraCargo = multasAporte.find((m) => m.id_socio === c.id_socio);

      const estaPagado = c.estado === 'Pagado_Total';
      const tieneMora = !!moraCargo;

      return {
        id_cargo: c.id_cargo,
        id_socio: c.id_socio,
        nro_caseta: socio.nro_caseta,
        nombre_completo: `${persona.nombres || ''} ${persona.apellidos || ''}`.trim() || 'Socio',
        ci: persona.ci || 'S/D',
        telefono: persona.telefono || 'S/D',
        monto_cuota: parseFloat(c.monto_capital_inicial),
        saldo_pendiente: parseFloat(c.saldo_capital_pendiente),
        estado_pago: c.estado,
        esta_pagado: estaPagado,
        tiene_mora_aplicada: tieneMora,
        monto_mora: tieneMora ? parseFloat(moraCargo.saldo_capital_pendiente) : 0,
        id_cargo_mora: tieneMora ? moraCargo.id_cargo : null,
      };
    });

    return res.status(200).json({
      aporte: {
        id_aporte: aporte.id_aporte,
        nombre_proyecto: aporte.nombre_proyecto,
        descripcion: aporte.descripcion,
        monto_por_socio: parseFloat(aporte.monto_por_socio),
        fecha_emision: aporte.fecha_emision,
        fecha_limite: aporte.fecha_limite,
        monto_multa_mora: parseFloat(aporte.monto_multa_mora),
        estado: aporte.estado,
        vencido_dos_meses: vencidoDosMeses,
        dias_transcurridos: diasTranscurridos,
      },
      socios: listadoSocios,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * aplicarMoraAporte:
 * Regla de negocio: si han pasado 2 meses (60 días) desde la fecha del aporte
 * y el socio no ha cancelado, se aplica automáticamente una multa por mora.
 */
const aplicarMoraAporte = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;

    const aporte = await AporteExtraordinario.findOne({
      where: { id_aporte: id, id_asociacion, deleted_at: null },
    });

    if (!aporte) {
      return res.status(404).json({ mensaje: 'Proyecto de aporte no encontrado.' });
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaEmis = new Date(aporte.fecha_emision);
    const diasTranscurridos = Math.floor((hoy.getTime() - fechaEmis.getTime()) / (1000 * 60 * 60 * 24));

    // Permitir aplicar mora si han pasado 60 días o si req.body.forzar === true (para cierre de periodo o prueba)
    if (diasTranscurridos < 60 && !req.body.forzar) {
      return res.status(400).json({
        mensaje: `Aún no han transcurrido 2 meses (60 días) desde la fecha de emisión (${aporte.fecha_emision}). Días transcurridos: ${diasTranscurridos}.`,
      });
    }

    // Concepto de Multa por Mora en Aporte Pro-Mejora
    const [conceptoMoraAporte] = await ConceptoCobro.findOrCreate({
      where: {
        id_asociacion,
        nombre_concepto: 'Multa Mora Aporte Pro-Mejora',
        deleted_at: null,
      },
      defaults: {
        id_asociacion,
        nombre_concepto: 'Multa Mora Aporte Pro-Mejora',
        monto_fijo: parseFloat(aporte.monto_multa_mora || 20.00),
        aplica_mora: false,
        tasa_mora_mensual: 0,
        dias_gracia: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Obtener los cargos de este aporte que no han sido pagados totalmente
    const cargosPendientes = await Cargo.findAll({
      where: {
        id_asociacion,
        id_referencia_origen: aporte.id_aporte,
        tipo_origen: 'aporte',
        estado: { [Op.in]: ['Pendiente', 'Pagado_Parcial'] },
        deleted_at: null,
      },
    });

    const montoMulta = parseFloat(aporte.monto_multa_mora || 20.00);
    const fechaVencMora = new Date();
    fechaVencMora.setDate(fechaVencMora.getDate() + 15);
    const periodoActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

    let multasGeneradas = 0;

    for (const c of cargosPendientes) {
      // Verificar si este socio ya tiene cargo de mora para este aporte
      const yaTieneMulta = await Cargo.findOne({
        where: {
          id_asociacion,
          id_socio: c.id_socio,
          id_referencia_origen: aporte.id_aporte,
          tipo_origen: 'mora_aporte',
          deleted_at: null,
        },
      });

      if (!yaTieneMulta) {
        await Cargo.create({
          id_socio: c.id_socio,
          id_asociacion,
          id_concepto: conceptoMoraAporte.id_concepto,
          id_referencia_origen: aporte.id_aporte,
          tipo_origen: 'mora_aporte',
          periodo: periodoActual,
          detalle: `Multa por Mora (+2 meses): ${aporte.nombre_proyecto}`,
          monto_capital_inicial: montoMulta,
          saldo_capital_pendiente: montoMulta,
          monto_mora_acumulada: 0.00,
          fecha_vencimiento: fechaVencMora,
          estado: 'Pendiente',
          created_at: new Date(),
          updated_at: new Date(),
        });
        multasGeneradas++;
      }
    }

    return res.status(200).json({
      mensaje: `Sanción por mora procesada. Se generaron ${multasGeneradas} multa(s) de ${montoMulta.toFixed(2)} Bs para socios con más de 2 meses de atraso en "${aporte.nombre_proyecto}".`,
      multas_generadas: multasGeneradas,
      total_socios_pendientes: cargosPendientes.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * deleteAporte:
 * Soft delete de un proyecto y anulación de cargos no pagados.
 */
const deleteAporte = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;

    const aporte = await AporteExtraordinario.findOne({
      where: { id_aporte: id, id_asociacion, deleted_at: null },
    });

    if (!aporte) {
      return res.status(404).json({ mensaje: 'Proyecto de aporte no encontrado.' });
    }

    // Anular los cargos pendientes asociados para que no queden deudas huérfanas
    await Cargo.update(
      { estado: 'Anulado', deleted_at: new Date() },
      {
        where: {
          id_asociacion,
          id_referencia_origen: aporte.id_aporte,
          tipo_origen: { [Op.in]: ['aporte', 'mora_aporte'] },
          estado: 'Pendiente',
          deleted_at: null,
        },
      }
    );

    await aporte.update({
      estado: 'Anulado',
      deleted_at: new Date(),
      updated_at: new Date(),
    });

    return res.status(200).json({
      mensaje: `Proyecto "${aporte.nombre_proyecto}" anulado correctamente y cargos no cobrados cancelados.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAporte,
  getAportes,
  getAporteDetalleSocios,
  aplicarMoraAporte,
  deleteAporte,
};
