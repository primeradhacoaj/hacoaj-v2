import styles from "./FuenteDatos.module.css";

// Línea chica al pie de las pantallas del torneo con el origen de los datos.
export default function FuenteDatos({ texto = "Fuente: soloascenso.com.ar" }) {
  return <p className={styles.fuente}>{texto}</p>;
}
