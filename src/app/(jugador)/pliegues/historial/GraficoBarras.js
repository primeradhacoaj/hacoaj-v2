import { aNumero, fechaLegible } from "@/lib/fuerza";
import styles from "./GraficoBarras.module.css";

// Gráfico de barras horizontales: una barra por medición, de la más nueva a la
// más vieja (copiado de la v1).
//
// Props:
//   registros    mediciones, de la más nueva a la más vieja
//   campo        columna con el valor a graficar
//   unidad       texto junto al valor ("kg", "mm")
//   color        color de las barras, o una función (valor) => color
export default function GraficoBarras({ registros, campo, unidad, color }) {
  const valores = registros
    .map((r) => aNumero(r[campo]))
    .filter((valor) => valor !== null);

  if (valores.length === 0) {
    return <div className={styles.vacio}>Sin datos</div>;
  }

  // Un 10% de margen para que la barra más larga no ocupe todo el ancho
  const escala = Math.max(...valores) * 1.1;

  return (
    <div>
      {registros.map((registro, indice) => {
        const valor = aNumero(registro[campo]);
        if (valor === null) return null;

        const porcentaje = ((valor / escala) * 100).toFixed(1);
        const colorBarra = typeof color === "function" ? color(valor) : color;

        return (
          <div key={indice} className={styles.fila}>
            <div className={styles.fecha}>
              {fechaLegible(registro["Fecha pliegue"]) || "--"}
            </div>
            <div className={styles.pista}>
              <div
                className={styles.relleno}
                style={{ width: `${porcentaje}%`, background: colorBarra }}
              />
            </div>
            <div className={styles.valor}>
              {valor.toFixed(1)} {unidad}
            </div>
          </div>
        );
      })}
    </div>
  );
}
