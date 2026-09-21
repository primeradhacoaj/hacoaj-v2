"use client";

import SubmenuMedicion from "@/components/SubmenuMedicion";

// Silueta de una regla o calibre, de fondo en el encabezado (copiada de la v1).
const REGLA = (
  <svg viewBox="0 0 220 90" aria-hidden="true">
    <g fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
      <rect x="10" y="30" width="200" height="30" rx="4" />
      <line x1="30" y1="30" x2="30" y2="44" />
      <line x1="50" y1="30" x2="50" y2="40" />
      <line x1="70" y1="30" x2="70" y2="40" />
      <line x1="90" y1="30" x2="90" y2="44" />
      <line x1="110" y1="30" x2="110" y2="40" />
      <line x1="130" y1="30" x2="130" y2="40" />
      <line x1="150" y1="30" x2="150" y2="44" />
      <line x1="170" y1="30" x2="170" y2="40" />
      <line x1="190" y1="30" x2="190" y2="40" />
    </g>
  </svg>
);

// Submenú "Composición corporal": elegir entre el último registro y el historial.
export default function MenuPliegues() {
  return (
    <SubmenuMedicion
      seccion="Sección · Composición"
      titulo="Composición corporal"
      subtitulo="Pliegues y evolución"
      decoracion={REGLA}
      estiloDecoracion={{ right: -10, bottom: 12, width: 220, height: 90 }}
      iconoPildora="composicion"
      textoPildora="Pliegues"
      ultimoHref="/pliegues/ultimo"
      historialHref="/pliegues/historial"
      historialDescripcion="Todos tus registros de pliegues"
      historialDisponible={false}
    />
  );
}
