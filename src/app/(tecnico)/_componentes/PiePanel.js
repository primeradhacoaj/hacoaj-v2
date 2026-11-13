import styles from "./PiePanel.module.css";

// Pie de las pantallas de menú del panel técnico (menú principal, Encuestas,
// Cargar datos), igual que en la v1.
export default function PiePanel() {
  return (
    <footer className={styles.pie}>
      <div>© 2026 Club Náutico Hacoaj · Panel Técnico</div>
      <div>Primera D · Temporada 2026</div>
    </footer>
  );
}
