import Link from "next/link";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import styles from "./MenuItem.module.css";

// Fila de menú del jugador (diseño original de la v1): recuadro con ícono,
// título, descripción y flecha.
//
// Props:
//   icono, titulo, descripcion, href
//   tono             color del recuadro del ícono: "oro" (por defecto) o "navy"
//   disponible       true por defecto. Si es false no navega: al tocarla llama
//                    a `onNoDisponible` (que muestra un aviso)
//   pronto           muestra la etiqueta "Pronto" y el estilo apagado de la v1
//   destacado        resalta la opción principal (fondo y borde dorados suaves)
//   grande           versión más alta, usada en los submenús
//   onNoDisponible   función a ejecutar al tocar una opción no disponible
export default function MenuItem({
  icono,
  tono = "oro",
  titulo,
  descripcion,
  href,
  disponible = true,
  pronto = false,
  destacado = false,
  grande = false,
  onNoDisponible,
}) {
  const clases = cx(
    styles.item,
    pronto && styles.apagado,
    destacado && styles.destacado,
    grande && styles.grande,
  );

  const contenido = (
    <>
      <span className={cx(styles.icono, styles[tono])}>
        <Icono nombre={icono} tamano={22} />
      </span>
      <span className={styles.texto}>
        <span className={styles.titulo}>{titulo}</span>
        <span className={styles.descripcion}>{descripcion}</span>
      </span>
      {pronto ? (
        <span className={styles.etiqueta}>Pronto</span>
      ) : (
        <span className={styles.flecha} aria-hidden="true">
          <Icono nombre="flecha" tamano={18} strokeWidth={2.4} />
        </span>
      )}
    </>
  );

  if (!disponible) {
    return (
      <button type="button" className={clases} onClick={onNoDisponible}>
        {contenido}
      </button>
    );
  }

  return (
    <Link href={href} className={clases}>
      {contenido}
    </Link>
  );
}
