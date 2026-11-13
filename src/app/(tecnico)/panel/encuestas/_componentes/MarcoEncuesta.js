import styles from "./MarcoEncuesta.module.css";

// Marco de las pantallas de respuestas de encuestas del panel técnico, copiado
// de la v1: columna ancha (hasta 1400px, pegada a la izquierda en pantallas
// comunes) con el título y una descripción. El botón para volver a Encuestas
// va en la barra superior (ver `BarraPanel`), como en la v1.
//
// Props:
//   titulo       título de la pantalla
//   descripcion  texto chico debajo del título
export default function MarcoEncuesta({ titulo, descripcion, children }) {
  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <div>
          <h1 className={styles.titulo}>{titulo}</h1>
          <p className={styles.descripcion}>{descripcion}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
