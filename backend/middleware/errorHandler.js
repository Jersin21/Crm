/**
 * Middleware global de manejo centralizado de errores para Express
 * Protege contra fugas de información interna de base de datos / SQL / Sequelize
 */
const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Manejo de errores de validación de Zod
  if (err.name === 'ZodError') {
    const issues = err.issues || err.errors || [];
    const erroresDetalle = issues.map((e) => ({
      campo: e.path.join('.'),
      mensaje: e.message,
    }));

    return res.status(400).json({
      status: 'error',
      mensaje: 'Error de validación en los datos enviados.',
      errores: erroresDetalle,
    });
  }

  // Manejo de errores de Sequelize (UniqueConstraint, ValidationError, DatabaseError)
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const mensajes = (err.errors || []).map((e) => e.message);
    return res.status(400).json({
      status: 'error',
      mensaje: mensajes.join('. ') || 'Error de validación en la base de datos.',
    });
  }

  if (err.name === 'SequelizeDatabaseError') {
    console.error('💥 [DB ERROR]:', err.message);
    return res.status(500).json({
      status: 'error',
      mensaje: isProduction
        ? 'Ocurrió un error interno al procesar la operación en la base de datos.'
        : `Error de BD: ${err.message}`,
    });
  }

  // Errores HTTP con status explícito
  const status = err.status || err.statusCode || 500;
  const mensaje = err.message || 'Error interno del servidor';

  console.error(`💥 [ERROR ${status}] ${req.method} ${req.originalUrl}:`, err.message);

  return res.status(status).json({
    status: 'error',
    mensaje: isProduction && status === 500 ? 'Error interno del servidor' : mensaje,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

module.exports = errorHandler;
