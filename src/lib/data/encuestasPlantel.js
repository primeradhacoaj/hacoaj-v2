// Respuestas de las encuestas de TODO el plantel (wellness y post partido) para
// el panel técnico, leídas de Supabase. En la v1 salían de las hojas de Google
// Sheets que llenaban los jugadores. La base solo deja leerlas al cuerpo técnico
// y al administrador (RLS); cada jugador ve únicamente las suyas.
//
// Reciben el cliente de Supabase del servidor (`@/lib/supabase/server`).

import { leerTodo } from "./leerTodo";

const ZONA = "America/Argentina/Buenos_Aires";

// Instante guardado en la base -> "dd/mm/aaaa" según la hora de Argentina.
function fechaArgentina(instante) {
  return new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(instante),
  );
}

// "2026-05-23" (columna `date`) -> "23/05/2026"
function fechaDeIso(fechaIso) {
  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}/${mes}/${anio}`;
}

// Respuestas de wellness de todo el plantel.
export async function obtenerWellnessPlantel(supabase) {
  const filas = await leerTodo(() =>
    supabase
      .from("wellness")
      .select("id, fecha, sueno, estres, fatiga, dolor, comentario, perfiles(nombre)")
      .order("fecha", { ascending: false })
      .order("id"),
  );
  return filas.map((w) => ({
    id: w.id,
    jugador: w.perfiles.nombre,
    fecha: fechaArgentina(w.fecha),
    sueno: w.sueno,
    estres: w.estres,
    fatiga: w.fatiga,
    dolor: w.dolor,
    comentario: w.comentario ?? "",
  }));
}

// Respuestas post partido de todo el plantel, cada una con sus golpes/molestias.
export async function obtenerPostPartidoPlantel(supabase) {
  const filas = await leerTodo(() =>
    supabase
      .from("post_partido")
      .select(
        "id, fecha_partido, llegada, carga_emocional, carga_fisica, categoria, minutos, comentario, perfiles(nombre), post_partido_golpes(tipo_golpe, ubicacion_golpe, lado_golpe, comentario_lesion)",
      )
      .order("fecha_partido", { ascending: false })
      .order("id"),
  );
  return filas.map((p) => ({
    id: p.id,
    jugador: p.perfiles.nombre,
    fechaPartido: fechaDeIso(p.fecha_partido),
    llegada: p.llegada,
    emocional: p.carga_emocional,
    fisica: p.carga_fisica,
    categoria: p.categoria ?? "",
    minutos: p.minutos === null ? "" : String(p.minutos),
    comentario: p.comentario ?? "",
    golpes: p.post_partido_golpes.map((g) => ({
      tipo: g.tipo_golpe,
      ubicacion: g.ubicacion_golpe ?? "",
      lado: g.lado_golpe ?? "",
      comentario: g.comentario_lesion ?? "",
    })),
  }));
}
