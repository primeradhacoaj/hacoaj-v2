import Icono from "@/components/Icono";
import styles from "./SinDatos.module.css";

// Mensaje para cuando todavía no hay mediciones cargadas (copiado de la v1).
//
// Props:
//   mensaje  texto a mostrar ("Sin datos cargados" por defecto)
export default function SinDatos({ mensaje = "Sin datos cargados" }) {
  return (
    <div className={styles.sinDatos}>
      <div className={styles.icono}>
        <Icono nombre="encuestas" tamano={18} />
      </div>
      <span>{mensaje}</span>
    </div>
  );
}
