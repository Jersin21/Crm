import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDate } from "../utils/dateUtils";

// Estilos estrictamente en Blanco y Negro (B&W) de alta legibilidad para impresión oficial
const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#000000",
    backgroundColor: "#ffffff",
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#000000",
    paddingBottom: 8,
    marginBottom: 12,
  },
  titleMain: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: "#000000",
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: "#000000",
    marginTop: 2,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    fontSize: 8,
    color: "#333333",
  },

  // Resumen ejecutivo / Cajas KPI en Blanco y Negro
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 6,
  },
  kpiBox: {
    flex: 1,
    padding: 6,
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    textTransform: "uppercase",
    marginBottom: 2,
    textAlign: "center",
  },
  kpiValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    textAlign: "center",
  },

  // Cuadro de Cuadre de Caja
  cuadreBox: {
    borderWidth: 1,
    borderColor: "#000000",
    padding: 6,
    marginBottom: 12,
    backgroundColor: "#f5f5f5",
  },
  cuadreTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  cuadreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#cccccc",
  },

  // Secciones y tablas
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    paddingVertical: 3,
    marginTop: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    textTransform: "uppercase",
  },
  table: {
    width: "100%",
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#000000",
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 7.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cccccc",
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 7.5,
  },
  tableRowAlt: {
    backgroundColor: "#f5f5f5",
  },
  colNro: { width: "6%", textAlign: "center" },
  colFecha: { width: "14%" },
  colSocio: { width: "32%" },
  colDetalle: { width: "30%" },
  colMonto: { width: "18%", textAlign: "right" },

  // Totales de tabla
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 1.5,
    borderTopColor: "#000000",
    borderBottomWidth: 1.5,
    borderBottomColor: "#000000",
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },

  // Firmas
  signaturesContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 28,
    paddingTop: 8,
  },
  signatureBox: {
    width: "40%",
    alignItems: "center",
    textAlign: "center",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#000000",
    width: "100%",
    marginBottom: 3,
  },
  signatureRole: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
  },
  signatureOrg: {
    fontSize: 7,
    color: "#444444",
  },

  // Pie de página
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    borderTopWidth: 0.5,
    borderTopColor: "#000000",
    paddingTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#444444",
  },
});

export const ReportePDF = (props) => {
  const { reporte } = props;

  const nombreAsociacion =
    reporte?.asociacionNombre ||
    props.nombreAsociacion ||
    "ASOCIACIÓN DE COMERCIANTES DEL MERCADO";

  const fechaInicio = props.fechaInicio || reporte?.periodo?.fecha_inicio;
  const fechaFin = props.fechaFin || reporte?.periodo?.fecha_fin;
  const periodo = props.periodo || "Período Seleccionado";

  const periodoStr =
    fechaInicio && fechaFin
      ? `${formatDate(fechaInicio)} al ${formatDate(fechaFin)}`
      : periodo;

  const ingresos = reporte?.ingresos || props.ingresos || [];
  const egresos = reporte?.egresos || props.egresos || [];

  const saldoInicial =
    reporte?.saldo_inicial !== undefined
      ? reporte.saldo_inicial
      : props.saldo_inicial !== undefined
      ? props.saldo_inicial
      : 0;

  const totalIngresos =
    reporte?.totalIngresos !== undefined
      ? reporte.totalIngresos
      : props.totalIngresos || 0;

  const totalEgresos =
    reporte?.totalEgresos !== undefined
      ? reporte.totalEgresos
      : props.totalEgresos || 0;

  const flujoPeriodo =
    reporte?.flujo_periodo !== undefined
      ? reporte.flujo_periodo
      : totalIngresos - totalEgresos;

  const saldoFinal =
    reporte?.saldo_final !== undefined
      ? reporte.saldo_final
      : saldoInicial + flujoPeriodo;

  const hoyStr = formatDate(new Date());

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Encabezado Institucional en Blanco y Negro */}
        <View style={styles.header}>
          <Text style={styles.titleMain}>{nombreAsociacion}</Text>
          <Text style={styles.subtitle}>
            INFORME ECONÓMICO Y FINANCIERO DE CAJA GRANDE
          </Text>
          <Text style={{ fontSize: 7.5, color: "#444444", textAlign: "center", textTransform: "uppercase" }}>
            Documento Oficial de Rendición de Cuentas y Cuadre de Caja
          </Text>
          <View style={styles.metaRow}>
            <Text>Período: {periodoStr}</Text>
            <Text>Fecha de Emisión: {hoyStr}</Text>
          </View>
        </View>

        {/* Cajas de Resumen Financiero B&W */}
        <View style={styles.summaryContainer}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Saldo Inicial (Anterior)</Text>
            <Text style={styles.kpiValue}>Bs. {Number(saldoInicial).toFixed(2)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>(+) Total Ingresos</Text>
            <Text style={styles.kpiValue}>Bs. {Number(totalIngresos).toFixed(2)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>(-) Total Egresos</Text>
            <Text style={styles.kpiValue}>Bs. {Number(totalEgresos).toFixed(2)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>(=) Flujo Neto Período</Text>
            <Text style={styles.kpiValue}>Bs. {Number(flujoPeriodo).toFixed(2)}</Text>
          </View>
          <View style={[styles.kpiBox, { backgroundColor: "#f0f0f0" }]}>
            <Text style={styles.kpiLabel}>(=) Saldo Final en Caja</Text>
            <Text style={[styles.kpiValue, { fontSize: 11 }]}>Bs. {Number(saldoFinal).toFixed(2)}</Text>
          </View>
        </View>

        {/* 1. Detalle de Ingresos */}
        <Text style={styles.sectionTitle}>
          1. Detalle de Ingresos Registrados ({ingresos.length} transacciones)
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNro}>N°</Text>
            <Text style={styles.colFecha}>Fecha</Text>
            <Text style={styles.colSocio}>Socio / Caseta</Text>
            <Text style={styles.colDetalle}>Detalle / Glosa</Text>
            <Text style={styles.colMonto}>Monto Recibido</Text>
          </View>
          {ingresos.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={{ width: "100%", textAlign: "center", color: "#666666" }}>
                No se registraron ingresos en el período seleccionado.
              </Text>
            </View>
          ) : (
            ingresos.slice(0, 35).map((ing, idx) => {
              const soc = ing.socio || ing.Socio || {};
              const per = soc.persona || soc.Persona || {};
              const socioNom = per.nombres
                ? `${per.nombres} ${per.apellidos || ""} (Caseta #${soc.nro_caseta || "-"})`
                : (ing.pagador || `Socio #${ing.id_socio || "-"}`);
              return (
                <View
                  key={ing.id_ingreso || idx}
                  style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
                >
                  <Text style={styles.colNro}>{idx + 1}</Text>
                  <Text style={styles.colFecha}>{formatDate(ing.fecha_pago)}</Text>
                  <Text style={styles.colSocio}>{socioNom}</Text>
                  <Text style={styles.colDetalle}>{ing.concepto || ing.observacion || "Cobro de caja"}</Text>
                  <Text style={styles.colMonto}>
                    Bs. {Number(ing.monto_total_recibido || ing.monto_total || 0).toFixed(2)}
                  </Text>
                </View>
              );
            })
          )}
          <View style={styles.totalRow}>
            <Text style={{ width: "82%", textAlign: "right" }}>Subtotal Ingresos del Período:</Text>
            <Text style={styles.colMonto}>Bs. {Number(totalIngresos).toFixed(2)}</Text>
          </View>
        </View>

        {/* 2. Detalle de Egresos */}
        <Text style={styles.sectionTitle}>
          2. Detalle de Egresos y Gastos ({egresos.length} transacciones)
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNro}>N°</Text>
            <Text style={styles.colFecha}>Fecha</Text>
            <Text style={styles.colSocio}>Categoría</Text>
            <Text style={styles.colDetalle}>Concepto / Detalle</Text>
            <Text style={styles.colMonto}>Monto Egresado</Text>
          </View>
          {egresos.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={{ width: "100%", textAlign: "center", color: "#666666" }}>
                No se registraron egresos en el período seleccionado.
              </Text>
            </View>
          ) : (
            egresos.slice(0, 35).map((eg, idx) => (
              <View
                key={eg.id_egreso || idx}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={styles.colNro}>{idx + 1}</Text>
                <Text style={styles.colFecha}>{formatDate(eg.fecha_gasto)}</Text>
                <Text style={styles.colSocio}>
                  {eg.tipo_egreso?.nombre_categoria || eg.TipoEgreso?.nombre_categoria || "Gasto General"}
                </Text>
                <Text style={styles.colDetalle}>{eg.detalle || "-"}</Text>
                <Text style={styles.colMonto}>Bs. {Number(eg.monto || 0).toFixed(2)}</Text>
              </View>
            ))
          )}
          <View style={styles.totalRow}>
            <Text style={{ width: "82%", textAlign: "right" }}>Subtotal Egresos del Período:</Text>
            <Text style={styles.colMonto}>Bs. {Number(totalEgresos).toFixed(2)}</Text>
          </View>
        </View>

        {/* Cuadro de Cuadre Final */}
        <View style={styles.cuadreBox}>
          <Text style={styles.cuadreTitle}>Cuadre Contable de Caja</Text>
          <View style={styles.cuadreRow}>
            <Text>Saldo Anterior en Caja:</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Bs. {Number(saldoInicial).toFixed(2)}</Text>
          </View>
          <View style={styles.cuadreRow}>
            <Text>(+) Recaudación total del período:</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Bs. {Number(totalIngresos).toFixed(2)}</Text>
          </View>
          <View style={styles.cuadreRow}>
            <Text>(-) Desembolsos y gastos del período:</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Bs. {Number(totalEgresos).toFixed(2)}</Text>
          </View>
          <View style={[styles.cuadreRow, { borderBottomWidth: 0, paddingTop: 4 }]}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>(=) SALDO TOTAL FINAL EN CAJA:</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9.5 }}>Bs. {Number(saldoFinal).toFixed(2)}</Text>
          </View>
        </View>

        {/* Firmas de la Directiva */}
        <View style={styles.signaturesContainer}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureRole}>SECRETARÍA DE HACIENDA</Text>
            <Text style={styles.signatureOrg}>Control de Caja y Finanzas</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureRole}>PRESIDENCIA</Text>
            <Text style={styles.signatureOrg}>Mesa Directiva</Text>
          </View>
        </View>

        {/* Pie de página */}
        <View style={styles.footer} fixed>
          <Text>MiSocios · Sistema de Gestión de Mercados y Asociaciones</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

export default ReportePDF;
