import { iniciales } from "@/lib/sesion";
import styles from "./PerfilChip.module.css";

// Tarjeta del jugador que se superpone al encabezado (diseño original de la
// v1): avatar con iniciales, saludo, nombre y plantel.
//
// Props:
//   nombre   nombre completo
//   detalle  texto chico debajo del nombre (ej. "Plantel Primera D")
export default function PerfilChip({ nombre, detalle }) {
  return (
    <section className={styles.chip} aria-label="Jugador">
      <div className={styles.avatar}>
        <div className={styles.iniciales}>{iniciales(nombre)}</div>
      </div>
      <div className={styles.info}>
        <div className={styles.saludo}>Bienvenido</div>
        <div className={styles.nombre}>{nombre}</div>
        {detalle && <div className={styles.detalle}>{detalle}</div>}
      </div>
    </section>
  );
}
