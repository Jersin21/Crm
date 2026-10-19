import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDate } from "../utils/dateUtils";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  receiptContainer: {
    borderWidth: 1.5,
    borderColor: "#0284c7",
    borderRadius: 6,
    padding: 16,
    position: "relative",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 10,
    marginBottom: 12,
  },
  titleArea: {
    width: "60%",
  },
  mainTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textTransform: "uppercase",
  },
  subTitle: {
    fontSize: 8.5,
    color: "#64748b",
    marginTop: 2,
  },
  receiptBadge: {
    width: "35%",
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#0ea5e9",
    borderRadius: 4,
    padding: 6,
    textAlign: "center",
  },
  badgeText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#0369a1",
    textTransform: "uppercase",
  },
  badgeNumber: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0284c7",
    marginTop: 2,
  },
  socioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  socioCol: {
    width: "50%",
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 7.5,
    color: "#64748b",
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  fieldValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 1,
  },
  table: {
    width: "100%",
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    padding: 4,
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    padding: 4,
    fontSize: 8,
  },
  colConcepto: { width: "40%" },
  colPeriodo: { width: "20%" },
  colCapital: { width: "20%", textAlign: "right" },
  colMora: { width: "20%", textAlign: "right" },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1.5,
    borderTopColor: "#0f172a",
    paddingTop: 6,
    marginTop: 4,
  },
  literalText: {
    width: "60%",
    fontSize: 8,
    fontStyle: "italic",
    color: "#475569",
  },
  totalAmount: {
    width: "35%",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    color: "#059669",
  },
  signatures: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 28,
  },
  sigBox: {
    width: "40%",
    alignItems: "center",
  },
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: "#475569",
    width: "100%",
    marginBottom: 4,
  },
  sigText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textAlign: "center",
  },
  watermark: {
    position: "absolute",
    top: 130,
    left: 100,
    fontSize: 50,
    color: "rgba(16, 185, 129, 0.08)",
    fontFamily: "Helvetica-Bold",
    transform: "rotate(-25deg)",
  },
});

export const ReciboPagoPDF = (props) => {
  const { ingreso } = props;

  // Extraer información del socio ya sea de ingreso o de props directas
  const rawSocio = ingreso?.socio || ingreso?.Socio || props.socio || {};
  const rawPersona = rawSocio?.persona || rawSocio?.Persona || {};
  const rawCajero = ingreso?.cajero || ingreso?.Usuario || {};
  const rawDetalles = ingreso?.detalles || props.cargosPagados || [];

  const numRecibo = ingreso?.nro_recibo || props.nro_recibo || ingreso?.id_ingreso || props.idRecibo || 1;
  const idRecibo = typeof numRecibo === "number" || !isNaN(Number(numRecibo))
    ? `REC-${String(numRecibo).padStart(5, "0")}`
    : String(numRecibo);

  const nombreAsociacion =
    props.nombreAsociacion ||
    ingreso?.asociacion?.nombre_mercado ||
    "ASOCIACIÓN DE COMERCIANTES DEL MERCADO";

  const fechaPago = formatDate(ingreso?.fecha_pago || props.fechaPago || new Date());

  const montoTotal =
    ingreso?.monto_total_recibido !== undefined
      ? ingreso.monto_total_recibido
      : props.montoTotal || 0;

  const cajero =
    typeof rawCajero === "object"
      ? rawCajero.username || "Caja Central"
      : String(rawCajero || "Caja Central");

  const nombreCompleto = rawPersona.nombres
    ? `${rawPersona.nombres} ${rawPersona.apellidos || ""}`
    : rawSocio.nombre || ingreso?.pagador || props.pagador || "Público General / Tercero";

  const nroCaseta = rawSocio.nro_caseta ? `Caseta #${rawSocio.nro_caseta}` : (ingreso?.pagador ? "N/A (Ingreso Directo)" : "-");
  const ciSocio = rawPersona.ci || "-";

  const cargosPagados = rawDetalles.length > 0
    ? rawDetalles.map((item) => {
        const c = item.cargo || {};
        const conc = c.concepto || c.ConceptoCobro || {};
        return {
          concepto:
            item.concepto ||
            conc.nombre_concepto ||
            c.detalle ||
            "Aporte Ordinario",
          periodo: item.periodo || c.periodo || "-",
          monto_abonado_capital: item.monto_abonado_capital ?? item.capital ?? 0,
          monto_abonado_mora: item.monto_abonado_mora ?? item.mora ?? 0,
        };
      })
    : [{
        concepto: ingreso?.concepto || ingreso?.observacion || "Ingreso Directo de Caja",
        periodo: formatDate(ingreso?.fecha_pago || props.fechaPago || new Date()),
        monto_abonado_capital: montoTotal,
        monto_abonado_mora: 0,
      }];

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.receiptContainer}>
          <Text style={styles.watermark}>CANCELADO</Text>

          {/* Encabezado */}
          <View style={styles.header}>
            <View style={styles.titleArea}>
              <Text style={styles.mainTitle}>{nombreAsociacion}</Text>
              <Text style={styles.subTitle}>Comprobante Oficial de Ingreso en Caja</Text>
            </View>
            <View style={styles.receiptBadge}>
              <Text style={styles.badgeText}>RECIBO DE CAJA</Text>
              <Text style={styles.badgeNumber}>N° {idRecibo}</Text>
            </View>
          </View>

          {/* Datos del Socio */}
          <View style={styles.socioGrid}>
            <View style={styles.socioCol}>
              <Text style={styles.fieldLabel}>Socio</Text>
              <Text style={styles.fieldValue}>{nombreCompleto}</Text>
            </View>
            <View style={styles.socioCol}>
              <Text style={styles.fieldLabel}>Caseta N°</Text>
              <Text style={styles.fieldValue}>{nroCaseta}</Text>
            </View>
            <View style={styles.socioCol}>
              <Text style={styles.fieldLabel}>CI</Text>
              <Text style={styles.fieldValue}>{ciSocio}</Text>
            </View>
            <View style={styles.socioCol}>
              <Text style={styles.fieldLabel}>Fecha de Pago</Text>
              <Text style={styles.fieldValue}>{fechaPago}</Text>
            </View>
          </View>

          {/* Detalle de Conceptos Cancelados */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colConcepto}>Concepto</Text>
              <Text style={styles.colPeriodo}>Período</Text>
              <Text style={styles.colCapital}>Abono Capital</Text>
              <Text style={styles.colMora}>Abono Mora</Text>
            </View>
            {cargosPagados.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={{ width: "100%", textAlign: "center", color: "#64748b" }}>
                  Pago general registrado en caja
                </Text>
              </View>
            ) : (
              cargosPagados.map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={styles.colConcepto}>{item.concepto}</Text>
                  <Text style={styles.colPeriodo}>{item.periodo}</Text>
                  <Text style={styles.colCapital}>
                    Bs. {Number(item.monto_abonado_capital).toFixed(2)}
                  </Text>
                  <Text style={styles.colMora}>
                    Bs. {Number(item.monto_abonado_mora).toFixed(2)}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Total */}
          <View style={styles.totalSection}>
            <Text style={styles.literalText}>
              Cobrado y verificado por: {cajero}
            </Text>
            <Text style={styles.totalAmount}>
              TOTAL: Bs. {Number(montoTotal).toFixed(2)}
            </Text>
          </View>

          {/* Firmas */}
          <View style={styles.signatures}>
            <View style={styles.sigBox}>
              <View style={styles.sigLine} />
              <Text style={styles.sigText}>ENTREGUÉ CONFORME</Text>
              <Text style={{ fontSize: 7, color: "#64748b" }}>Firma del Socio</Text>
            </View>
            <View style={styles.sigBox}>
              <View style={styles.sigLine} />
              <Text style={styles.sigText}>RECIBÍ CONFORME</Text>
              <Text style={{ fontSize: 7, color: "#64748b" }}>Caja / Hacienda</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ReciboPagoPDF;
