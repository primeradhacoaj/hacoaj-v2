import Icono from "@/components/Icono";
import styles from "./PanelVacio.module.css";

// Tarjeta de "Sin datos" de las pantallas del torneo (copiada de la v1).
//
// Props:
//   icono    clave de <Icono>
//   titulo   "Sin datos" por defecto
//   mensaje  qué pasó
export default function PanelVacio({ icono, titulo = "Sin datos", mensaje }) {
  return (
    <div className={styles.vacio}>
      <div className={styles.icono}>
        <Icono nombre={icono} tamano={42} />
      </div>
      <h3>{titulo}</h3>
      <p>{mensaje}</p>
    </div>
  );
}
