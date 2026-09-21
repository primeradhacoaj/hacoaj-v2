import TopNav from "@/components/TopNav";
import { cx } from "@/lib/cx";
import styles from "./PantallaDatos.module.css";

// Contenedor de las pantallas de datos del jugador (fuerza, pliegues,
// historiales, rutinas…): barra superior + columna centrada + colores propios
// de estas pantallas. En la v1 esto estaba copiado en cada archivo.
//
// Props:
//   volverHref  a dónde lleva "← Volver" en la barra superior
//   ancho       "normal" (520 px, por defecto), "angosto" (480 px, formularios) o
//               "ancho" (720 px, pantallas con varias columnas como Rutinas)
export default function PantallaDatos({ volverHref, ancho = "normal", children }) {
  return (
    <div className={styles.pantalla}>
      <TopNav volverHref={volverHref} />
      <div
        className={cx(
          styles.pagina,
          ancho === "ancho" && styles.ancha,
          ancho === "angosto" && styles.angosta,
        )}
      >
        {children}
      </div>
    </div>
  );
}
