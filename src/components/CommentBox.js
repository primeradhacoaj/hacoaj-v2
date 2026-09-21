import Card from "./Card";
import EmptyState from "./EmptyState";
import styles from "./CommentBox.module.css";

// Bloque "Comentario del Chano" de las pantallas de fuerza y pliegues.
// Si el comentario está vacío (o solo tiene espacios) muestra un mensaje
// amable en vez de un espacio en blanco.
//
// Props:
//   comentario  texto del entrenador (puede venir vacío, null o undefined)
//   titulo      encabezado del bloque ("Comentario del Chano" por defecto)
export default function CommentBox({
  comentario,
  titulo = "Comentario del Chano",
}) {
  const texto = typeof comentario === "string" ? comentario.trim() : "";

  return (
    <Card as="section">
      <h2 className={styles.titulo}>{titulo}</h2>
      {texto ? (
        <p className={styles.texto}>{texto}</p>
      ) : (
        <EmptyState icono="💬" mensaje="No se agregó ningún comentario" />
      )}
    </Card>
  );
}
