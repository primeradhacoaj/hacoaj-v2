// Datos de PRUEBA de Analytics (actividad de los usuarios en la app). En la
// v1 esto salía de una tabla SQLite (`page_views`) que un script de tracking
// (`/static/tracker.js`) llenaba con cada visita real. v2 todavía no hace
// ese tracking (no hay base de datos ni usuarios reales todavía), así que
// se generan visitas de PRUEBA de los 3 usuarios de prueba
// (`src/lib/data/usuarios.js`) sobre las páginas que YA existen en v2 —no
// las rutas de la v1, que no coinciden con las de acá.

import { generador } from "@/lib/azar";

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
const PAGINAS_TECNICO = [
  "/panel",
  "/panel/analisis",
  "/panel/jugadores",
  "/panel/encuestas",
  "/panel/encuestas/wellness",
  "/panel/encuestas/post-partido",
  "/panel/partidos",
  "/panel/posiciones",
  "/panel/fixture",
  "/panel/goleadores",
  "/panel/fuerza",
  "/panel/pliegues",
  "/panel/calendario",
  "/panel/configuracion",
];

const TODAS_LAS_PAGINAS = [
  "/menu",
  ...JERARQUIA_JUGADOR.flatMap((s) => [s.hub, ...s.hijos.map((h) => h.path)]),
  ...PAGINAS_TECNICO,
];

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
};

// path → nombre para mostrar, igual a como lo ve el usuario en su menú.
export const ETIQUETA_PAGINA = {
  "/menu": "Menú principal",
  ...Object.fromEntries(JERARQUIA_JUGADOR.map((s) => [s.hub, s.etiqueta])),
  ...Object.fromEntries(JERARQUIA_JUGADOR.flatMap((s) => s.hijos.map((h) => [h.path, h.etiqueta]))),
  ...ETIQUETAS_TECNICO,
};

const USUARIOS = [
  { usuario: "jugador", rol: "jugador" },
  { usuario: "tecnico", rol: "tecnico" },
  { usuario: "admin", rol: "administrador" },
];

const DIAS_HISTORIAL = 30;
const VISITAS_POR_DIA = 22;

let cache = null;

function paginaDe(usuario) {
  const pool = usuario.rol === "jugador" ? TODAS_LAS_PAGINAS.filter((p) => !p.startsWith("/panel")) : PAGINAS_TECNICO;
  return pool;
}

function base() {
  if (cache) return cache;

  const azar = generador(8800);
  const visitas = [];
  const ahora = new Date();

  for (let diasAtras = DIAS_HISTORIAL - 1; diasAtras >= 0; diasAtras--) {
    const fecha = new Date(ahora);
    fecha.setDate(fecha.getDate() - diasAtras);
    const cantidadHoy = Math.max(2, Math.round(VISITAS_POR_DIA * (0.5 + azar())));

    for (let i = 0; i < cantidadHoy; i++) {
      const usuario = USUARIOS[Math.floor(azar() * USUARIOS.length)];
      if (usuario.rol === "administrador" && azar() < 0.7) continue; // el admin casi no navega la app
      const paginas = paginaDe(usuario);
      const pagina = paginas[Math.floor(azar() * paginas.length)];
      const hora = 8 + Math.floor(azar() * 14);
      const minuto = Math.floor(azar() * 60);
      const marca = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), hora, minuto);

      visitas.push({
        timestamp: marca.toISOString(),
        usuario: usuario.usuario,
        rol: usuario.rol,
        pagina,
        duracion_seg: 5 + Math.floor(azar() * azar() * 300),
      });
    }
  }

  visitas.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  cache = visitas;
  return cache;
}

// Todas las visitas de prueba (más nueva primero). El filtro por fecha lo
// hace la pantalla (es un dataset chico, no hace falta ida y vuelta al
// servidor para cambiarlo).
export async function obtenerVisitas() {
  return base();
}
