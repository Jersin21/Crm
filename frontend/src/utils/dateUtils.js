/**
 * Utilidades para formatear fechas de manera consistente en formato dia/mes/año (DD/MM/YYYY)
 */

export const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    // Si ya viene como YYYY-MM-DD
    if (typeof dateStr === "string" && dateStr.length >= 10 && dateStr.includes("-")) {
      const parts = dateStr.slice(0, 10).split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(dateStr);
  }
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch (e) {
    return String(dateStr);
  }
};

export default { formatDate, formatDateTime };
