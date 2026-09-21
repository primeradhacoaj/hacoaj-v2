import { cx } from "@/lib/cx";
import styles from "./Card.module.css";

// La tarjeta blanca de bordes redondeados que envuelve casi todo el contenido.
//
// Props:
//   as        etiqueta HTML a usar ("div" por defecto, también "section", "article"…)
//   sinRelleno quita el espacio interno (para tarjetas con contenido a sangre)
//   className clase extra para casos puntuales
export default function Card({
  as: Etiqueta = "div",
  sinRelleno = false,
  className,
  children,
}) {
  return (
    <Etiqueta className={cx(styles.card, sinRelleno && styles.sinRelleno, className)}>
      {children}
    </Etiqueta>
  );
}
