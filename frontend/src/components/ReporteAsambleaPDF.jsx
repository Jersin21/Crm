import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDate } from "../utils/dateUtils";

// Estilos estrictamente en Blanco y Negro (B&W) de alta legibilidad para asambleas
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
    marginBottom: 10,
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
    textTransform: "uppercase",
  },
  publicNotice: {
    fontSize: 7.5,
    color: "#444444",
    textAlign: "center",
    marginTop: 2,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    fontSize: 8,
    color: "#333333",
    borderTopWidth: 0.5,
    borderTopColor: "#000000",
    paddingTop: 4,
  },

  // Cajas KPI sencillas B&W
  kpiContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
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
    marginBottom: 10,
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

  // Sección y títulos
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
    marginBottom: 8,
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
    marginTop: 24,
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
  footer: {
    position: "absolute",
    bottom: 18,
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

export const ReporteAsambleaPDF = (props) => {
  const { reporte } = props;

  const nombreAsociacion =
    reporte?.asociacionNombre ||
    props.nombreAsociacion ||
    "ASOCIACIÓN DE COMERCIANTES DEL MERCADO";

  const fechaInicio = props.fechaInicio || reporte?.periodo?.fecha_inicio;
  const fechaFin = props.fechaFin || reporte?.periodo?.fecha_fin;
  const periodo = props.periodo || "Período Ordinario";

  const periodoStr =
    fechaInicio && fechaFin
      ? `${formatDate(fechaInicio)} al ${formatDate(fechaFin)}`
      : periodo;

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

  const resumenIngresos = reporte?.resumen_ingresos_publico || props.resumen_ingresos_publico || [];
  const resumenEgresos = reporte?.resumen_egresos_publico || props.resumen_egresos_publico || [];

  const hoyStr = formatDate(new Date());

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.titleMain}>{nombreAsociacion}</Text>
          <Text style={styles.subtitle}>
            HOJA INFORMATIVA DE CUENTAS PARA ASAMBLEA GENERAL
          </Text>
          <Text style={styles.publicNotice}>
            Resumen General para Conocimiento de Todos los Socios del Mercado
          </Text>
          <View style={styles.metaRow}>
            <Text>Periodo Reportado: {periodoStr}</Text>
            <Text>Fecha de Presentación: {hoyStr}</Text>
          </View>
        </View>

        {/* Resumen 5 Cajas Claras en Blanco y Negro */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Saldo Inicial (Anterior)</Text>
            <Text style={styles.kpiValue}>Bs. {Number(saldoInicial).toFixed(2)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>(+) Recaudación (Entradas)</Text>
            <Text style={styles.kpiValue}>Bs. {Number(totalIngresos).toFixed(2)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>(-) Gastos (Salidas)</Text>
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

        {/* 1. ¿De qué se recaudó? */}
        <Text style={styles.sectionTitle}>
          1. ¿De qué se recaudó? (Resumen consolidado por concepto de cobro)
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ width: "6%", textAlign: "center" }}>N°</Text>
            <Text style={{ width: "44%" }}>Concepto / Rubro de Cobro</Text>
            <Text style={{ width: "16%", textAlign: "center" }}>Socios / Pagos</Text>
            <Text style={{ width: "16%", textAlign: "right" }}>Capital</Text>
            <Text style={{ width: "18%", textAlign: "right" }}>Total Recaudado</Text>
          </View>

          {resumenIngresos.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={{ width: "100%", textAlign: "center", color: "#666666" }}>
                No se registraron cobros en el periodo reportado.
              </Text>
            </View>
          ) : (
            resumenIngresos.map((item, idx) => (
              <View
                key={idx}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={{ width: "6%", textAlign: "center" }}>{idx + 1}</Text>
                <Text style={{ width: "44%", fontFamily: "Helvetica-Bold" }}>{item.concepto}</Text>
                <Text style={{ width: "16%", textAlign: "center" }}>{item.cantidad_socios || item.cantidad_pagos} pago(s)</Text>
                <Text style={{ width: "16%", textAlign: "right" }}>Bs. {Number(item.total_capital || item.total_recaudado).toFixed(2)}</Text>
                <Text style={{ width: "18%", textAlign: "right", fontFamily: "Helvetica-Bold" }}>
                  Bs. {Number(item.total_recaudado).toFixed(2)}
                </Text>
              </View>
            ))
          )}

          <View style={styles.totalRow}>
            <Text style={{ width: "82%", textAlign: "right" }}>Total Recaudado en el Período:</Text>
            <Text style={{ width: "18%", textAlign: "right" }}>
              Bs. {Number(totalIngresos).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* 2. ¿En qué se gastó? */}
        <Text style={styles.sectionTitle}>
          2. ¿En qué se gastó? (Resumen de salidas y compras autorizadas)
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ width: "6%", textAlign: "center" }}>N°</Text>
            <Text style={{ width: "36%" }}>Categoría del Gasto</Text>
            <Text style={{ width: "30%" }}>Descripción / Concepto</Text>
            <Text style={{ width: "10%", textAlign: "center" }}>N° Pagos</Text>
            <Text style={{ width: "18%", textAlign: "right" }}>Total Gastado</Text>
          </View>

          {resumenEgresos.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={{ width: "100%", textAlign: "center", color: "#666666" }}>
                No se registraron gastos en el periodo reportado.
              </Text>
            </View>
          ) : (
            resumenEgresos.map((eg, idx) => (
              <View
                key={idx}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={{ width: "6%", textAlign: "center" }}>{idx + 1}</Text>
                <Text style={{ width: "36%", fontFamily: "Helvetica-Bold" }}>{eg.categoria}</Text>
                <Text style={{ width: "30%", color: "#333333" }}>{eg.detalles || "Gastos autorizados"}</Text>
                <Text style={{ width: "10%", textAlign: "center" }}>{eg.cantidad_desembolsos}</Text>
                <Text style={{ width: "18%", textAlign: "right", fontFamily: "Helvetica-Bold" }}>
                  Bs. {Number(eg.total_egresado).toFixed(2)}
                </Text>
              </View>
            ))
          )}

          <View style={styles.totalRow}>
            <Text style={{ width: "82%", textAlign: "right" }}>Total Gastos Realizados:</Text>
            <Text style={{ width: "18%", textAlign: "right" }}>
              Bs. {Number(totalEgresos).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Cuadro de Cuadre de Caja para la Asamblea */}
        <View style={styles.cuadreBox}>
          <Text style={styles.cuadreTitle}>Cuadre General para Asamblea de Socios</Text>
          <View style={styles.cuadreRow}>
            <Text>Saldo Anterior en Caja (Arranque del período):</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Bs. {Number(saldoInicial).toFixed(2)}</Text>
          </View>
          <View style={styles.cuadreRow}>
            <Text>(+) Ingresos y Aportes recaudados en este período:</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Bs. {Number(totalIngresos).toFixed(2)}</Text>
          </View>
          <View style={styles.cuadreRow}>
            <Text>(-) Gastos y Facturas canceladas en este período:</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Bs. {Number(totalEgresos).toFixed(2)}</Text>
          </View>
          <View style={styles.cuadreRow}>
            <Text>(=) Flujo Neto generado en este período:</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Bs. {Number(flujoPeriodo).toFixed(2)}</Text>
          </View>
          <View style={[styles.cuadreRow, { borderBottomWidth: 0, paddingTop: 4 }]}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>(=) DINERO DISPONIBLE ACTUAL EN CAJA:</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9.5 }}>Bs. {Number(saldoFinal).toFixed(2)}</Text>
          </View>
        </View>

        {/* Firmas de la Directiva */}
        <View style={styles.signaturesContainer}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureRole}>SECRETARÍA DE HACIENDA</Text>
            <Text style={styles.signatureOrg}>Elaborado y Verificado</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureRole}>PRESIDENCIA</Text>
            <Text style={styles.signatureOrg}>Visto Bueno Mesa Directiva</Text>
          </View>
        </View>

        {/* Pie de página */}
        <View style={styles.footer} fixed>
          <Text>MiSocios · Copia oficial informativa para los socios del mercado.</Text>
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

export default ReporteAsambleaPDF;
