import PantallaPanel from "@/components/PantallaPanel";
import { obtenerDetallePartido } from "@/lib/data/partidos";
import { createClient } from "@/lib/supabase/server";
import { fechaLarga } from "@/lib/torneo";
import DetallePartidoPanel from "./DetallePartidoPanel";
import styles from "./DetallePartidoPanel.module.css";

export const metadata = {
  title: "Detalle del partido",
};

const CLASE_NUMEROS = { "score-win": styles.gano, "score-draw": styles.empato, "score-loss": styles.perdio };

// Detalle de un partido de Hacoaj (panel técnico): marcador y, debajo, el
// resumen, las alineaciones, la multimedia y las estadísticas en pestañas.
// Mismo contenido que la vista del jugador, con el diseño del panel.
export default async function DetallePartidoPanelPage({ params }) {
  const { fecha } = await params;
  const datos = await obtenerDetallePartido(await createClient(), fecha);
  const { partido } = datos;

  return (
    <PantallaPanel volverHref="/panel/partidos" volverTexto="Partidos" angosto>
      {partido ? (
        <>
          <div className={styles.banner}>
            <div className={styles.meta}>
              {fechaLarga(partido.fecha_raw)} · {partido.condicion}
            </div>
            <div className={styles.rival}>vs {partido.rival}</div>
            <div className={styles.numerosGrandes}>
              <span className={styles.equipo}>Hacoaj</span>
              <span className={styles.numeros}>
                <span className={CLASE_NUMEROS[partido.resultado_clase]}>{partido.goles_hacoaj}</span>
                <span className={styles.separador}>-</span>
                <span className={CLASE_NUMEROS[partido.resultado_clase]}>{partido.goles_rival}</span>
              </span>
              <span className={styles.equipoDerecha}>{partido.rival}</span>
            </div>
            <div className={styles.etiquetas}>
              {partido.formacion && <span className={styles.etiqueta}>{partido.formacion}</span>}
              {partido.capitan && <span className={styles.etiqueta}>Cap: {partido.capitan}</span>}
            </div>
          </div>
          <DetallePartidoPanel datos={datos} />
        </>
      ) : (
        <p className={styles.noEncontrado}>No se encontró el partido.</p>
      )}
    </PantallaPanel>
  );
}
