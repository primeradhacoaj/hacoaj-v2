import { cx } from "@/lib/cx";
import styles from "./InsigniaEstado.module.css";

// Etiqueta de estado con el semáforo de la v1 (verde / amarillo / rojo).
//
// Props:
//   tono  "green" | "yellow" | "red"
export default function InsigniaEstado({ tono, children }) {
  return <div className={cx(styles.insignia, styles[tono])}>{children}</div>;
}
