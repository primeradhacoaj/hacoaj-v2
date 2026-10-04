import EtiquetaSeccion from "@/components/EtiquetaSeccion";
import Icono from "@/components/Icono";
import PantallaPanel from "@/components/PantallaPanel";
import { obtenerPartidosHacoaj } from "@/lib/data/partidos";
import { createClient } from "@/lib/supabase/server";
import { cx } from "@/lib/cx";
import { fechaLarga } from "@/lib/torneo";
import VacioPanel from "../../_componentes/VacioPanel";
import styles from "./Partidos.module.css";

export const metadata = {
  title: "Partidos de Hacoaj",
};

const CLASE_MARCADOR = { "score-win": styles.gano, "score-draw": styles.empato, "score-loss": styles.perdio };

export default async function PartidosPanelPage() {
  const partidos = await obtenerPartidosHacoaj(await createClient());

  return (
    <PantallaPanel titulo="Partidos de Hacoaj">
      {partidos.length > 0 ? (
        <>
          <EtiquetaSeccion nota={`${partidos.length} partidos`}>Resultados</EtiquetaSeccion>
          <div className={styles.grilla}>
            {partidos.map((p) => (
              <a key={p.fecha_raw} href={`/panel/partidos/${p.fecha_raw}`} className={styles.tarjeta}>
                <div className={cx(styles.marcador, CLASE_MARCADOR[p.resultado_clase])}>
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
                <Icono nombre="flecha" tamano={16} strokeWidth={2} className={styles.flecha} />
              </a>
            ))}
          </div>
        </>
      ) : (
        <VacioPanel titulo="Sin partidos" mensaje="Todavía no hay partidos cargados en el Promocional 2026." />
      )}
    </PantallaPanel>
  );
}
