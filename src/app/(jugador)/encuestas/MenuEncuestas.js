"use client";

import SubmenuSeccion from "@/components/SubmenuSeccion";

// Dibujo de una cancha, de fondo en el encabezado (copiado de la v1).
const CANCHA = (
  <svg viewBox="0 0 200 100" aria-hidden="true">
    <g fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
      <rect x="30" y="20" width="140" height="60" rx="8" fill="none" />
      <line x1="60" y1="20" x2="60" y2="80" />
      <line x1="140" y1="20" x2="140" y2="80" />
      <line x1="75" y1="40" x2="95" y2="40" />
      <line x1="85" y1="30" x2="85" y2="50" />
      <circle cx="125" cy="55" r="8" fill="none" />
    </g>
  </svg>
);

// Submenú "Mis encuestas": elegir entre post partido y wellness.
export default function MenuEncuestas() {
  return (
    <SubmenuSeccion
      seccion="Sección · Encuestas"
      titulo="Mis encuestas"
      subtitulo="Post partido y bienestar"
      decoracion={CANCHA}
      iconoPildora="encuestas"
      textoPildora="Encuestas"
      tituloLista="Encuestas disponibles"
      notaLista="2 opciones"
      opciones={[
        {
          icono: "partidos",
          titulo: "Post partido",
          descripcion: "Carga física, emocional y molestias después del partido",
          href: "/encuestas/post-partido",
          destacado: true,
        },
        {
          icono: "corazon",
          tono: "navy",
          titulo: "Wellness",
          descripcion: "Estado de ánimo, sueño, fatiga y bienestar general",
          href: "/encuestas/wellness",
        },
      ]}
    />
  );
}
