import { cx } from "@/lib/cx";
import styles from "./Aviso.module.css";

// Aviso emergente que aparece abajo, con un punto dorado (toast de la v1).
// Se maneja con el hook useAviso (ver src/lib/useAviso.js).
//
// Props:
//   mensaje  texto a mostrar
//   visible  si está a la vista o escondido
export default function Aviso({ mensaje, visible }) {
  return (
    <div
      className={cx(styles.aviso, visible && styles.visible)}
      role="status"
      aria-live="polite"
    >
      {mensaje}
    </div>
  );
}
