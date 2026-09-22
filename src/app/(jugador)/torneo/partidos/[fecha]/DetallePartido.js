"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import Alineaciones from "./Alineaciones";
import ComparacionEstadisticas from "./ComparacionEstadisticas";
import styles from "./DetallePartido.module.css";
import Multimedia from "./Multimedia";
import TimelineResumen from "./TimelineResumen";

const PESTANAS = [
  { clave: "resumen", titulo: "Resumen" },
  { clave: "alineaciones", titulo: "Alineaciones" },
  { clave: "multimedia", titulo: "Multimedia" },
  { clave: "estadisticas", titulo: "Estadísticas" },
];

// Pestañas del detalle de un partido, copiado de la v1.
//
// Props: `datos` es lo que devuelve `obtenerDetallePartido`.
export default function DetallePartido({ datos }) {
  const [pestana, setPestana] = useState("resumen");
  const { partido, jugadores_data: jugadores, videos, links, resumen_eventos: eventos, resumen_disciplina: disciplina } = datos;

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

      {pestana === "resumen" && (
        <TimelineResumen rival={partido.rival} eventos={eventos} disciplina={disciplina} />
      )}
      {pestana === "alineaciones" && (
        <Alineaciones formacion={partido.formacion} capitan={partido.capitan} jugadores={jugadores} />
      )}
      {pestana === "multimedia" && <Multimedia videos={videos} links={links} />}
      {pestana === "estadisticas" && <ComparacionEstadisticas rival={partido.rival} partido={partido} />}
    </>
  );
}
