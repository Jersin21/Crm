const { Socio, Persona, Asociacion, Cargo, ConceptoCobro } = require('../models');

/**
 * getSocios: listar socios filtrados por id_asociacion del JWT
 * e identificar dueños con múltiples casetas
 */
const getSocios = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const socios = await Socio.findAll({
      where: { id_asociacion, deleted_at: null },
      attributes: ['id_socio', 'id_persona', 'id_asociacion', 'nro_caseta', 'estado_socio', 'created_at'],
      include: [
        {
          model: Persona,
          as: 'persona',
          attributes: ['id_persona', 'nombres', 'apellidos', 'ci', 'telefono', 'domicilio'],
        },
      ],
      order: [['id_socio', 'ASC']],
    });

    // Mapear todas las casetas que pertenecen a cada persona en esta asociación
    const casetasPorPersona = {};
    for (const s of socios) {
      if (!casetasPorPersona[s.id_persona]) {
        casetasPorPersona[s.id_persona] = [];
      }
      if (s.nro_caseta) {
        casetasPorPersona[s.id_persona].push(s.nro_caseta);
      }
    }

    const sociosFormateados = socios.map((s) => {
      const data = s.toJSON();
      data.todas_casetas = casetasPorPersona[s.id_persona] || (s.nro_caseta ? [s.nro_caseta] : []);
      data.total_casetas_dueno = (casetasPorPersona[s.id_persona] || []).length;
      return data;
    });

    return res.status(200).json({ socios: sociosFormateados });
  } catch (error) {
    next(error);
  }
};

/**
 * getSocio: obtener un socio por id con su Persona incluida
 */
const getSocio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;
    const socio = await Socio.findOne({
      where: { id_socio: id, id_asociacion, deleted_at: null },
      include: [
        { model: Persona, as: 'persona' },
        { model: Asociacion, as: 'asociacion' },
      ],
    });
    if (!socio) return res.status(404).json({ mensaje: 'Socio no encontrado.' });
    return res.status(200).json({ socio });
  } catch (error) {
    next(error);
  }
};

/**
 * createSocio: registrar nueva caseta/socio.
 * Soporta vincular a un dueño existente (por id_persona o por CI) permitiendo que
 * 1 persona sea propietaria de 1 o más casetas sin duplicar su identidad física.
 */
const createSocio = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const { id_persona, nombres, apellidos, domicilio, telefono, ci, nro_caseta } = req.body;

    let persona = null;

    if (id_persona) {
      // 1. Propietario existente seleccionado explícitamente
      persona = await Persona.findByPk(id_persona);
      if (!persona) return res.status(404).json({ mensaje: 'El propietario seleccionado no existe.' });
    } else if (ci && String(ci).trim()) {
      // 2. Si se proporciona CI, verificar si la persona ya existe para reusar y vincular caseta
      persona = await Persona.findOne({
        where: { ci: String(ci).trim(), deleted_at: null },
      });
    }

    if (!persona) {
      if (!nombres || !apellidos) {
        return res.status(400).json({ mensaje: 'Nombres y apellidos son requeridos para un nuevo socio.' });
      }
      persona = await Persona.create({
        nombres: String(nombres).trim(),
        apellidos: String(apellidos).trim(),
        domicilio: domicilio || '',
        telefono: telefono || '',
        ci: ci ? String(ci).trim() : null,
        created_at: new Date(),
        updated_at: new Date(),
      });
    } else {
      // Actualizar datos de contacto si cambiaron
      const updateData = {};
      if (domicilio) updateData.domicilio = domicilio;
      if (telefono) updateData.telefono = telefono;
      if (Object.keys(updateData).length > 0) {
        await persona.update(updateData);
      }
    }

    // Crear el registro de Socio (Caseta) para esta persona en la asociación
    const socio = await Socio.create({
      id_persona: persona.id_persona,
      id_asociacion,
      nro_caseta: nro_caseta ? String(nro_caseta).trim() : null,
      estado_socio: 'Activo',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Contar cuántas casetas tiene ahora esta persona en la asociación
    const totalCasetas = await Socio.count({
      where: { id_persona: persona.id_persona, id_asociacion, deleted_at: null },
    });

    return res.status(201).json({
      mensaje: totalCasetas > 1
        ? `Caseta #${nro_caseta} asignada exitosamente a ${persona.nombres} ${persona.apellidos} (Ahora posee ${totalCasetas} casetas).`
        : 'Socio registrado exitosamente.',
      socio: {
        ...socio.toJSON(),
        persona: persona.toJSON(),
        total_casetas_dueno: totalCasetas,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * updateSocio: actualizar datos de socio y persona
 */
const updateSocio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;

    const socio = await Socio.findOne({
      where: { id_socio: id, id_asociacion, deleted_at: null },
      include: [{ model: Persona, as: 'persona' }],
    });
    if (!socio) return res.status(404).json({ mensaje: 'Socio no encontrado.' });

    const { nombres, apellidos, domicilio, telefono, ci, nro_caseta, estado_socio } = req.body;

    // Actualizar persona
    await socio.persona.update({ nombres, apellidos, domicilio, telefono, ci, updated_at: new Date() });
    // Actualizar socio
    await socio.update({ nro_caseta, estado_socio, updated_at: new Date() });

    return res.status(200).json({ mensaje: 'Socio actualizado correctamente.', socio });
  } catch (error) {
    next(error);
  }
};

/**
 * deleteSocio: soft delete del socio
 */
const deleteSocio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;
    const socio = await Socio.findOne({ where: { id_socio: id, id_asociacion, deleted_at: null } });
    if (!socio) return res.status(404).json({ mensaje: 'Socio no encontrado.' });
    await socio.update({ deleted_at: new Date(), updated_at: new Date() });
    return res.status(200).json({ mensaje: 'Socio eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};

/**
 * getEstadoCuenta: retornar todos los cargos de un socio con saldos y moras
 */
const getEstadoCuenta = async (req, res, next) => {
  try {
    const { id } = req.params;
    const id_asociacion = req.user.id_asociacion;

    // Verificar que el socio pertenezca a la asociación
    const socio = await Socio.findOne({
      where: { id_socio: id, id_asociacion, deleted_at: null },
      include: [{ model: Persona, as: 'persona' }],
    });
    if (!socio) return res.status(404).json({ mensaje: 'Socio no encontrado.' });

    // Obtener todos sus cargos pendientes o parciales
    const cargos = await Cargo.findAll({
      where: { id_socio: id, deleted_at: null },
      include: [{ model: ConceptoCobro, as: 'concepto' }],
      order: [['fecha_vencimiento', 'ASC']],
    });

    // Calcular totales
    const totalCapitalPendiente = cargos
      .filter(c => c.estado !== 'Anulado' && c.estado !== 'Pagado_Total')
      .reduce((acc, c) => acc + parseFloat(c.saldo_capital_pendiente || 0), 0);

    const totalMoraPendiente = cargos
      .filter(c => c.estado !== 'Anulado' && c.estado !== 'Pagado_Total')
      .reduce((acc, c) => acc + parseFloat(c.monto_mora_acumulada || 0), 0);

    return res.status(200).json({
      socio,
      cargos,
      resumen: {
        total_capital_pendiente: totalCapitalPendiente.toFixed(2),
        total_mora_pendiente: totalMoraPendiente.toFixed(2),
        total_deuda: (totalCapitalPendiente + totalMoraPendiente).toFixed(2),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * getDuenosExistentes: listar propietarios únicos de la asociación
 * para permitir asociar una nueva caseta a un dueño que ya existe
 */
const getDuenosExistentes = async (req, res, next) => {
  try {
    const id_asociacion = req.user.id_asociacion;
    const socios = await Socio.findAll({
      where: { id_asociacion, deleted_at: null },
      include: [{ model: Persona, as: 'persona' }],
      order: [[{ model: Persona, as: 'persona' }, 'apellidos', 'ASC']],
    });

    const mapaPersonas = new Map();
    for (const s of socios) {
      if (s.persona && !mapaPersonas.has(s.id_persona)) {
        mapaPersonas.set(s.id_persona, {
          id_persona: s.persona.id_persona,
          nombres: s.persona.nombres,
          apellidos: s.persona.apellidos,
          ci: s.persona.ci,
          telefono: s.persona.telefono,
          domicilio: s.persona.domicilio,
          casetas: s.nro_caseta ? [s.nro_caseta] : [],
        });
      } else if (s.persona && mapaPersonas.has(s.id_persona)) {
        const p = mapaPersonas.get(s.id_persona);
        if (s.nro_caseta && !p.casetas.includes(s.nro_caseta)) {
          p.casetas.push(s.nro_caseta);
        }
      }
    }

    return res.status(200).json({ duenos: Array.from(mapaPersonas.values()) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSocios,
  getSocio,
  createSocio,
  updateSocio,
  deleteSocio,
  getEstadoCuenta,
  getDuenosExistentes,
};
