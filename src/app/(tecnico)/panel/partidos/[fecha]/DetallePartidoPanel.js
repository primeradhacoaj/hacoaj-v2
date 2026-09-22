"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import AlineacionesPanel from "./AlineacionesPanel";
import ComparacionPanel from "./ComparacionPanel";
import styles from "./DetallePartidoPanel.module.css";
import MultimediaPanel from "./MultimediaPanel";
import TimelinePanel from "./TimelinePanel";

const PESTANAS = [
  { clave: "resumen", titulo: "Resumen" },
  { clave: "alineaciones", titulo: "Alineaciones" },
  { clave: "multimedia", titulo: "Multimedia" },
  { clave: "estadisticas", titulo: "Estadísticas" },
];

// Pestañas del detalle de un partido, en el panel técnico. Mismo contenido
// que la vista del jugador (ver `torneo/partidos/[fecha]/DetallePartido.js`).
export default function DetallePartidoPanel({ datos }) {
  const [pestana, setPestana] = useState("resumen");
  const {
    partido,
    jugadores_data: jugadores,
    videos,
    links,
    resumen_eventos: eventos,
    resumen_disciplina: disciplina,
  } = datos;

  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label="Detalle del partido">
        {PESTANAS.map((p) => (
          <button
            key={p.clave}
            type="button"
            role="tab"
            aria-selected={p.clave === pestana}
            className={cx(styles.tab, p.clave === pestana && styles.tabActiva)}
            onClick={() => setPestana(p.clave)}
          >
            {p.titulo}
          </button>
        ))}
      </div>

      {pestana === "resumen" && <TimelinePanel rival={partido.rival} eventos={eventos} disciplina={disciplina} />}
      {pestana === "alineaciones" && (
        <AlineacionesPanel formacion={partido.formacion} capitan={partido.capitan} jugadores={jugadores} />
      )}
      {pestana === "multimedia" && <MultimediaPanel videos={videos} links={links} />}
      {pestana === "estadisticas" && <ComparacionPanel rival={partido.rival} partido={partido} />}
    </>
  );
}
