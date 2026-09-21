import { cx } from "@/lib/cx";
import styles from "./TablaTorneo.module.css";

// Tabla de las pantallas del torneo (posiciones, goleadores…), copiada de la
// v1: tarjeta blanca con encabezado gris, una fila por equipo o jugador y la
// fila de Hacoaj resaltada.
//
// Props:
//   titulo         nombre de la tabla (para lectores de pantalla)
//   columnas       [{ titulo, tipo }]. `tipo` define cómo se ve la columna:
//                    "pos"        número de puesto (gris, centrado)
//                    "texto"      texto alineado a la izquierda y en negrita
//                    "nombre"     igual que "texto", pero se pinta dorado en la fila de Hacoaj
//                    "secundario" texto a la izquierda, gris y más chico (dorado en la fila de Hacoaj)
//                    "dato"       número centrado
//                    "puntos"     número centrado, azul y en negrita
//                    "goles"      número centrado, azul, negrita y más grande
//   filas          [{ id, hacoaj, celdas: [valor por columna] }]
//   plantilla      grid-template-columns en pantallas comunes ("28px 1fr repeat(8, 30px)")
//   plantillaChica igual, para pantallas de 380 px o menos
//   fuenteChica    tamaño de letra (px) en pantallas de 380 px o menos
export default function TablaTorneo({
  titulo,
  columnas,
  filas,
  plantilla,
  plantillaChica,
  fuenteChica = 10,
}) {
  const variables = {
    "--plantilla": plantilla,
    "--plantilla-chica": plantillaChica,
    "--fuente-chica": `${fuenteChica}px`,
  };

  return (
    <div className={styles.tabla} role="table" aria-label={titulo} style={variables}>
      <div className={cx(styles.fila, styles.cabecera)} role="row">
        {columnas.map((columna) => (
          <span
            key={columna.titulo}
            className={cx(styles.celda, styles[columna.tipo])}
            role="columnheader"
          >
            {columna.titulo}
          </span>
        ))}
      </div>
      {filas.map((fila) => (
        <div key={fila.id} className={cx(styles.fila, fila.hacoaj && styles.hacoaj)} role="row">
          {columnas.map((columna, indice) => (
            <span
              key={columna.titulo}
              className={cx(styles.celda, styles[columna.tipo])}
              role="cell"
            >
              {fila.celdas[indice]}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
