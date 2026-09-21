import { cx } from "@/lib/cx";
import styles from "./Pildoras.module.css";

// Fila de botones redondeados para elegir temporada (2024, 2025, 2026, Todos).
//
// Props:
//   opciones  [{ valor, texto }]
//   activas   lista de `valor` elegidos (uno solo, o varios si se permite)
//   onElegir  se llama con el `valor` tocado; quien la usa decide qué hacer
//   etiqueta  nombre del grupo, para lectores de pantalla
export default function Pildoras({ opciones, activas, onElegir, etiqueta = "Temporada" }) {
  return (
    <div className={styles.pildoras} role="group" aria-label={etiqueta}>
      {opciones.map(({ valor, texto }) => {
        const activa = activas.includes(valor);
        return (
          <button
            key={valor}
            type="button"
            className={cx(styles.pildora, activa && styles.activa)}
            aria-pressed={activa}
            onClick={() => onElegir(valor)}
          >
            {texto}
          </button>
        );
      })}
    </div>
  );
}
