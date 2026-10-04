import HeroSeccion from "@/components/HeroSeccion";
import PieVolver from "@/components/PieVolver";
import { obtenerDetallePartido } from "@/lib/data/partidos";
import { createClient } from "@/lib/supabase/server";
import { fechaLarga } from "@/lib/torneo";
import DetallePartido from "./DetallePartido";
import styles from "./DetallePartido.module.css";

export const metadata = {
  title: "Detalle del partido",
};

const CLASE_MARCADOR = { "score-win": styles.gano, "score-draw": styles.empato, "score-loss": styles.perdio };

// Detalle de un partido de Hacoaj: marcador en el encabezado y, debajo, el
// resumen, las alineaciones, la multimedia y las estadísticas en pestañas.
export default async function DetallePartidoPage({ params }) {
  const { fecha } = await params;
  const datos = await obtenerDetallePartido(await createClient(), fecha);
  const { partido } = datos;

  return (
    <div className={styles.pagina}>
      <HeroSeccion
        sinPerfil
        angosto
        volverHref="/torneo/partidos"
        volverTexto="Partidos"
        seccion="Promocional 2026"
      >
        {partido && (
          <div className={styles.marcadorEncabezado}>
            <div className={styles.meta}>
              {fechaLarga(partido.fecha_raw)} · {partido.condicion}
            </div>
            <div className={styles.rivalGrande}>vs {partido.rival}</div>
            <div className={styles.numerosGrandes}>
              <span className={styles.equipoChico}>Hacoaj</span>
              <span className={styles.numeros}>
                <span className={CLASE_MARCADOR[partido.resultado_clase]}>{partido.goles_hacoaj}</span>
                <span className={styles.separador}>-</span>
                <span className={CLASE_MARCADOR[partido.resultado_clase]}>{partido.goles_rival}</span>
              </span>
              <span className={styles.equipoChicoDerecha}>{partido.rival}</span>
            </div>
            <div className={styles.etiquetasEncabezado}>
              {partido.formacion && <span className={styles.etiquetaHero}>{partido.formacion}</span>}
              {partido.capitan && <span className={styles.etiquetaHero}>Cap: {partido.capitan}</span>}
            </div>
          </div>
        )}
      </HeroSeccion>

      <main className={styles.contenido}>
        {partido ? (
          <DetallePartido datos={datos} />
        ) : (
          <p className={styles.noEncontrado}>No se encontró el partido.</p>
        )}
        <PieVolver href="/torneo/partidos" texto="Volver a partidos" />
      </main>
    </div>
  );
}
