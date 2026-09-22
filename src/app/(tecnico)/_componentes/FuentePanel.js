import styles from "./FuentePanel.module.css";

// Línea chica al pie de las pantallas de torneo del panel técnico, con el
// origen de los datos.
export default function FuentePanel({ texto = "Fuente: soloascenso.com.ar" }) {
  return <p className={styles.fuente}>{texto}</p>;
}
