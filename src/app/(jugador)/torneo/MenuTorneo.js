"use client";

import SubmenuSeccion from "@/components/SubmenuSeccion";

// Círculos concéntricos con líneas verticales, de fondo en el encabezado (copiados de la v1).
const CANCHA = (
  <svg viewBox="0 0 180 100" aria-hidden="true">
    <g fill="none" stroke="#fff" strokeWidth="2.5">
      <circle cx="90" cy="50" r="42" />
      <circle cx="90" cy="50" r="24" />
      <circle cx="90" cy="50" r="6" fill="#fff" stroke="none" />
      <line x1="90" y1="2" x2="90" y2="98" />
    </g>
  </svg>
);

const HACOAJ = [
  {
    icono: "partidos",
    titulo: "Mis estadísticas",
    descripcion: "Goles, asistencias, minutos jugados y más",
    href: "/torneo/estadisticas",
    destacado: true,
    disponible: false,
  },
  {
    icono: "encuestas",
    titulo: "Partidos",
    descripcion: "Resultados y detalle de cada partido",
    href: "/torneo/partidos",
    disponible: false,
  },
];

const TORNEO = [
  {
    icono: "posiciones",
    titulo: "Tabla de posiciones",
    descripcion: "Posiciones de la zona A y B",
    href: "/torneo/posiciones",
  },
  {
    icono: "fixture",
    titulo: "Fixture",
    descripcion: "Calendario y resultados de todas las fechas",
    href: "/torneo/fixture",
    disponible: false,
  },
  {
    icono: "goleadores",
    titulo: "Goleadores",
    descripcion: "Tabla de goleadores del torneo",
    href: "/torneo/goleadores",
    disponible: false,
  },
  {
    icono: "jugadores",
    titulo: "Planteles",
    descripcion: "Planteles de todos los equipos",
    href: "/torneo/planteles",
    disponible: false,
  },
  {
    icono: "estrella",
    titulo: "Jugadores",
    descripcion: "Rankings, goleadores y estadísticas individuales",
    href: "/torneo/jugadores",
    disponible: false,
  },
  {
    icono: "torneo",
    titulo: "Equipos",
    descripcion: "Estadísticas y partidos de cada equipo",
    href: "/torneo/equipos",
    disponible: false,
  },
];

// Submenú "Torneo": lo de Hacoaj y lo de todo el torneo.
export default function MenuTorneo() {
  return (
    <SubmenuSeccion
      seccion="Torneo · 2026"
      titulo="Promocional 2026"
      subtitulo="Estadísticas del torneo y de Hacoaj"
      decoracion={CANCHA}
      estiloDecoracion={{ right: -10, bottom: 10, width: 180, height: 100 }}
      textoPildora="Promocional 2026"
      secciones={[
        { titulo: "Hacoaj", nota: "2 secciones", opciones: HACOAJ },
        { titulo: "Torneo", nota: "6 secciones", separacion: 28, opciones: TORNEO },
      ]}
    />
  );
}
