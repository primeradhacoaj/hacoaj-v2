// Íconos SVG de la app, todos en una sola grilla de 24x24 con trazo simple.
// Se pintan con el color del texto que los rodea (currentColor), así que
// cambian de color con solo cambiar el color del contenedor.
//
// Props:
//   nombre  clave del ícono (ver ICONOS)
//   tamano  ancho y alto en píxeles (22 por defecto)
const ICONOS = {
  flecha: "M9 6l6 6-6 6",
  estrella:
    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  flechaIzquierda: "M15 18l-6-6 6-6",
  flechaAbajo: "M6 9l6 6 6-6",
  mas: "M12 5v14 M5 12h14",
  cerrar: "M18 6 6 18 M6 6l12 12",
  check: "M20 6 9 17l-5-5",
  buscar: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3",
  tabla: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M3 9h18 M9 3v18",
  descargar: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  nutricion:
    "M12 8c-1.5-2-4.5-2.5-6 0-1.6 2.6-1 6.5 1 9.5 1 1.5 2.2 3 3.6 3 .8 0 1.1-.4 1.4-.4s.6.4 1.4.4c1.4 0 2.6-1.5 3.6-3 2-3 2.6-6.9 1-9.5-1.5-2.5-4.5-2-6 0z M12 8c0-2.2 1-3.8 3-4.5",
  pastilla:
    "M10.5 20.5l-7-7a4.95 4.95 0 0 1 7-7l7 7a4.95 4.95 0 0 1-7 7z M8.5 8.5l7 7",
  documento:
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  salir: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  campana:
    "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  corazon:
    "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  velocidad: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  fuerza: "M6.5 6.5v11 M17.5 6.5v11 M3.5 9v6 M20.5 9v6 M6.5 12h11",
  composicion:
    "M4 15.5L15.5 4 20 8.5 8.5 20z M8 11l2 2 M11 8l2 2 M5.5 14l2 2",
  encuestas:
    "M9 4h6v3H9z M7 5.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-1 M9 12h6 M9 16h4",
  torneo:
    "M8 4h8v5a4 4 0 0 1-8 0z M8 6H5v1a3 3 0 0 0 3 3 M16 6h3v1a3 3 0 0 1-3 3 M12 13v4 M8.5 20h7 M10 17h4",
  dashboard: "M4 4h7v7H4z M13 4h7v4h-7z M13 10h7v10h-7z M4 13h7v7H4z",
  jugadores:
    "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20v-1a5.5 5.5 0 0 1 5.5-5.5h2a5.5 5.5 0 0 1 5.5 5.5v1 M16 4.2a3.5 3.5 0 0 1 0 6.6 M18.5 13.8A5.5 5.5 0 0 1 21.5 19v1",
  lesiones: "M3 12h4l2-5 4 10 2-5h6",
  cargarPartido: "M5 21V4 M5 4h11l-2 4 2 4H5",
  partidos:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 8l3.5 2.5-1.3 4h-4.4l-1.3-4z",
  posiciones: "M4 5h16v14H4z M4 10h16 M9 10v9",
  fixture: "M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4",
  goleadores:
    "M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M8.5 14L7 21l5-3 5 3-1.5-7",
  cargarDatos:
    "M12 16V4 M7 9l5-5 5 5 M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  calendario: "M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4 M8 14h2 M14 14h2",
  configuracion: "M4 7h9 M17 7h3 M4 17h3 M11 17h9 M15 5v4 M9 15v4",
  analytics: "M5 20V10 M12 20V4 M19 20v-7",
  usuario:
    "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
  candado:
    "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z M7 11V7a5 5 0 0 1 10 0v4",
  ojo: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  ojoTachado:
    "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94 M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19 M14.12 14.12a3 3 0 1 1-4.24-4.24 M1 1l22 22",
  alerta: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z M12 8v4 M12 16h.01",
};

export default function Icono({ nombre, tamano = 22, ...resto }) {
  const trazo = ICONOS[nombre];
  if (!trazo) return null;

  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...resto}
    >
      <path d={trazo} />
    </svg>
  );
}
