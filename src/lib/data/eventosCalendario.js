// Escritura de los eventos propios del calendario (tabla `eventos_calendario`).
// Es un archivo aparte de `calendario.js` porque lo usa el navegador y ese otro
// trae los datos de prueba del plantel. Solo el cuerpo técnico puede escribir
// (lo hace cumplir la base con RLS).

export const ICONOS_EVENTO = [
  { valor: "reunion", etiqueta: "Reunión", emoji: "📋" },
  { valor: "entrenamiento", etiqueta: "Entreno", emoji: "🏃" },
  { valor: "medico", etiqueta: "Médico", emoji: "🏥" },
  { valor: "evento", etiqueta: "Evento", emoji: "📌" },
];

export const EMOJI_EVENTO = Object.fromEntries(ICONOS_EVENTO.map((i) => [i.valor, i.emoji]));

// Devuelve { ok: true } o { ok: false, error }.
export async function agregarEvento(supabase, { fecha, titulo, icono }) {
  const { error } = await supabase
    .from("eventos_calendario")
    .insert({ fecha, titulo: titulo.trim(), icono });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function borrarEvento(supabase, id) {
  const { error } = await supabase.from("eventos_calendario").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
