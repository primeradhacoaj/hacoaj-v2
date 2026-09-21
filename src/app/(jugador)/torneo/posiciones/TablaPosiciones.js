import { cx } from "@/lib/cx";
import styles from "./TablaPosiciones.module.css";

const COLUMNAS = [
  ["pts", "Pts"],
  ["j", "J"],
  ["g", "G"],
  ["e", "E"],
  ["p", "P"],
  ["gf", "GF"],
  ["gc", "GC"],
  ["dif", "Dif"],
];

// Tabla de una zona: encabezado con el nombre de la zona y la cantidad de
// equipos, y una fila por equipo (la de Hacoaj se resalta).
export default function TablaPosiciones({ zona, filas, primera = false }) {
  return (
    <section>
      <div className={cx(styles.etiqueta, !primera && styles.separada)}>
        <h2 className={styles.zona}>{zona}</h2>
        <span className={styles.cantidad}>{filas.length} equipos</span>
      </div>
      <div className={styles.tabla} role="table" aria-label={zona}>
        <div className={cx(styles.fila, styles.cabecera)} role="row">
          <span className={styles.pos} role="columnheader">#</span>
          <span className={styles.equipo} role="columnheader">Equipo</span>
          {COLUMNAS.map(([clave, texto]) => (
            <span key={clave} className={styles.dato} role="columnheader">
              {texto}
            </span>
          ))}
        </div>
        {filas.map((fila) => (
          <div
            key={fila.nombre}
            className={cx(styles.fila, fila.es_hacoaj && styles.hacoaj)}
            role="row"
          >
            <span className={styles.pos} role="cell">{fila.pos}</span>
            <span className={styles.equipo} role="cell">{fila.nombre}</span>
            {COLUMNAS.map(([clave]) => (
              <span
                key={clave}
                className={cx(styles.dato, clave === "pts" && styles.puntos)}
                role="cell"
              >
                {fila[clave]}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
