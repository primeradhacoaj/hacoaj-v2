import { cx } from "@/lib/cx";
import styles from "./Alternador.module.css";

// Fila de botones tipo pastilla para alternar entre vistas (Tabla / Gráficos,
// Sentadilla / Pecho…). Copiada de la v1.
//
// Props:
//   opciones   lista de { valor, etiqueta }
//   valor      el valor seleccionado ahora
//   alCambiar  función que se llama con el valor elegido
export default function Alternador({ opciones, valor, alCambiar }) {
  return (
    <div className={styles.fila} role="group">
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          className={cx(styles.boton, valor === opcion.valor && styles.activo)}
          aria-pressed={valor === opcion.valor}
          onClick={() => alCambiar(opcion.valor)}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  );
}
