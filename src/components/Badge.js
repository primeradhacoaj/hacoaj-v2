import { cx } from "@/lib/cx";
import styles from "./Badge.module.css";

// Etiqueta chica para destacar un estado o dato corto ("Nuevas métricas", "Alto").
//
// Props:
//   tono    "azul" (por defecto) | "neutro" | "exito" | "aviso" | "peligro"
//   punto   agrega un puntito dorado adelante (usar con moderación)
export default function Badge({ tono = "azul", punto = false, children }) {
  return (
    <span className={cx(styles.badge, styles[tono])}>
      {punto && <span className={styles.punto} aria-hidden="true" />}
      {children}
    </span>
  );
}
