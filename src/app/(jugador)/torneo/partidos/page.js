import Icono from "@/components/Icono";
import PanelVacio from "@/components/PanelVacio";
import PantallaTorneo from "@/components/PantallaTorneo";
import SectionLabel from "@/components/SectionLabel";
import { cx } from "@/lib/cx";
import { obtenerPartidosHacoaj } from "@/lib/data/partidos";
import { fechaLarga } from "@/lib/torneo";
import styles from "./Partidos.module.css";

export const metadata = {
  title: "Partidos",
};

const CLASE_RESULTADO = { "score-win": styles.gano, "score-draw": styles.empato, "score-loss": styles.perdio };

// Todos los partidos de Hacoaj en el torneo; cada uno lleva a su detalle.
export default async function PartidosPage() {
  const partidos = await obtenerPartidosHacoaj();

  return (
    <PantallaTorneo titulo="Partidos" angosto>
      {partidos.length > 0 ? (
        <>
          <SectionLabel nota={`${partidos.length} partidos`}>Resultados</SectionLabel>
          <div className={styles.lista}>
            {partidos.map((p) => (
              <a key={p.fecha_raw} href={`/torneo/partidos/${p.fecha_raw}`} className={styles.partido}>
                <div className={cx(styles.marcador, CLASE_RESULTADO[p.resultado_clase])}>
                  {p.goles_hacoaj}
                  <span className={styles.guion}>-</span>
                  {p.goles_rival}
                </div>
                <div className={styles.info}>
                  <div className={styles.rival}>vs {p.rival}</div>
                  <div className={styles.meta}>
                    {fechaLarga(p.fecha_raw)}
                    <span className={styles.punto} />
                    {p.condicion}
                    {p.formacion && (
                      <>
                        <span className={styles.punto} />
                        {p.formacion}
                      </>
                    )}
                  </div>
                </div>
                <div className={styles.flecha}>
                  <Icono nombre="flecha" tamano={16} strokeWidth={2.4} />
                </div>
              </a>
            ))}
          </div>
        </>
      ) : (
        <PanelVacio
          icono="partidos"
          titulo="Sin partidos"
          mensaje="Todavía no hay partidos cargados en el Promocional 2026."
        />
      )}
    </PantallaTorneo>
  );
}
