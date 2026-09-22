import styles from "./VacioPanel.module.css";

// Estado "sin datos" del panel técnico, copiado de la v1: más simple que el
// del jugador (sin ícono).
export default function VacioPanel({ titulo = "Sin datos", mensaje }) {
  return (
    <div className={styles.vacio}>
      <h3>{titulo}</h3>
      <p>{mensaje}</p>
    </div>
  );
}
