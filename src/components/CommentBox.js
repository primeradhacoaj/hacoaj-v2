import styles from "./CommentBox.module.css";

// Bloque "Comentario del Chano" de las pantallas de fuerza y pliegues, con el
// diseño original de la v1 (borde azul a la izquierda). Si no hay ningún
// comentario, muestra un mensaje en vez de un espacio vacío.
//
// Props:
//   items   lista de { subtitulo, texto }. Se muestran solo los que tienen texto.
//           `subtitulo` es opcional (ej. "Press de pecho").
//   titulo  encabezado del bloque ("Comentario del Chano" por defecto)
export default function CommentBox({ items = [], titulo = "Comentario del Chano" }) {
  const conTexto = items.filter(
    (item) => typeof item.texto === "string" && item.texto.trim() !== "",
  );

  return (
    <section className={styles.tarjeta}>
      <div className={styles.titulo}>{titulo}</div>

      {conTexto.length === 0 ? (
        <div className={`${styles.texto} ${styles.vacio}`}>
          No se agregó ningún comentario.
        </div>
      ) : (
        conTexto.map((item, indice) => (
          <div key={item.subtitulo ?? indice} className={styles.item}>
            {item.subtitulo && (
              <div className={styles.subtitulo}>{item.subtitulo}</div>
            )}
            <div className={styles.texto}>{item.texto.trim()}</div>
          </div>
        ))
      )}
    </section>
  );
}
