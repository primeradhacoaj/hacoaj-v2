// Definición de los menús. Cada opción es un dato; las pantallas los recorren
// con .map() y dibujan una tarjeta por cada uno. Para agregar una opción
// alcanza con sumar una línea acá.
//
// Campos de cada opción:
//   id, titulo, descripcion, href
//   icono       clave de <Icono> (menú jugador) o de <IconoPanel> (menú técnico)
//   disponible  false = todavía no tiene pantalla: se ve igual que las demás, pero
//               al tocarla muestra un aviso en vez de navegar
//   soloAdmin   true = solo la ve el administrador
//   etiquetas   (solo menú técnico) palabras clave de la tarjeta
//   tono        (solo menú técnico) color del ícono: navy, blue, pink, green,
//               orange, purple, red o gris

// Textos de los avisos que se muestran al tocar una opción sin pantalla.
export const AVISO_MIGRANDO =
  "Esta sección se está migrando a la nueva versión";
export const AVISO_PRONTO = "Esta sección no está disponible actualmente";

// Menú del jugador. Mismas secciones y textos que la v1.
//   nota    texto chico a la derecha del título de la sección
//   tono    color del recuadro del ícono: "oro" (por defecto) o "navy"
//   pronto  opción "en desarrollo": etiqueta "Pronto" y estilo apagado
//   aviso   texto propio para el aviso al tocarla (si no, se usa uno por defecto)
export const MENU_JUGADOR = [
  {
    seccion: "Evaluaciones físicas",
    nota: "Disponibles",
    items: [
      {
        id: "fuerza",
        titulo: "Mi fuerza",
        descripcion: "Tus métricas de pecho y sentadilla",
        icono: "fuerza",
        href: "/fuerza",
        disponible: true,
      },
      {
        id: "composicion",
        titulo: "Mi composición corporal",
        descripcion: "Pliegues y composición corporal",
        icono: "composicion",
        href: "/pliegues",
        disponible: true,
      },
      {
        id: "encuestas",
        titulo: "Encuestas",
        descripcion: "Post partido y wellness",
        icono: "encuestas",
        href: "/encuestas",
        disponible: true,
      },
    ],
  },
  {
    seccion: "Torneo",
    nota: "Disponible",
    items: [
      {
        id: "torneo",
        titulo: "Promocional 2026",
        descripcion: "Estadísticas del torneo y tu rendimiento",
        icono: "torneo",
        href: "/torneo",
      },
    ],
  },
  {
    seccion: "Ajustes",
    items: [
      {
        id: "notificaciones",
        titulo: "Notificaciones",
        descripcion: "Activar avisos del cuerpo técnico",
        icono: "campana",
        tono: "navy",
        href: "/notificaciones",
        disponible: false,
        aviso: "Las notificaciones se activarán en una próxima versión",
      },
    ],
  },
  {
    seccion: "Próximamente",
    nota: "En desarrollo",
    items: [
      {
        id: "velocidad",
        titulo: "Mi velocidad",
        descripcion: "Sprints y aceleración",
        icono: "velocidad",
        tono: "navy",
        href: "#",
        disponible: false,
        pronto: true,
      },
      {
        id: "resistencia",
        titulo: "Mi resistencia",
        descripcion: "Capacidad aeróbica y recuperación",
        icono: "corazon",
        tono: "navy",
        href: "#",
        disponible: false,
        pronto: true,
      },
    ],
  },
];

const MENU_TECNICO = [
  {
    seccion: "Análisis y métricas",
    items: [
      {
        id: "analisis",
        titulo: "Análisis Plantel 2026",
        descripcion:
          "Dashboard completo con KPIs de fuerza, pliegues, composición corporal y evolución del plantel.",
        icono: "dashboard",
        tono: "navy",
        href: "/panel/analisis",
        etiquetas: ["Dashboard", "Fuerza", "Pliegues", "Evolución"],
      },
      {
        id: "fuerza",
        titulo: "Fuerza",
        descripcion:
          "Historial completo de testeos de sentadilla y press de pecho. Todos los registros en formato tabla.",
        icono: "fuerza",
        tono: "blue",
        href: "/panel/fuerza",
        etiquetas: ["Historial", "Sentadilla", "Pecho"],
      },
      {
        id: "pliegues",
        titulo: "Pliegues y composición",
        descripcion:
          "Historial completo de mediciones de pliegues, pesajes y composición corporal en formato tabla.",
        icono: "ondas",
        tono: "pink",
        href: "/panel/pliegues",
        etiquetas: ["Historial", "Pliegues", "Peso"],
      },
    ],
  },
  {
    seccion: "Gestión del plantel",
    items: [
      {
        id: "jugadores",
        titulo: "Jugadores",
        descripcion:
          "Fichas individuales de cada jugador. Datos personales, posición, pierna hábil, historial de métricas y observaciones.",
        icono: "usuarios",
        tono: "green",
        href: "/panel/jugadores",
        etiquetas: ["Fichas", "Datos personales", "Historial"],
      },
      {
        id: "lesiones",
        titulo: "Lesiones",
        descripcion:
          "Registro y seguimiento de lesiones. Tipo, zona, severidad, días de baja estimados y estado de recuperación.",
        icono: "lesiones",
        tono: "red",
        href: "/panel/lesiones",
        etiquetas: ["Registro", "Seguimiento", "Recuperación"],
        disponible: false,
        pronto: true,
      },
      {
        id: "encuestas",
        titulo: "Encuestas",
        descripcion:
          "Encuestas post partido y wellness. Carga física, emocional, molestias, sueño, fatiga y dolor muscular.",
        icono: "encuestas",
        tono: "orange",
        href: "/panel/encuestas",
        etiquetas: ["Post partido", "Wellness", "Bienestar"],
      },
      {
        id: "cargar-partido",
        titulo: "Cargar partido",
        descripcion:
          "Registrar formación, capitán, resultado, minutos y estadísticas individuales de cada partido.",
        icono: "globo",
        tono: "purple",
        href: "/panel/cargar-partido",
        etiquetas: ["Formación", "Resultado", "Estadísticas"],
        disponible: false,
        soloAdmin: true,
      },
    ],
  },
  {
    seccion: "Torneo",
    items: [
      {
        id: "partidos",
        titulo: "Partidos",
        descripcion:
          "Resultados de todos los partidos de Hacoaj. Formación, goles, cambios y detalle individual por partido.",
        icono: "globo",
        tono: "green",
        href: "/panel/partidos",
        etiquetas: ["Resultados", "Formación", "Detalle"],
      },
      {
        id: "posiciones",
        titulo: "Posiciones",
        descripcion:
          "Tabla de posiciones de ambas zonas del Promocional 2026.",
        icono: "tabla",
        tono: "navy",
        href: "/panel/posiciones",
        etiquetas: ["Zona A", "Zona B", "Clasificación"],
      },
      {
        id: "fixture",
        titulo: "Fixture",
        descripcion:
          "Fixture completo del torneo con resultados, fechas, horarios y árbitros. Filtro por zona y equipo.",
        icono: "calendario",
        tono: "blue",
        href: "/panel/fixture",
        etiquetas: ["Resultados", "Calendario", "35 fechas"],
      },
      {
        id: "goleadores",
        titulo: "Goleadores",
        descripcion:
          "Ranking de goleadores del torneo. Se destacan los jugadores de Hacoaj en la tabla.",
        icono: "globo",
        tono: "orange",
        href: "/panel/goleadores",
        etiquetas: ["Ranking", "Goles", "Torneo"],
      },
    ],
  },
  {
    seccion: "Operaciones",
    items: [
      {
        id: "cargar-datos",
        titulo: "Cargar datos",
        descripcion:
          "Subir resultados de testeos de fuerza, pliegues, pesajes y encuestas post partido al sistema.",
        icono: "subir",
        tono: "purple",
        href: "/panel/cargar-datos",
        etiquetas: ["Fuerza", "Pliegues", "Peso", "Encuestas"],
        disponible: false,
      },
      {
        id: "calendario",
        titulo: "Calendario",
        descripcion:
          "Calendario de partidos, entrenamientos, testeos programados y eventos del equipo.",
        icono: "calendarioPunto",
        tono: "blue",
        href: "/panel/calendario",
        etiquetas: ["Partidos", "Entrenamientos", "Testeos"],
        disponible: false,
      },
      {
        id: "configuracion",
        titulo: "Configuración",
        descripcion:
          "Ajustes del sistema, gestión de usuarios y permisos de acceso.",
        icono: "config",
        tono: "gris",
        href: "/panel/configuracion",
        etiquetas: ["Usuarios", "Permisos"],
        disponible: false,
      },
      {
        id: "analytics",
        titulo: "Analytics",
        descripcion:
          "Actividad de los usuarios en la app: páginas visitadas, duración y frecuencia de uso.",
        icono: "barras",
        tono: "purple",
        href: "/panel/analytics",
        etiquetas: ["Page views", "Usuarios", "Actividad"],
        disponible: false,
        soloAdmin: true,
      },
    ],
  },
];

// Devuelve el menú del panel técnico ya filtrado según el rol: las opciones
// marcadas `soloAdmin` solo las ve el administrador.
export function menuTecnicoParaRol(rol) {
  return MENU_TECNICO.map((seccion) => ({
    ...seccion,
    items: seccion.items.filter((item) => !item.soloAdmin || rol === "administrador"),
  }));
}

// Botones de "Acceso rápido" del panel técnico (los mismos que traía la v1 por
// defecto). Se activan cuando exista la pantalla a la que apuntan.
export const ACCESOS_RAPIDOS = [
  { id: "dashboard", titulo: "Ver Dashboard", icono: "dashboard", href: "/panel/analisis", disponible: true },
  { id: "cargar", titulo: "Cargar datos", icono: "flechaArriba", href: "/panel/cargar-datos", disponible: false },
  { id: "post-partido", titulo: "Post partido", icono: "encuestas", href: "/panel/encuestas/post-partido", disponible: true },
  { id: "wellness", titulo: "Wellness", icono: "corazon", href: "/panel/encuestas/wellness", disponible: true },
  { id: "notificacion", titulo: "Enviar notificación", icono: "campana", href: "/panel/notificaciones", disponible: false },
];
