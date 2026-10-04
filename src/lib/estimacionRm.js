// Estimación del RM (repetición máxima) a partir de la velocidad (VMP) y la carga del test.
// Copiada de la v1 (`static/estimacion_rm.csv` y `calcRM` de la pantalla de carga de fuerza).
//
// La tabla dice, para cada porcentaje del RM, qué VMP se espera en sentadilla y en press de pecho.
// Con la VMP medida se busca a qué porcentaje corresponde (interpolando entre dos filas) y el RM
// es la carga dividida por ese porcentaje.

const TABLA = [
  // [porcentaje, vmp sentadilla, vmp pecho]
  [0.4, 1.28, 1.13],
  [0.45, 1.21, 1.07],
  [0.5, 1.14, 0.95],
  [0.55, 1.07, 0.87],
  [0.6, 1.0, 0.78],
  [0.65, 0.92, 0.7],
  [0.7, 0.84, 0.62],
  [0.75, 0.76, 0.55],
  [0.8, 0.68, 0.47],
  [0.85, 0.59, 0.39],
  [0.9, 0.51, 0.32],
  [0.95, 0.42, 0.25],
  [1.0, 0.32, 0.18],
];

// tipo: "sentadilla" | "pecho". Devuelve 0 si falta algún dato.
export function estimarRm(tipo, vmp, carga) {
  if (!(vmp > 0) || !(carga > 0)) return 0;

  const columna = tipo === "sentadilla" ? 1 : 2;
  // De mayor a menor VMP (la mayor velocidad corresponde al menor porcentaje).
  const filas = [...TABLA].sort((a, b) => b[columna] - a[columna]);
  const primera = filas[0];
  const ultima = filas.at(-1);

  // Fuera del rango de la tabla se usa el extremo más cercano.
  if (vmp >= primera[columna]) return carga / primera[0];
  if (vmp <= ultima[columna]) return carga / ultima[0];

  for (let i = 0; i < filas.length - 1; i++) {
    const vmpAlta = filas[i][columna];
    const vmpBaja = filas[i + 1][columna];
    if (vmp <= vmpAlta && vmp >= vmpBaja) {
      const t = (vmpAlta - vmp) / (vmpAlta - vmpBaja);
      const porcentaje = filas[i][0] + t * (filas[i + 1][0] - filas[i][0]);
      return carga / porcentaje;
    }
  }
  return 0;
}

// Fuerza relativa: RM / peso corporal (0 si falta algún dato).
export const fuerzaRelativa = (rm, peso) => (rm > 0 && peso > 0 ? rm / peso : 0);
