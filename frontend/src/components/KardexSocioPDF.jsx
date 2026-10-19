import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDate } from "../utils/dateUtils";

// Estilos estrictamente en Blanco y Negro (B&W) de alta legibilidad para impresión
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
  },

  // Ficha de datos del Socio y Caseta
  socioCard: {
    borderWidth: 1,
    borderColor: "#000000",
    padding: 8,
    marginBottom: 10,
    backgroundColor: "#ffffff",
  },
  socioRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  socioField: {
    fontSize: 8,
    color: "#000000",
  },
  socioValue: {
    fontFamily: "Helvetica-Bold",
  },

  // Resumen Financiero KPI (Blanco y Negro)
  kpiContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
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
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
  },

  // Tabla del Kardex
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    paddingVertical: 3,
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
  colNro: { width: "5%", textAlign: "center" },
  colFecha: { width: "12%" },
  colRef: { width: "16%" },
  colDesc: { width: "31%" },
  colDebe: { width: "12%", textAlign: "right" },
  colHaber: { width: "12%", textAlign: "right" },
  colSaldo: { width: "12%", textAlign: "right" },

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
    width: "42%",
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

export const KardexSocioPDF = ({ socio, movimientos = [], resumen = {} }) => {
  const p = socio?.persona || {};
  const asoc = socio?.asociacion || {};
  const nombreAsociacion = asoc.nombre_mercado || "ASOCIACIÓN DE COMERCIANTES";
  const hoyStr = formatDate(new Date());

  const totalCargado = resumen.total_cargado !== undefined ? resumen.total_cargado : 0;
  const totalPagado = resumen.total_pagado !== undefined ? resumen.total_pagado : 0;
  const totalDeuda = resumen.total_deuda_actual !== undefined ? resumen.total_deuda_actual : 0;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.titleMain}>{nombreAsociacion}</Text>
          <Text style={styles.subtitle}>
            ESTADO DE CUENTA HISTÓRICO - KARDEX DE CASETA #{socio?.nro_caseta || "-"}
          </Text>
          <Text style={styles.publicNotice}>
            Libro Mayor Auxiliar de Movimientos, Obligaciones y Pagos Oficiales
          </Text>
          <View style={styles.metaRow}>
            <Text>Titular: {p.nombres || ""} {p.apellidos || ""}</Text>
            <Text>Fecha de Emisión: {hoyStr}</Text>
          </View>
        </View>

        {/* Ficha de datos del Socio */}
        <View style={styles.socioCard}>
          <View style={styles.socioRow}>
            <Text style={styles.socioField}>
              Socio: <Text style={styles.socioValue}>{p.nombres || ""} {p.apellidos || ""}</Text>
            </Text>
            <Text style={styles.socioField}>
              N° de Caseta / Puesto: <Text style={styles.socioValue}>#{socio?.nro_caseta || "-"}</Text>
            </Text>
          </View>
          <View style={styles.socioRow}>
            <Text style={styles.socioField}>
              Carnet de Identidad (CI): <Text style={styles.socioValue}>{p.ci || "S/CI"}</Text>
            </Text>
            <Text style={styles.socioField}>
              Teléfono: <Text style={styles.socioValue}>{p.telefono || "Sin teléfono"}</Text>
            </Text>
          </View>
          <View style={styles.socioRow}>
            <Text style={styles.socioField}>
              Estado en Padrón: <Text style={styles.socioValue}>{socio?.estado_socio || "Activo"}</Text>
            </Text>
            <Text style={styles.socioField}>
              Dirección: <Text style={styles.socioValue}>{p.domicilio || "No registrada"}</Text>
            </Text>
          </View>
        </View>

        {/* Resumen de Cuenta (B&W) */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Cargos Generados (Debe)</Text>
            <Text style={styles.kpiValue}>
              Bs. {Number(totalCargado).toFixed(2)}
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Pagos Realizados (Haber)</Text>
            <Text style={styles.kpiValue}>
              Bs. {Number(totalPagado).toFixed(2)}
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Saldo Pendiente / Deuda Actual</Text>
            <Text style={styles.kpiValue}>
              Bs. {Number(totalDeuda).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Tabla de Movimientos Cronológicos */}
        <Text style={styles.sectionTitle}>
          Detalle Cronológico de Movimientos ({movimientos.length} registros)
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNro}>N°</Text>
            <Text style={styles.colFecha}>Fecha</Text>
            <Text style={styles.colRef}>Referencia</Text>
            <Text style={styles.colDesc}>Concepto / Glosa</Text>
            <Text style={styles.colDebe}>Debe (Bs)</Text>
            <Text style={styles.colHaber}>Haber (Bs)</Text>
            <Text style={styles.colSaldo}>Saldo (Bs)</Text>
          </View>

          {movimientos.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={{ width: "100%", textAlign: "center", color: "#666666" }}>
                No se registran movimientos ni cargos para este socio.
              </Text>
            </View>
          ) : (
            movimientos.map((m, idx) => (
              <View
                key={m.id || idx}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={styles.colNro}>{idx + 1}</Text>
                <Text style={styles.colFecha}>{m.fecha}</Text>
                <Text style={styles.colRef}>{m.referencia}</Text>
                <Text style={styles.colDesc}>{m.descripcion}</Text>
                <Text style={styles.colDebe}>
                  {m.debe > 0 ? Number(m.debe).toFixed(2) : "-"}
                </Text>
                <Text style={styles.colHaber}>
                  {m.haber > 0 ? Number(m.haber).toFixed(2) : "-"}
                </Text>
                <Text style={[styles.colSaldo, { fontFamily: "Helvetica-Bold" }]}>
                  {Number(m.saldo_acumulado).toFixed(2)}
                </Text>
              </View>
            ))
          )}

          <View style={styles.totalRow}>
            <Text style={{ width: "64%", textAlign: "right" }}>Totales y Saldo Final:</Text>
            <Text style={styles.colDebe}>Bs. {Number(totalCargado).toFixed(2)}</Text>
            <Text style={styles.colHaber}>Bs. {Number(totalPagado).toFixed(2)}</Text>
            <Text style={styles.colSaldo}>Bs. {Number(totalDeuda).toFixed(2)}</Text>
          </View>
        </View>

        {/* Firmas de Conformidad */}
        <View style={styles.signaturesContainer}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureRole}>SECRETARÍA DE HACIENDA</Text>
            <Text style={styles.signatureOrg}>Emisión y Verificación Contable</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureRole}>SOCIO(A) TITULAR</Text>
            <Text style={styles.signatureOrg}>Conformidad de Estado de Cuenta</Text>
          </View>
        </View>

        {/* Pie de Página */}
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

export default KardexSocioPDF;
