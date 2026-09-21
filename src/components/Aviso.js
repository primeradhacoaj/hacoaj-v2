import { cx } from "@/lib/cx";
import styles from "./Aviso.module.css";

// Aviso emergente que aparece abajo (toast de la v1). Se maneja con el hook
// useAviso (ver src/lib/useAviso.js).
//
// Props:
//   mensaje  texto a mostrar
//   visible  si está a la vista o escondido
//   tipo     "info" (oscuro con punto dorado, por defecto) | "exito" (verde) | "error" (rojo)
export default function Aviso({ mensaje, visible, tipo = "info" }) {
  return (
    <div
      className={cx(styles.aviso, styles[tipo], visible && styles.visible)}
      role="status"
      aria-live="polite"
    >
      {mensaje}
    </div>
  );
}
