// CAPA DE DATOS de Analytics (actividad de los usuarios en la app): las visitas a cada
// pantalla que registra `src/components/Tracker.js` en la tabla `page_views`. En la v1
// salían de una tabla SQLite que llenaba `static/tracker.js`. Solo el administrador puede
// leerlas (RLS); con cualquier otro rol la lista vuelve vacía.

// Páginas del lado del jugador, agrupadas como las ve en su menú (para el
// gráfico "Uso por sección — Jugadores", igual que la v1).
export const JERARQUIA_JUGADOR = [
  {
    clave: "fuerza",
    etiqueta: "Mi fuerza",
    icono: "🏋️",
    hub: "/fuerza",
    hijos: [
      { path: "/fuerza/ultimo", etiqueta: "Mi último registro" },
      { path: "/fuerza/historial", etiqueta: "Mi historial" },
      { path: "/rutinas", etiqueta: "Rutinas" },
    ],
  },
  {
    clave: "pliegues",
    etiqueta: "Mi composición corporal",
    icono: "📐",
    hub: "/pliegues",
    hijos: [
      { path: "/pliegues/ultimo", etiqueta: "Mi último registro" },
      { path: "/pliegues/historial", etiqueta: "Mi historial" },
    ],
  },
  {
    clave: "encuestas",
    etiqueta: "Encuestas",
    icono: "📝",
    hub: "/encuestas",
    hijos: [
      { path: "/encuestas/post-partido", etiqueta: "Post partido" },
      { path: "/encuestas/wellness", etiqueta: "Wellness" },
    ],
  },
  {
    clave: "torneo",
    etiqueta: "Promocional 2026",
    icono: "🏆",
    hub: "/torneo",
    hijos: [
      { path: "/torneo/estadisticas", etiqueta: "Mis estadísticas" },
      { path: "/torneo/partidos", etiqueta: "Partidos" },
      { path: "/torneo/posiciones", etiqueta: "Tabla de posiciones" },
      { path: "/torneo/fixture", etiqueta: "Fixture" },
      { path: "/torneo/goleadores", etiqueta: "Goleadores" },
      { path: "/torneo/planteles", etiqueta: "Planteles" },
      { path: "/torneo/jugadores", etiqueta: "Jugadores" },
      { path: "/torneo/equipos", etiqueta: "Equipos" },
    ],
  },
];

// Páginas del técnico/admin (planas, no se agrupan — igual que la v1).
const ETIQUETAS_TECNICO = {
  "/panel": "Panel técnico (menú)",
  "/panel/analisis": "Dashboard de análisis",
  "/panel/jugadores": "Jugadores",
  "/panel/encuestas": "Encuestas (menú)",
  "/panel/encuestas/wellness": "Wellness (técnico)",
  "/panel/encuestas/post-partido": "Post partido (técnico)",
  "/panel/partidos": "Partidos (técnico)",
  "/panel/posiciones": "Tabla de posiciones (técnico)",
  "/panel/fixture": "Fixture (técnico)",
  "/panel/goleadores": "Goleadores (técnico)",
  "/panel/fuerza": "Historial fuerza (plantel)",
  "/panel/pliegues": "Historial pliegues (plantel)",
  "/panel/calendario": "Calendario",
  "/panel/configuracion": "Configuración",
  "/panel/analytics": "Analytics",
};

// path → nombre para mostrar, igual a como lo ve el usuario en su menú.
export const ETIQUETA_PAGINA = {
  "/menu": "Menú principal",
  ...Object.fromEntries(JERARQUIA_JUGADOR.map((s) => [s.hub, s.etiqueta])),
  ...Object.fromEntries(JERARQUIA_JUGADOR.flatMap((s) => s.hijos.map((h) => [h.path, h.etiqueta]))),
  ...ETIQUETAS_TECNICO,
  "/ajustes/contrasena": "Cambiar contraseña",
};


function verificar({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// El detalle de un partido (`/torneo/partidos/2026-08-29`) se cuenta como la pantalla de
// partidos, no como una página distinta por cada fecha.
const normalizarPagina = (pagina) => pagina.replace(/^(\/(?:torneo|panel)\/partidos)\/[^/]+$/, "$1");

// Las últimas 2.000 visitas de jugadores y cuerpo técnico (más nueva primero), como la v1. El filtro por fecha lo hace la
// pantalla. Recibe el cliente de Supabase del servidor.
export async function obtenerVisitas(supabase) {
  const filas = verificar(
    await supabase
      .from("page_views")
      .select("momento, rol, pagina, duracion_seg, perfiles(usuario, nombre)")
      .neq("rol", "administrador") // como la v1: la actividad del administrador no cuenta
      .order("momento", { ascending: false })
      .order("id", { ascending: false })
      .limit(2000),
  );
  return filas.map((v) => ({
    timestamp: v.momento,
    usuario: v.perfiles?.usuario ?? v.perfiles?.nombre ?? "—",
    rol: v.rol ?? "—",
    pagina: normalizarPagina(v.pagina),
    duracion_seg: v.duracion_seg ?? 0,
  }));
}
