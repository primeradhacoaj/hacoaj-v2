import styles from "./FechaTest.module.css";

// Línea "📅 Test: 15/08/2026" al pie de una tarjeta de mediciones (copiada de la v1).
// Si no hay fecha no muestra nada.
export default function FechaTest({ fecha }) {
  if (!fecha) return null;
  return <div className={styles.fecha}>📅 Test: {fecha}</div>;
}
