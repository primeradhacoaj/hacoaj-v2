import { cx } from "@/lib/cx";
import styles from "./InsigniaResultado.module.css";

// Marcador con color según el resultado: verde (V), amarillo (E) o rojo (D).
// `grande` es la versión de las tarjetas de partido (más alta y más ancha).
export default function InsigniaResultado({ resultado, grande = false, children }) {
  return (
    <span className={cx(styles.insignia, styles[resultado], grande && styles.grande)}>
      {children}
    </span>
  );
}
