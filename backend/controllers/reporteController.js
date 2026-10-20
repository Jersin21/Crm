const { Op } = require('sequelize');
const { sequelize } = require('../models');
const { Ingreso, Egreso, Cargo, Socio, Persona, IngresoDetalle, ConceptoCobro, TipoEgreso, Usuario, Asociacion } = require('../models');

/**
 * Helper para construir filtro de fechas que cubra el día completo (00:00:00 hasta 23:59:59)
 * con validación de fechas válidas para evitar errores de parseo en base de datos.
 */
function construirFiltroFechas(fecha_inicio, fecha_fin) {
  const esFechaValida = (f) => f && !isNaN(new Date(f).getTime());

  const inicioValido = esFechaValida(fecha_inicio);
  const finValido = esFechaValida(fecha_fin);

  if (inicioValido && finValido) {
    const dInicio = new Date(`${fecha_inicio}T00:00:00.000`);
    const dFin = new Date(`${fecha_fin}T23:59:59.999`);
    return { [Op.between]: [dInicio, dFin] };
  } else if (inicioValido) {
    return { [Op.gte]: new Date(`${fecha_inicio}T00:00:00.000`) };
  } else if (finValido) {
    return { [Op.lte]: new Date(`${fecha_fin}T23:59:59.999`) };
  }
  return null;
}

/**
 * getReporteIngresos: resumen de ingresos en un rango de fechas
 */
const getReporteIngresos = async (req, res, next) => {
  try {
    const id_asociacion =
      req.user.rol === 'SUPERADMIN_SAAS' && (req.query.id_asociacion || req.body.id_asociacion)
        ? req.query.id_asociacion || req.body.id_asociacion
        : req.user.id_asociacion;

    if (!id_asociacion) {
      return res.status(400).json({ mensaje: 'Debe especificar la asociación.' });
    }

    const { fecha_inicio, fecha_fin } = req.query;

    const filtro = { id_asociacion, estado: 'Valido', deleted_at: null };
    const dateRange = construirFiltroFechas(fecha_inicio, fecha_fin);
    if (dateRange) {
      filtro.fecha_pago = dateRange;
    }

    const ingresos = await Ingreso.findAll({
      where: filtro,
      include: [
        { model: Socio, as: 'socio', include: [{ model: Persona, as: 'persona' }] },
        { model: IngresoDetalle, as: 'detalles' },
      ],
      order: [['fecha_pago', 'DESC']],
    });

    const total = ingresos.reduce((acc, i) => acc + parseFloat(i.monto_total_recibido || 0), 0);

    return res.status(200).json({
      ingresos,
      total: total.toFixed(2),
      cantidad: ingresos.length,
      periodo: { fecha_inicio, fecha_fin },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getReporteEgresos: resumen de egresos en un rango de fechas
 */
const getReporteEgresos = async (req, res, next) => {
  try {
    const id_asociacion =
      req.user.rol === 'SUPERADMIN_SAAS' && (req.query.id_asociacion || req.body.id_asociacion)
        ? req.query.id_asociacion || req.body.id_asociacion
        : req.user.id_asociacion;

    if (!id_asociacion) {
      return res.status(400).json({ mensaje: 'Debe especificar la asociación.' });
    }

    const { fecha_inicio, fecha_fin } = req.query;

    const filtro = { id_asociacion, deleted_at: null };
    const dateRange = construirFiltroFechas(fecha_inicio, fecha_fin);
    if (dateRange) {
      filtro.fecha_gasto = dateRange;
    }

    const egresos = await Egreso.findAll({
      where: filtro,
      include: [{ model: TipoEgreso, as: 'tipo_egreso' }],
      order: [['fecha_gasto', 'DESC']],
    });

    const total = egresos.reduce((acc, e) => acc + parseFloat(e.monto || 0), 0);

    return res.status(200).json({
      egresos,
      total: total.toFixed(2),
      cantidad: egresos.length,
      periodo: { fecha_inicio, fecha_fin },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getReporteBalanceGeneral: balance total (ingresos - egresos) para un período
 * con cálculo de Saldo Inicial (Caja Anterior) y agrupación sin duplicados para Asambleas
 */
const getReporteBalanceGeneral = async (req, res, next) => {
  try {
    const id_asociacion =
      req.user.rol === 'SUPERADMIN_SAAS' && (req.query.id_asociacion || req.body.id_asociacion)
        ? req.query.id_asociacion || req.body.id_asociacion
        : req.user.id_asociacion;

    if (!id_asociacion) {
      return res.status(400).json({ mensaje: 'Debe especificar la asociación.' });
    }

    const { fecha_inicio, fecha_fin } = req.query;

    const filtroIngreso = { id_asociacion, estado: 'Valido', deleted_at: null };
    const filtroEgreso = { id_asociacion, deleted_at: null };

    const dateRange = construirFiltroFechas(fecha_inicio, fecha_fin);
    if (dateRange) {
      filtroIngreso.fecha_pago = dateRange;
      filtroEgreso.fecha_gasto = dateRange;
    }

    // ─── CÁLCULO DE SALDO INICIAL (Flujo neto acumulado antes de fecha_inicio) ─
    let saldoInicial = 0;
    if (fecha_inicio && !isNaN(new Date(fecha_inicio).getTime())) {
      const dInicio = new Date(`${fecha_inicio}T00:00:00.000`);
      const [sumPrevIngresos, sumPrevEgresos] = await Promise.all([
        Ingreso.findAll({
          where: {
            id_asociacion,
            estado: 'Valido',
            deleted_at: null,
            fecha_pago: { [Op.lt]: dInicio },
          },
          attributes: [[sequelize.fn('SUM', sequelize.col('monto_total_recibido')), 'total']],
          raw: true,
        }),
        Egreso.findAll({
          where: {
            id_asociacion,
            deleted_at: null,
            fecha_gasto: { [Op.lt]: dInicio },
          },
          attributes: [[sequelize.fn('SUM', sequelize.col('monto')), 'total']],
          raw: true,
        }),
      ]);
      const prevIng = parseFloat(sumPrevIngresos[0]?.total || 0);
      const prevEgr = parseFloat(sumPrevEgresos[0]?.total || 0);
      saldoInicial = prevIng - prevEgr;
    }

    const [asociacion, listaIngresos, listaEgresos] = await Promise.all([
      Asociacion.findByPk(id_asociacion),
      Ingreso.findAll({
        where: filtroIngreso,
        include: [
          { model: Socio, as: 'socio', include: [{ model: Persona, as: 'persona' }] },
          { model: Usuario, as: 'cajero', attributes: ['username'] },
          {
            model: IngresoDetalle,
            as: 'detalles',
            include: [{ model: Cargo, as: 'cargo', include: [{ model: ConceptoCobro, as: 'concepto' }] }],
          },
        ],
        order: [['fecha_pago', 'DESC']],
      }),
      Egreso.findAll({
        where: filtroEgreso,
        include: [
          { model: TipoEgreso, as: 'tipo_egreso' },
          { model: Usuario, as: 'usuario', attributes: ['username'] },
        ],
        order: [['fecha_gasto', 'DESC']],
      }),
    ]);

    const totalIngresos = listaIngresos.reduce((acc, i) => acc + parseFloat(i.monto_total_recibido || 0), 0);
    const totalEgresos = listaEgresos.reduce((acc, e) => acc + parseFloat(e.monto || 0), 0);
    const flujoPeriodo = totalIngresos - totalEgresos;
    const saldoFinal = saldoInicial + flujoPeriodo;

    // ─── AGREGACIÓN PÚBLICA PARA ASAMBLEAS (SIN DUPLICADOS DE CONCEPTOS) ───────
    const agrupacionIngresos = {};
    for (const ing of listaIngresos) {
      if (ing.detalles && ing.detalles.length > 0) {
        for (const det of ing.detalles) {
          const cargo = det.cargo;
          // Nombre unificado de concepto (sin mezclar descripciones individuales de caseta)
          const conceptoNombre = cargo?.concepto?.nombre_concepto || cargo?.tipo_origen || 'Otros Ingresos de Caja';
          const key = conceptoNombre;

          if (!agrupacionIngresos[key]) {
            agrupacionIngresos[key] = {
              concepto: conceptoNombre,
              sociosSet: new Set(),
              cantidad_pagos: 0,
              total_capital: 0,
              total_mora: 0,
              total_recaudado: 0,
            };
          }

          if (ing.id_socio) agrupacionIngresos[key].sociosSet.add(ing.id_socio);
          agrupacionIngresos[key].cantidad_pagos += 1;
          const cap = parseFloat(det.monto_abonado_capital || 0);
          const mor = parseFloat(det.monto_abonado_mora || 0);
          agrupacionIngresos[key].total_capital += cap;
          agrupacionIngresos[key].total_mora += mor;
          agrupacionIngresos[key].total_recaudado += cap + mor;
        }
      } else {
        const conceptoNombre = ing.concepto || ing.tipo_origen || 'Otros Cobros Directos';
        const key = conceptoNombre;
        if (!agrupacionIngresos[key]) {
          agrupacionIngresos[key] = {
            concepto: conceptoNombre,
            sociosSet: new Set(),
            cantidad_pagos: 0,
            total_capital: 0,
            total_mora: 0,
            total_recaudado: 0,
          };
        }
        if (ing.id_socio) agrupacionIngresos[key].sociosSet.add(ing.id_socio);
        agrupacionIngresos[key].cantidad_pagos += 1;
        const tot = parseFloat(ing.monto_total_recibido || 0);
        agrupacionIngresos[key].total_capital += tot;
        agrupacionIngresos[key].total_recaudado += tot;
      }
    }

    const resumenIngresosPublico = Object.values(agrupacionIngresos)
      .map((item) => ({
        concepto: item.concepto,
        cantidad_socios: item.sociosSet.size,
        cantidad_pagos: item.cantidad_pagos,
        total_capital: parseFloat(item.total_capital.toFixed(2)),
        total_mora: parseFloat(item.total_mora.toFixed(2)),
        total_recaudado: parseFloat(item.total_recaudado.toFixed(2)),
        glosa_publica:
          item.sociosSet.size > 0
            ? `${item.sociosSet.size} socio(s) aportaron/pagaron ${item.concepto}`
            : `${item.cantidad_pagos} pago(s) registrado(s) por ${item.concepto}`,
      }))
      .sort((a, b) => b.total_recaudado - a.total_recaudado);

    // Agrupación pública de egresos por categoría
    const agrupacionEgresos = {};
    for (const eg of listaEgresos) {
      const cat = eg.tipo_egreso?.nombre_categoria || 'Gastos Generales';
      if (!agrupacionEgresos[cat]) {
        agrupacionEgresos[cat] = {
          categoria: cat,
          cantidad_desembolsos: 0,
          total_egresado: 0,
          detalles: [],
        };
      }
      agrupacionEgresos[cat].cantidad_desembolsos += 1;
      const monto = parseFloat(eg.monto || 0);
      agrupacionEgresos[cat].total_egresado += monto;
      if (eg.detalle && !agrupacionEgresos[cat].detalles.includes(eg.detalle)) {
        agrupacionEgresos[cat].detalles.push(eg.detalle);
      }
    }

    const resumenEgresosPublico = Object.values(agrupacionEgresos)
      .map((item) => ({
        categoria: item.categoria,
        cantidad_desembolsos: item.cantidad_desembolsos,
        total_egresado: parseFloat(item.total_egresado.toFixed(2)),
        detalles: item.detalles.slice(0, 3).join(', '),
      }))
      .sort((a, b) => b.total_egresado - a.total_egresado);

    return res.status(200).json({
      ingresos: listaIngresos,
      egresos: listaEgresos,
      resumen_ingresos_publico: resumenIngresosPublico,
      resumen_egresos_publico: resumenEgresosPublico,
      saldo_inicial: parseFloat(saldoInicial.toFixed(2)),
      total_ingresos: totalIngresos.toFixed(2),
      total_egresos: totalEgresos.toFixed(2),
      flujo_periodo: parseFloat(flujoPeriodo.toFixed(2)),
      balance: flujoPeriodo.toFixed(2),
      saldoNeto: parseFloat(flujoPeriodo.toFixed(2)),
      saldo_final: parseFloat(saldoFinal.toFixed(2)),
      asociacionNombre: asociacion?.nombre_mercado || 'Asociación Central de Comerciantes',
      periodo: { fecha_inicio, fecha_fin },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getDashboardStats: métricas consolidadas en tiempo real para la vista de Inicio / Dashboard
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const id_asociacion =
      req.user.rol === 'SUPERADMIN_SAAS' && (req.query.id_asociacion || req.body.id_asociacion)
        ? req.query.id_asociacion || req.body.id_asociacion
        : req.user.id_asociacion;

    if (!id_asociacion) {
      return res.status(400).json({ mensaje: 'Debe especificar la asociación.' });
    }

    const ahora = new Date();
    const dInicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
    const dFinMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      totalSocios,
      cargosPendientes,
      ingresosMesResult,
      ingresosTotalesResult,
      egresosMesResult,
      egresosTotalesResult,
    ] = await Promise.all([
      Socio.count({
        where: { id_asociacion, estado_socio: 'Activo', deleted_at: null },
      }),
      Cargo.count({
        where: { id_asociacion, estado: { [Op.in]: ['Pendiente', 'Pagado_Parcial'] }, deleted_at: null },
      }),
      Ingreso.findAll({
        where: {
          id_asociacion,
          estado: 'Valido',
          deleted_at: null,
          fecha_pago: { [Op.between]: [dInicioMes, dFinMes] },
        },
        attributes: [[sequelize.fn('SUM', sequelize.col('monto_total_recibido')), 'total']],
        raw: true,
      }),
      Ingreso.findAll({
        where: { id_asociacion, estado: 'Valido', deleted_at: null },
        attributes: [[sequelize.fn('SUM', sequelize.col('monto_total_recibido')), 'total']],
        raw: true,
      }),
      Egreso.findAll({
        where: {
          id_asociacion,
          deleted_at: null,
          fecha_gasto: { [Op.between]: [dInicioMes, dFinMes] },
        },
        attributes: [[sequelize.fn('SUM', sequelize.col('monto')), 'total']],
        raw: true,
      }),
      Egreso.findAll({
        where: { id_asociacion, deleted_at: null },
        attributes: [[sequelize.fn('SUM', sequelize.col('monto')), 'total']],
        raw: true,
      }),
    ]);

    const totalIngresosMes = parseFloat(ingresosMesResult[0]?.total || 0);
    const totalIngresos = parseFloat(ingresosTotalesResult[0]?.total || 0);
    const totalEgresosMes = parseFloat(egresosMesResult[0]?.total || 0);
    const totalEgresos = parseFloat(egresosTotalesResult[0]?.total || 0);
    const saldoNeto = totalIngresos - totalEgresos;

    return res.status(200).json({
      status: true,
      totalSocios,
      cargosPendientes,
      totalIngresosMes,
      totalIngresos,
      totalEgresosMes,
      totalEgresos,
      saldoNeto,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getEstadoCuentaSocio: estado de cuenta completo y Kardex financiero histórico de una caseta / socio
 */
const getEstadoCuentaSocio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion =
      req.user.rol === 'SUPERADMIN_SAAS' && (req.query.id_asociacion || req.body.id_asociacion)
        ? req.query.id_asociacion || req.body.id_asociacion
        : req.user.id_asociacion;

    if (!id_asociacion) {
      return res.status(400).json({ mensaje: 'Debe especificar la asociación.' });
    }

    const socio = await Socio.findOne({
      where: { id_socio: id, id_asociacion, deleted_at: null },
      include: [
        { model: Persona, as: 'persona' },
        { model: Asociacion, as: 'asociacion' },
      ],
    });
    if (!socio) return res.status(404).json({ mensaje: 'Socio no encontrado.' });

    // Obtener todos los cargos del socio en esta asociación ordenados cronológicamente
    const cargos = await Cargo.findAll({
      where: { id_socio: id, id_asociacion, deleted_at: null },
      include: [{ model: ConceptoCobro, as: 'concepto' }],
      order: [
        ['created_at', 'ASC'],
        ['fecha_vencimiento', 'ASC'],
      ],
    });

    // Obtener historial de pagos válidos
    const ingresos = await Ingreso.findAll({
      where: { id_socio: id, id_asociacion, estado: 'Valido', deleted_at: null },
      include: [
        { model: IngresoDetalle, as: 'detalles' },
        { model: Usuario, as: 'cajero', attributes: ['username'] },
      ],
      order: [['fecha_pago', 'ASC']],
    });

    // Construcción de movimientos para el Kardex
    const movimientos = [];

    // Cargos (Debe / Deuda)
    for (const c of cargos) {
      const fecha = c.created_at || c.createdAt;
      const montoTotal = parseFloat(c.monto_capital_inicial || 0) + parseFloat(c.monto_mora_acumulada || 0);
      movimientos.push({
        id: `cargo-${c.id_cargo}`,
        tipo: 'CARGO',
        fecha: fecha ? new Date(fecha).toISOString().split('T')[0] : 'Sin fecha',
        fecha_obj: fecha ? new Date(fecha) : new Date(0),
        descripcion: c.concepto?.nombre_concepto
          ? `${c.concepto.nombre_concepto} - ${c.detalle || ''}`.trim()
          : c.detalle || 'Cargo emitido',
        periodo: c.periodo || '-',
        debe: montoTotal,
        haber: 0,
        estado: c.estado,
        saldo_pendiente: parseFloat(c.saldo_capital_pendiente || 0) + parseFloat(c.monto_mora_acumulada || 0),
        referencia: `Cargo #${c.id_cargo}`,
      });
    }

    // Pagos (Haber / Cancelación)
    for (const ing of ingresos) {
      const fecha = ing.fecha_pago || ing.createdAt;
      const montoTotal = parseFloat(ing.monto_total_recibido || 0);
      movimientos.push({
        id: `pago-${ing.id_ingreso}`,
        tipo: 'PAGO',
        fecha: fecha ? new Date(fecha).toISOString().split('T')[0] : 'Sin fecha',
        fecha_obj: fecha ? new Date(fecha) : new Date(0),
        descripcion: ing.concepto
          ? `Cobro en Caja: ${ing.concepto}`
          : ing.observacion || 'Cobro de recibo oficial en Caja',
        periodo: '-',
        debe: 0,
        haber: montoTotal,
        estado: 'Aplicado',
        saldo_pendiente: 0,
        referencia: `Recibo #${String(ing.nro_recibo || ing.id_ingreso).padStart(5, '0')}`,
        cajero: ing.cajero?.username || 'Caja',
      });
    }

    // Ordenar cronológicamente
    movimientos.sort((a, b) => a.fecha_obj - b.fecha_obj);

    // Calcular saldo acumulado correlativo (Kardex financiero)
    let saldoAcumulado = 0;
    movimientos.forEach((m) => {
      saldoAcumulado += m.debe - m.haber;
      m.saldo_acumulado = parseFloat(saldoAcumulado.toFixed(2));
    });

    const pendientes = cargos.filter((c) => ['Pendiente', 'Pagado_Parcial'].includes(c.estado));
    const totalDeuda = pendientes.reduce(
      (acc, c) =>
        acc + parseFloat(c.saldo_capital_pendiente || 0) + parseFloat(c.monto_mora_acumulada || 0),
      0
    );
    const totalCargado = cargos.reduce(
      (acc, c) =>
        acc + parseFloat(c.monto_capital_inicial || 0) + parseFloat(c.monto_mora_acumulada || 0),
      0
    );
    const totalPagado = ingresos.reduce((acc, i) => acc + parseFloat(i.monto_total_recibido || 0), 0);

    return res.status(200).json({
      socio,
      cargos,
      ingresos,
      movimientos,
      resumen: {
        total_cargos: cargos.length,
        cargos_pendientes: pendientes.length,
        total_cargado: parseFloat(totalCargado.toFixed(2)),
        total_pagado: parseFloat(totalPagado.toFixed(2)),
        total_deuda_actual: parseFloat(totalDeuda.toFixed(2)),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReporteIngresos,
  getReporteEgresos,
  getReporteBalanceGeneral,
  getDashboardStats,
  getEstadoCuentaSocio,
};

