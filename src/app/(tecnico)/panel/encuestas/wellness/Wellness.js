"use client";

import { useMemo } from "react";
import { exportarTabla } from "@/lib/exportarEncuestasPlantel";
import ValorEscala from "../_componentes/ValorEscala";
import VisorEncuesta from "../_componentes/VisorEncuesta";

const COLUMNAS_EXPORTAR = [
  ["jugador", "Jugador"],
  ["fecha", "Fecha"],
  ["sueno", "Sueño"],
  ["estres", "Estrés"],
  ["fatiga", "Fatiga"],
  ["dolor", "Dolor"],
  ["comentario", "Comentario"],
];

// Respuestas de wellness de todo el plantel, para el panel técnico.
export default function Wellness({ respuestas }) {
  const filas = useMemo(
    () => respuestas.map((r) => ({ ...r, clave: `${r.jugador}|||${r.fecha}` })),
    [respuestas],
  );

  const columnas = [
    { titulo: "Jugador", render: (f) => f.jugador },
    { titulo: "Fecha", render: (f) => f.fecha },
    { titulo: "Sueño", render: (f) => <ValorEscala valor={f.sueno} campo="sueno" /> },
    { titulo: "Estrés", render: (f) => <ValorEscala valor={f.estres} campo="estres" /> },
    { titulo: "Fatiga", render: (f) => <ValorEscala valor={f.fatiga} campo="fatiga" /> },
    { titulo: "Dolor", render: (f) => <ValorEscala valor={f.dolor} campo="dolor" /> },
    { titulo: "Comentario", render: (f) => f.comentario || "—" },
  ];

  const promedio = (filtradas, campo) => {
    if (filtradas.length === 0) return "—";
    const suma = filtradas.reduce((total, f) => total + Number(f[campo]), 0);
    return (suma / filtradas.length).toFixed(1);
  };

  const estadisticas = [
    { titulo: "Respuestas", valor: (filtradas) => filtradas.length },
    {
      titulo: "Jugadores",
      valor: (filtradas) => new Set(filtradas.map((f) => f.jugador)).size,
    },
    { titulo: "Prom. dolor musc.", valor: (filtradas) => promedio(filtradas, "dolor") },
    { titulo: "Prom. fatiga", valor: (filtradas) => promedio(filtradas, "fatiga") },
  ];

  return (
    <VisorEncuesta
      storageKey="wellness_tecnico_vistas"
      filas={filas}
      columnas={columnas}
      estadisticas={estadisticas}
      onExportar={(filtradas) => exportarTabla(filtradas, COLUMNAS_EXPORTAR, "wellness_plantel")}
    />
  );
}
