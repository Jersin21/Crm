/**
 * Middleware genérico para ejecutar validación de esquemas Zod en Express
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const dataToValidate = {
        body: req.body,
        query: req.query,
        params: req.params,
      };

      const result = schema.safeParse(dataToValidate);

      if (!result.success) {
        const issues = result.error?.issues || result.error?.errors || [];
        const errores = issues.map((err) => ({
          campo: err.path.join('.').replace(/^(body|query|params)\.?/, ''),
          mensaje: err.message,
        }));

        return res.status(400).json({
          status: 'error',
          mensaje: `Error de validación: ${errores.map((e) => e.mensaje).join(', ')}`,
          errores,
        });
      }

      // Reemplazar con los datos parseados y saneados por Zod
      if (result.data.body) req.body = result.data.body;
      if (result.data.query) req.query = result.data.query;
      if (result.data.params) req.params = result.data.params;

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = validate;
