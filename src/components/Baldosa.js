import { cx } from "@/lib/cx";
import styles from "./Baldosa.module.css";

// Rejilla de 3 columnas para las baldosas de métricas.
export function RejillaBaldosas({ children }) {
  return <div className={styles.rejilla}>{children}</div>;
}

// Baldosa de una métrica (número grande, unidad y etiqueta), copiada de la v1.
//
// Props:
//   valor, unidad, etiqueta
//   variante  "normal" (por defecto) | "destacada" (fondo azul oscuro) |
//             "porcentaje" (fondo celeste, número más chico)
//   adorno    elemento opcional en la esquina (ej. la variación contra el test anterior)
export default function Baldosa({
  valor,
  unidad,
  etiqueta,
  variante = "normal",
  adorno,
}) {
  return (
    <div
      className={cx(
        styles.baldosa,
        variante === "destacada" && styles.destacada,
        variante === "porcentaje" && styles.porcentaje,
      )}
    >
      {adorno}
      <div className={styles.valor}>
        {valor}
        {unidad && <span className={styles.unidad}> {unidad}</span>}
      </div>
      <div className={styles.etiqueta}>{etiqueta}</div>
    </div>
  );
}
