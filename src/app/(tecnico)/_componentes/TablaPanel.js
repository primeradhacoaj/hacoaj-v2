import { cx } from "@/lib/cx";
import styles from "./TablaPanel.module.css";

// Tabla de datos del panel técnico (posiciones, goleadores…), copiada de la
// v1: tarjeta blanca con encabezado gris y la fila de Hacoaj resaltada.
//
// Props:
//   titulo    nombre de la tabla (para lectores de pantalla)
//   columnas  [{ titulo, tipo, izquierda? }]. `tipo` define el color/peso:
//               "normal" | "fuerte" (negrita) | "puntos" | "goles" (navy, negrita)
//   filas     [{ id, hacoaj, celdas: [valor por columna] }]
export default function TablaPanel({ titulo, columnas, filas }) {
  return (
    <div className={styles.tarjeta}>
      <table aria-label={titulo}>
        <thead>
          <tr>
            {columnas.map((columna) => (
              <th key={columna.titulo} className={cx(columna.izquierda && styles.izquierda)}>
                {columna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.id} className={cx(fila.hacoaj && styles.hacoaj)}>
              {columnas.map((columna, indice) => (
                <td
                  key={columna.titulo}
                  className={cx(
                    columna.izquierda && styles.izquierda,
                    columna.tipo === "puntos" && styles.puntos,
                    columna.tipo === "goles" && styles.goles,
                  )}
                >
                  {fila.celdas[indice]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
