import HeroSeccion from "@/components/HeroSeccion";
import PieVolver from "@/components/PieVolver";
import styles from "./PantallaTorneo.module.css";

// Marco de las pantallas de datos del torneo (posiciones, fixture, goleadores…),
// copiado de la v1: encabezado bajo sin tarjeta del jugador, contenido y pie.
//
// Props:
//   titulo, subtitulo, seccion  textos del encabezado (seccion: "Promocional 2026" por defecto)
//   volverHref, volverTexto  botón del encabezado (por defecto vuelve al menú del torneo)
export default function PantallaTorneo({
  titulo,
  subtitulo,
  seccion = "Promocional 2026",
  volverHref = "/torneo",
  volverTexto = "Torneo",
  children,
}) {
  return (
    <div className={styles.pagina}>
      <HeroSeccion
        sinPerfil
        seccion={seccion}
        titulo={titulo}
        subtitulo={subtitulo}
        volverHref={volverHref}
        volverTexto={volverTexto}
      />
      <main className={styles.contenido}>
        {children}
        <PieVolver href={volverHref} texto="Volver" />
      </main>
    </div>
  );
}
