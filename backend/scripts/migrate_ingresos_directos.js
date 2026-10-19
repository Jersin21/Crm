const { sequelize } = require('../models');
const { DataTypes } = require('sequelize');

async function migrateIngresosDirectos() {
  console.log('--- Iniciando migración de columnas para Ingresos Directos y Traspasos ---');
  await sequelize.authenticate();
  const queryInterface = sequelize.getQueryInterface();

  const tableInfo = await queryInterface.describeTable('ingresos');

  // 1. Permitir NULL en id_socio (para pagos de terceros, nuevos postulantes a afiliados o compradores)
  try {
    await sequelize.query('ALTER TABLE ingresos MODIFY COLUMN id_socio INT(11) NULL;');
    console.log('✅ ingresos.id_socio configurado como NULLABLE');
  } catch (err) {
    console.warn('⚠️ Nota al modificar id_socio:', err.message);
  }

  // 2. Columna pagador (nombre de la persona, comprador o tercero que entrega el dinero)
  if (!tableInfo.pagador) {
    await queryInterface.addColumn('ingresos', 'pagador', {
      type: DataTypes.STRING(150),
      allowNull: true,
    });
    console.log('✅ Columna agregada: ingresos.pagador');
  } else {
    console.log('ℹ️ Columna ya existe: ingresos.pagador');
  }

  // 3. Columna concepto (ej. "Traspaso de Caseta (10%)", "Afiliación de Nuevo Socio")
  if (!tableInfo.concepto) {
    await queryInterface.addColumn('ingresos', 'concepto', {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
    console.log('✅ Columna agregada: ingresos.concepto');
  } else {
    console.log('ℹ️ Columna ya existe: ingresos.concepto');
  }

  // 4. Columna tipo_origen (ej. 'traspaso', 'afiliacion', 'directo', 'cargos')
  if (!tableInfo.tipo_origen) {
    await queryInterface.addColumn('ingresos', 'tipo_origen', {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'cargos',
    });
    console.log('✅ Columna agregada: ingresos.tipo_origen');
  } else {
    console.log('ℹ️ Columna ya existe: ingresos.tipo_origen');
  }

  // 5. Columna id_concepto
  if (!tableInfo.id_concepto) {
    await queryInterface.addColumn('ingresos', 'id_concepto', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'conceptos_cobro', key: 'id_concepto' },
    });
    console.log('✅ Columna agregada: ingresos.id_concepto');
  } else {
    console.log('ℹ️ Columna ya existe: ingresos.id_concepto');
  }

  console.log('--- Migración de Ingresos Directos finalizada exitosamente ---');
}

if (require.main === module) {
  migrateIngresosDirectos()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error fatal en migración:', err);
      process.exit(1);
    });
}

module.exports = { migrateIngresosDirectos };
