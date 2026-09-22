import HeroSeccion from "@/components/HeroSeccion";
import PieVolver from "@/components/PieVolver";
import { cx } from "@/lib/cx";
import styles from "./PantallaTorneo.module.css";

// Marco de las pantallas de datos del torneo (posiciones, fixture, goleadores…),
// copiado de la v1: encabezado, contenido y pie.
//
// Props:
//   titulo, subtitulo, seccion  textos del encabezado (seccion: "Promocional 2026" por defecto)
//   volverHref, volverTexto     botón del encabezado (por defecto vuelve al menú del torneo)
//   pieTexto                    texto del botón del pie ("Volver" por defecto)
//   perfil    tarjeta del jugador debajo del encabezado (ej. <PerfilJugador />); con ella
//             el encabezado es el alto y el contenido queda un poco más separado
//   encabezado  contenido propio del encabezado en lugar del título (ej. el marcador)
//   angosto   columna de 480 px (en vez de 520) en pantallas grandes
export default function PantallaTorneo({
  titulo,
  subtitulo,
  seccion = "Promocional 2026",
  volverHref = "/torneo",
  volverTexto = "Torneo",
  pieTexto = "Volver",
  perfil,
  encabezado,
  angosto = false,
  children,
}) {
  return (
    <div className={cx(styles.pagina, angosto && styles.angosta)}>
      <HeroSeccion
        sinPerfil={!perfil}
        angosto={angosto}
        seccion={seccion}
        titulo={titulo}
        subtitulo={subtitulo}
        volverHref={volverHref}
        volverTexto={volverTexto}
      >
        {encabezado}
      </HeroSeccion>
      {perfil}
      <main className={cx(styles.contenido, perfil && styles.conPerfil)}>
        {children}
        <PieVolver href={volverHref} texto={pieTexto} />
      </main>
    </div>
  );
}
