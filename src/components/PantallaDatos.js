import TopNav from "@/components/TopNav";
import styles from "./PantallaDatos.module.css";

// Contenedor de las pantallas de datos del jugador (fuerza, pliegues,
// historiales, rutinas…): barra superior + columna centrada + colores propios
// de estas pantallas. En la v1 esto estaba copiado en cada archivo.
//
// Props:
//   volverHref  a dónde lleva "← Volver" en la barra superior
export default function PantallaDatos({ volverHref, children }) {
  return (
    <div className={styles.pantalla}>
      <TopNav volverHref={volverHref} />
      <div className={styles.pagina}>{children}</div>
    </div>
  );
}
