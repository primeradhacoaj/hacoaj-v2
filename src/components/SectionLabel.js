import { cx } from "@/lib/cx";
import styles from "./SectionLabel.module.css";

// Título de una sección del menú del jugador, con una nota opcional a la
// derecha (diseño original de la v1).
//
// Props:
//   nota      texto chico a la derecha (ej. "Disponibles")
//   separada  más espacio arriba, para las secciones que no son la primera.
//             `true` = 22 px; un número = esa cantidad de píxeles
export default function SectionLabel({ nota, separada = false, children }) {
  return (
    <div
      className={cx(styles.fila, separada === true && styles.separada)}
      style={typeof separada === "number" ? { marginTop: separada } : undefined}
    >
      <h2 className={styles.titulo}>{children}</h2>
      {nota && <span className={styles.nota}>{nota}</span>}
    </div>
  );
}
