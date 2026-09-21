import Link from "next/link";
import IconoPanel from "@/components/IconoPanel";
import { cx } from "@/lib/cx";
import styles from "./ActionCard.module.css";

// Tarjeta de acceso del panel técnico (diseño original de la v1): ícono de
// color, título, descripción y etiquetas. Si `disponible` es false, no navega:
// al tocarla llama a `onNoDisponible` (que muestra un aviso).
//
// Props:
//   icono       clave de <IconoPanel>
//   tono        color del ícono: navy, blue, pink, green, orange, purple, red, gris
//   titulo, descripcion, href
//   etiquetas   lista de palabras clave (opcional)
//   disponible       true por defecto
//   onNoDisponible   función a ejecutar al tocar una tarjeta sin pantalla
export default function ActionCard({
  icono,
  tono = "navy",
  titulo,
  descripcion,
  href,
  etiquetas = [],
  disponible = true,
  onNoDisponible,
}) {
  const contenido = (
    <>
      <div className={cx(styles.icono, styles[tono])}>
        <IconoPanel nombre={icono} />
      </div>
      <div>
        <div className={styles.filaTitulo}>
          <div className={styles.nombre}>{titulo}</div>
          <IconoPanel
            nombre="flechaSalir"
            tamano={16}
            trazo={2}
            className={styles.flecha}
          />
        </div>
        <div className={styles.descripcion}>{descripcion}</div>
      </div>
      <div className={styles.etiquetas}>
        {etiquetas.map((etiqueta) => (
          <span key={etiqueta} className={styles.etiqueta}>
            {etiqueta}
          </span>
        ))}
      </div>
    </>
  );

  if (!disponible) {
    return (
      <button type="button" className={styles.tarjeta} onClick={onNoDisponible}>
        {contenido}
      </button>
    );
  }

  return (
    <Link href={href} className={styles.tarjeta}>
      {contenido}
    </Link>
  );
}
