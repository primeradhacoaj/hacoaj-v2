"use client";

import { useMemo } from "react";
import { exportarTabla } from "@/lib/exportarEncuestasPlantel";
import VisorEncuesta from "../_componentes/VisorEncuesta";
import styles from "./PostPartido.module.css";

const COLUMNAS_EXPORTAR = [
  ["jugador", "Jugador"],
  ["fecha", "Fecha partido"],
  ["llegada", "Llegada"],
  ["emocional", "Carga emocional"],
  ["fisica", "Carga física"],
  ["categoria", "Categoría"],
  ["minutos", "Minutos"],
  ["golpesTexto", "Golpes"],
  ["comentario", "Comentario"],
];

// Respuestas post partido de todo el plantel, para el panel técnico.
export default function PostPartido({ respuestas }) {
  const filas = useMemo(
    () =>
      respuestas.map((r) => ({
        ...r,
        fecha: r.fechaPartido,
        clave: r.id,
        golpesTexto: r.golpes.map((g) => g.tipo).join("; ") || "No",
      })),
    [respuestas],
  );

  const columnas = [
    { titulo: "Jugador", render: (f) => f.jugador },
    { titulo: "Fecha partido", render: (f) => f.fechaPartido },
    { titulo: "Llegada", render: (f) => f.llegada },
    { titulo: "Emocional", render: (f) => f.emocional },
    { titulo: "Física", render: (f) => f.fisica },
    { titulo: "Categoría", render: (f) => f.categoria },
    { titulo: "Minutos", render: (f) => f.minutos },
    {
      titulo: "Golpe",
      render: (f) => (
        <span className={f.golpes.length > 0 ? styles.golpeSi : styles.golpeNo}>
          {f.golpes.length > 0 ? `Sí (${f.golpes.length})` : "No"}
        </span>
      ),
    },
    {
      titulo: "Detalle lesiones",
      render: (f) =>
        f.golpes.length > 0 ? (
          <ul className={styles.listaLesiones}>
            {f.golpes.map((g, indice) => (
              <li key={indice}>
                <span className={styles.tipoLesion}>{g.tipo || "-"}</span>
                {" · "}
                <span className={styles.detalleLesion}>
                  {g.ubicacion || "-"} ({g.lado || "-"})
                </span>
                {g.comentario && <span className={styles.comentarioLesion}> · {g.comentario}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <span className={styles.sinDato}>—</span>
        ),
    },
    { titulo: "Comentario", render: (f) => f.comentario || "—" },
  ];

  const estadisticas = [
    { titulo: "Respuestas", valor: (filtradas) => filtradas.length },
    { titulo: "Jugadores", valor: (filtradas) => new Set(filtradas.map((f) => f.jugador)).size },
    { titulo: "Con golpes", valor: (filtradas) => filtradas.filter((f) => f.golpes.length > 0).length },
  ];

  return (
    <VisorEncuesta
      storageKey="post_partido_tecnico_vistas"
      filas={filas}
      columnas={columnas}
      estadisticas={estadisticas}
      onExportar={(filtradas) => exportarTabla(filtradas, COLUMNAS_EXPORTAR, "post_partido_plantel")}
    />
  );
}
