import Image from "next/image";
import Link from "next/link";
import Icono from "@/components/Icono";
import styles from "./HeroSeccion.module.css";

// Encabezado compacto de los submenús del jugador (Mi fuerza, Mi composición
// corporal…), copiado de la v1: botón "Menú", escudo, título y subtítulo.
//
// Props:
//   volverHref  a dónde lleva el botón "Menú" (por defecto "/menu")
//   seccion     texto chico sobre el título (ej. "Sección · Fuerza")
//   titulo, subtitulo
//   decoracion  dibujo opcional de fondo (un <svg>)
//   estiloDecoracion  (opcional) posición y tamaño propios del dibujo,
//                     ej. { right: -10, bottom: 12, width: 220, height: 90 }
export default function HeroSeccion({
  volverHref = "/menu",
  seccion,
  titulo,
  subtitulo,
  decoracion,
  estiloDecoracion,
}) {
  return (
    <header className={styles.hero}>
      {decoracion && (
        <div className={styles.decoracion} style={estiloDecoracion}>
          {decoracion}
        </div>
      )}

      <div className={styles.fila}>
        <Link href={volverHref} className={styles.volver} aria-label="Volver al menú">
          <Icono nombre="flechaIzquierda" tamano={16} strokeWidth={2.4} />
          Menú
        </Link>
        <span className={styles.escudo}>
          <Image src="/escudo.png" alt="CNH" width={18} height={22} priority />
          Primera D
        </span>
      </div>

      <div className={styles.titulo}>
        <span className={styles.seccion}>
          <span className={styles.punto} />
          {seccion}
        </span>
        <h1 className={styles.nombre}>{titulo}</h1>
        {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
      </div>
    </header>
  );
}
