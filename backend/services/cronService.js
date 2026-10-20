const { Asociacion, Cargo, ConceptoCobro, AporteExtraordinario } = require('../models');
const { procesarSerenajeAsociacion } = require('../controllers/cargoController');
const { Op } = require('sequelize');

/**
 * verificarYGenerarSerenajeAutomatico:
 * Revisa si hoy es día 5 o posterior del mes corriente. Si el serenaje de este mes
 * aún no ha sido emitido para las asociaciones activas, lo genera automáticamente
 * aplicando la regla de sanción / multa por mora si es el 3er mes impago consecutivo.
 */
const verificarYGenerarSerenajeAutomatico = async () => {
  try {
    const hoy = new Date();
    const diaDelMes = hoy.getDate();

    // Solo se ejecuta a partir del día 5 de cada mes
    if (diaDelMes < 5) {
      return;
    }

    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const periodoActual = `${anio}-${mes}`;

    const asociaciones = await Asociacion.findAll({
      where: { estado: true, deleted_at: null },
    });

    for (const asoc of asociaciones) {
      const conceptoSer = await ConceptoCobro.findOne({
        where: { id_asociacion: asoc.id_asociacion, nombre_concepto: 'Serenaje', deleted_at: null },
      });

      let yaGenerado = false;
      if (conceptoSer) {
        const existeCargo = await Cargo.findOne({
          where: {
            id_asociacion: asoc.id_asociacion,
            id_concepto: conceptoSer.id_concepto,
            periodo: periodoActual,
            deleted_at: null,
          },
        });
        if (existeCargo) yaGenerado = true;
      }

      if (!yaGenerado) {
        console.log(`🛡️ [AUTOMÁTICO] Generando Serenaje de ${periodoActual} para: ${asoc.nombre_mercado}...`);
        const resultado = await procesarSerenajeAsociacion(asoc.id_asociacion, periodoActual);
        console.log(
          `🛡️ [AUTOMÁTICO] Completado: ${resultado.cargosCreados} socios con Serenaje generado, ${resultado.multasCreadas} multas por 3er mes impago.`
        );
      }
    }
  } catch (error) {
    console.error('Error en tarea automática de Serenaje:', error.message);
  }
};

/**
 * verificarMorasAportesAutomatico:
 * Revisa si existen Aportes Pro-Mejoras que hayan superado los 2 meses (60 días)
 * desde su fecha de emisión y aplica automáticamente la multa por mora a socios morosos.
 */
const verificarMorasAportesAutomatico = async () => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const aportesActivos = await AporteExtraordinario.findAll({
      where: { estado: 'Activo', deleted_at: null },
    });

    for (const aporte of aportesActivos) {
      const fechaEmis = new Date(aporte.fecha_emision);
      const diasTranscurridos = Math.floor((hoy.getTime() - fechaEmis.getTime()) / (1000 * 60 * 60 * 24));

      if (diasTranscurridos >= 60) {
        // Buscar cargos pendientes de este aporte
        const cargosPendientes = await Cargo.findAll({
          where: {
            id_asociacion: aporte.id_asociacion,
            id_referencia_origen: aporte.id_aporte,
            tipo_origen: 'aporte',
            estado: { [Op.in]: ['Pendiente', 'Pagado_Parcial'] },
            deleted_at: null,
          },
        });

        if (cargosPendientes.length > 0) {
          const [conceptoMoraAporte] = await ConceptoCobro.findOrCreate({
            where: {
              id_asociacion: aporte.id_asociacion,
              nombre_concepto: 'Multa Mora Aporte Pro-Mejora',
              deleted_at: null,
            },
            defaults: {
              id_asociacion: aporte.id_asociacion,
              nombre_concepto: 'Multa Mora Aporte Pro-Mejora',
              monto_fijo: parseFloat(aporte.monto_multa_mora || 20.00),
              aplica_mora: false,
              tasa_mora_mensual: 0,
              dias_gracia: 0,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });

          const montoMulta = parseFloat(aporte.monto_multa_mora || 20.00);
          const fechaVencMora = new Date();
          fechaVencMora.setDate(fechaVencMora.getDate() + 15);
          const periodoActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

          let morasGeneradas = 0;
          for (const c of cargosPendientes) {
            const yaTieneMulta = await Cargo.findOne({
              where: {
                id_asociacion: aporte.id_asociacion,
                id_socio: c.id_socio,
                id_referencia_origen: aporte.id_aporte,
                tipo_origen: 'mora_aporte',
                deleted_at: null,
              },
            });

            if (!yaTieneMulta) {
              await Cargo.create({
                id_socio: c.id_socio,
                id_asociacion: aporte.id_asociacion,
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
              morasGeneradas++;
            }
          }

          if (morasGeneradas > 0) {
            console.log(
              `🏗️ [AUTOMÁTICO] Aportes Pro-Mejoras: Se aplicaron ${morasGeneradas} multas por mora (+2 meses) en "${aporte.nombre_proyecto}".`
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Error en verificación de mora de aportes:', error.message);
  }
};

let cronTimer = null;
let isRunningSerenaje = false;
let isRunningMoras = false;

const ejecutarTareasCron = async () => {
  if (!isRunningSerenaje) {
    isRunningSerenaje = true;
    try {
      await verificarYGenerarSerenajeAutomatico();
    } finally {
      isRunningSerenaje = false;
    }
  }

  if (!isRunningMoras) {
    isRunningMoras = true;
    try {
      await verificarMorasAportesAutomatico();
    } finally {
      isRunningMoras = false;
    }
  }
};

/**
 * iniciarCronJobs:
 * Arranca la verificación inmediata y programa la ejecución periódica
 */
const iniciarCronJobs = () => {
  if (cronTimer) {
    clearInterval(cronTimer);
  }

  // Ejecución inicial al arrancar el servidor (no bloqueante)
  ejecutarTareasCron().catch((err) => {
    console.error('Error en ejecución inicial de cron:', err.message);
  });

  // Revisión periódica cada 1 hora
  const UN_HORA_MS = 1000 * 60 * 60;
  cronTimer = setInterval(() => {
    ejecutarTareasCron().catch((err) => {
      console.error('Error en ejecución periódica de cron:', err.message);
    });
  }, UN_HORA_MS);

  // Permitir que el proceso de Node.js termine limpiamente en tests o shutdown
  if (cronTimer && typeof cronTimer.unref === 'function') {
    cronTimer.unref();
  }
};

const detenerCronJobs = () => {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
};

module.exports = {
  iniciarCronJobs,
  detenerCronJobs,
  verificarYGenerarSerenajeAutomatico,
  verificarMorasAportesAutomatico,
};
