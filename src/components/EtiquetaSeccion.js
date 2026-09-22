import styles from "./EtiquetaSeccion.module.css";

// Rótulo de una sección dentro del panel técnico (título chico en mayúsculas
// + una nota a la derecha), copiado de la v1.
export default function EtiquetaSeccion({ nota, children }) {
  return (
    <div className={styles.fila}>
      <h2 className={styles.titulo}>{children}</h2>
      {nota && <span className={styles.nota}>{nota}</span>}
    </div>
  );
}
