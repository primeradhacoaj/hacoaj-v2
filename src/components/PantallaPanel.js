import Link from "next/link";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import styles from "./PantallaPanel.module.css";

// Marco de las pantallas de datos del panel técnico (posiciones, goleadores,
// partidos…), copiado de la v1: título con botón para volver y una columna de
// hasta 1200px de ancho.
//
// Props:
//   titulo               título de la pantalla (opcional: el detalle de partido no
//                         lleva, porque el marcador ya hace de título)
//   volverHref            a dónde vuelve ("/panel" por defecto)
//   volverTexto           texto del botón ("Menú" por defecto)
//   acciones              contenido a la derecha del título (ej. un selector)
//   angosto               columna de 900px en vez de 1200 (detalle de partido, jugador)
export default function PantallaPanel({
  titulo,
  volverHref = "/panel",
  volverTexto = "Menú",
  acciones,
  angosto = false,
  children,
}) {
  return (
    <div className={cx(styles.contenido, angosto && styles.angosto)}>
      <div className={styles.cabecera}>
        <Link href={volverHref} className={styles.volver}>
          <Icono nombre="flechaIzquierda" tamano={16} strokeWidth={2} />
          {volverTexto}
        </Link>
        {titulo && <h1 className={styles.titulo}>{titulo}</h1>}
        {acciones && <div className={styles.acciones}>{acciones}</div>}
      </div>
      {children}
    </div>
  );
}
