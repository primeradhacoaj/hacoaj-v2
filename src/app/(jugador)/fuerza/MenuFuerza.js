"use client";

import SubmenuMedicion from "@/components/SubmenuMedicion";

// Silueta de una barra con pesas, de fondo en el encabezado (copiada de la v1).
const BARRA = (
  <svg viewBox="0 0 200 100" aria-hidden="true">
    <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
      <line x1="30" y1="50" x2="170" y2="50" />
      <rect x="14" y="30" width="14" height="40" rx="3" fill="#fff" stroke="none" />
      <rect x="172" y="30" width="14" height="40" rx="3" fill="#fff" stroke="none" />
      <rect x="2" y="38" width="10" height="24" rx="2" fill="#fff" stroke="none" />
      <rect x="188" y="38" width="10" height="24" rx="2" fill="#fff" stroke="none" />
    </g>
  </svg>
);

// Submenú "Mi fuerza": elegir entre el último registro y el historial.
export default function MenuFuerza() {
  return (
    <SubmenuMedicion
      seccion="Sección · Fuerza"
      titulo="Mi fuerza"
      subtitulo="Pecho, sentadilla y evolución"
      decoracion={BARRA}
      iconoPildora="fuerza"
      textoPildora="Fuerza"
      ultimoHref="/fuerza/ultimo"
      historialHref="/fuerza/historial"
      historialDescripcion="Todos tus registros de fuerza"
    />
  );
}
