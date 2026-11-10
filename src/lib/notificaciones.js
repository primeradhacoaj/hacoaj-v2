// Reglas compartidas de las notificaciones push que envía el cuerpo técnico (las usan la pantalla y el servidor).

export const LARGO_MAXIMO_TITULO = 80;
export const LARGO_MAXIMO_MENSAJE = 200;

// Pantallas a las que puede llevar el aviso al tocarlo (rutas de la v2 de las que ofrecía la v1).
export const DESTINOS = [
  { url: "/menu", texto: "Menú principal" },
  { url: "/fuerza", texto: "Fuerza" },
  { url: "/pliegues", texto: "Pliegues" },
  { url: "/encuestas", texto: "Encuestas" },
  { url: "/rutinas", texto: "Rutinas" },
];

export const URLS_PERMITIDAS = DESTINOS.map((d) => d.url);

// Textos de arranque rápido (los mismos de la v1).
export const PLANTILLAS = [
  {
    nombre: "Mediciones listas",
    titulo: "Nueva medición disponible",
    mensaje: "Entrá a la app para ver tus últimos resultados de fuerza y pliegues.",
    url: "/fuerza",
  },
  {
    nombre: "Encuesta post",
    titulo: "Encuesta post partido",
    mensaje: "Completá la encuesta del último partido.",
    url: "/encuestas",
  },
  {
    nombre: "Testeo programado",
    titulo: "Nuevo testeo programado",
    mensaje: "Esta semana hay testeos de fuerza. Consultá los horarios.",
    url: "/rutinas",
  },
  {
    nombre: "Aviso general",
    titulo: "Aviso del cuerpo técnico",
    mensaje: "Hay un aviso nuevo del cuerpo técnico. Abrí la app para verlo.",
    url: "/menu",
  },
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Valida lo que llega a la API. Devuelve { ok: true, datos } o { ok: false, error }.
//   destinatarios: "todos" o una lista de ids de perfil
export function validarNotificacion({ titulo, mensaje, url, destinatarios }) {
  const t = String(titulo ?? "").trim();
  const m = String(mensaje ?? "").trim();
  if (!t || !m) return { ok: false, error: "Completá el título y el mensaje." };
  if (t.length > LARGO_MAXIMO_TITULO) return { ok: false, error: `El título admite hasta ${LARGO_MAXIMO_TITULO} caracteres.` };
  if (m.length > LARGO_MAXIMO_MENSAJE) return { ok: false, error: `El mensaje admite hasta ${LARGO_MAXIMO_MENSAJE} caracteres.` };
  if (!URLS_PERMITIDAS.includes(url)) return { ok: false, error: "La pantalla de destino no es válida." };

  let perfilIds = null;
  if (destinatarios !== "todos") {
    if (!Array.isArray(destinatarios) || destinatarios.length === 0 || destinatarios.length > 200) {
      return { ok: false, error: "Elegí al menos un jugador." };
    }
    if (!destinatarios.every((id) => typeof id === "string" && UUID.test(id))) {
      return { ok: false, error: "Hay un destinatario que no es válido." };
    }
    perfilIds = [...new Set(destinatarios)];
  }
  return { ok: true, datos: { titulo: t, mensaje: m, url, perfilIds } };
}
