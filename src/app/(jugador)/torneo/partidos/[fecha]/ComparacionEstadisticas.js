import PanelVacio from "@/components/PanelVacio";
import { cx } from "@/lib/cx";
import styles from "./ComparacionEstadisticas.module.css";

const FILAS = [
  ["Remates", "remates_af", "remates_ec"],
  ["Remates al arco", "remates_arco_af", "remates_arco_ec"],
  ["Situaciones de gol", "situaciones_af", "situaciones_ec"],
  ["Corners", "corners_af", "corners_ec"],
  ["Corners conectados", "corners_con_af", "corners_con_ec"],
  ["Tiros libres", "tl_af", "tl_ec"],
];

// Pestaña "Estadísticas": comparación Hacoaj vs. rival en barras, copiada de
// la v1. Cada fila se muestra solo si al menos uno de los dos lados tiene dato.
export default function ComparacionEstadisticas({ rival, partido: p }) {
  const filas = FILAS.filter(([, claveAf, claveEc]) => p[claveAf] !== null || p[claveEc] !== null);
  if (filas.length === 0) {
    return (
      <PanelVacio
        icono="documento"
        titulo="Sin estadísticas"
        mensaje="Todavía no se cargaron estadísticas para este partido."
      />
    );
  }

  return (
    <div className={styles.tarjeta}>
      <div className={styles.cabecera}>
        <span className={styles.equipo}>Hacoaj</span>
        <span className={cx(styles.equipo, styles.rival)}>{rival}</span>
      </div>
      {filas.map(([titulo, claveAf, claveEc]) => {
        const af = p[claveAf] ?? 0;
        const ec = p[claveEc] ?? 0;
        const total = af + ec > 0 ? af + ec : 1;
        return (
          <div key={titulo} className={styles.grupoFila}>
            <div className={styles.fila}>
              <span className={cx(styles.valor, af > ec && styles.gana, af < ec && styles.pierde)}>{af}</span>
              <span className={styles.nombre}>{titulo}</span>
              <span className={cx(styles.valor, ec > af && styles.gana, ec < af && styles.pierde)}>{ec}</span>
            </div>
            <div className={styles.barras}>
              <div className={styles.barraAf} style={{ width: `${Math.round((af / total) * 100)}%` }} />
              <div className={styles.barraEc} style={{ width: `${Math.round((ec / total) * 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
