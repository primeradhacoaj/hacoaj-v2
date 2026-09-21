import { iniciales } from "@/lib/sesion";
import { cx } from "@/lib/cx";
import styles from "./PerfilChip.module.css";

// Tarjeta del jugador que se superpone al encabezado (diseño original de la
// v1): avatar con iniciales, saludo, nombre y una línea de detalle.
//
// Props:
//   nombre    nombre completo
//   saludo    texto chico sobre el nombre ("Bienvenido" por defecto)
//   detalle   línea debajo del nombre, en azul con punto dorado
//   pildora   alternativa a `detalle`: línea en dorado (usada en los submenús)
//   compacto  versión más chica, para los submenús
export default function PerfilChip({
  nombre,
  saludo = "Bienvenido",
  detalle,
  pildora,
  compacto = false,
}) {
  return (
    <section
      className={cx(styles.chip, compacto && styles.compacto)}
      aria-label="Jugador"
    >
      <div className={styles.avatar}>
        <div className={styles.iniciales}>{iniciales(nombre)}</div>
      </div>
      <div className={styles.info}>
        <div className={styles.saludo}>{saludo}</div>
        <div className={styles.nombre}>{nombre}</div>
        {detalle && <div className={styles.detalle}>{detalle}</div>}
        {pildora && <div className={styles.pildora}>{pildora}</div>}
      </div>
    </section>
  );
}
