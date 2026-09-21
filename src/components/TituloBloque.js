import styles from "./TituloBloque.module.css";

// Título de un bloque de una pantalla de datos: un puntito de color y el texto
// en mayúsculas ("● PRESS DE PECHO"). Copiado de la v1.
//
// Props:
//   color   color del puntito
//   arriba  espacio sobre el título, en píxeles (8 por defecto)
export default function TituloBloque({ color, arriba = 8, children }) {
  return (
    <div className={styles.fila} style={{ marginTop: arriba }}>
      <span className={styles.punto} style={{ background: color }} />
      <span className={styles.titulo}>{children}</span>
    </div>
  );
}
