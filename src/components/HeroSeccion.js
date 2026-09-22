import Image from "next/image";
import Link from "next/link";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import styles from "./HeroSeccion.module.css";

// Encabezado compacto de las pantallas del jugador (Mi fuerza, Composición
// corporal, Torneo…), copiado de la v1: botón para volver, escudo, título y
// subtítulo.
//
// Props:
//   volverHref   a dónde lleva el botón para volver (por defecto "/menu")
//   volverTexto  texto del botón ("Menú" por defecto)
//   seccion      texto chico sobre el título (ej. "Sección · Fuerza")
//   titulo, subtitulo
//   decoracion   dibujo opcional de fondo (un <svg>)
//   estiloDecoracion  (opcional) posición y tamaño propios del dibujo,
//                     ej. { right: -10, bottom: 12, width: 220, height: 90 }
//   sinPerfil    versión más baja, para pantallas SIN la tarjeta del jugador
//                superpuesta (tablas, fixture…)
//   angosto      con `sinPerfil`, ancho de 480 px en pantallas grandes (en vez de 520)
//   children     contenido propio en lugar del título y subtítulo (ej. el
//                marcador de un partido); el encabezado queda más bajo
export default function HeroSeccion({
  volverHref = "/menu",
  volverTexto = "Menú",
  seccion,
  titulo,
  subtitulo,
  decoracion,
  estiloDecoracion,
  sinPerfil = false,
  angosto = false,
  children,
}) {
  return (
    <header
      className={cx(
        styles.hero,
        sinPerfil && styles.sinPerfil,
        angosto && styles.angosto,
        children && styles.conContenido,
      )}
    >
      {decoracion && (
        <div className={styles.decoracion} style={estiloDecoracion}>
          {decoracion}
        </div>
      )}

      <div className={styles.fila}>
        <Link
          href={volverHref}
          className={styles.volver}
          aria-label={`Volver a ${volverTexto}`}
        >
          <Icono nombre="flechaIzquierda" tamano={16} strokeWidth={2.4} />
          {volverTexto}
        </Link>
        <span className={styles.escudo}>
          <Image src="/escudo.png" alt="CNH" width={18} height={22} priority />
          Primera D
        </span>
      </div>

      {children ?? (
        <div className={styles.titulo}>
          <span className={styles.seccion}>
            <span className={styles.punto} />
            {seccion}
          </span>
          <h1 className={styles.nombre}>{titulo}</h1>
          {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
        </div>
      )}
    </header>
  );
}
