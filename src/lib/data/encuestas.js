// CAPA DE DATOS de encuestas del jugador: guarda las respuestas en Supabase.
// Las pantallas llaman a estas funciones sin saber dónde se guardan.
//
// Las respuestas tienen la misma forma que recibían `/api/guardar-wellness` y
// `/api/guardar-post-partido` en la v1.
//
// El jugador no manda su id: la base le asigna el perfil de quien está
// logueado, y las políticas RLS impiden contestar a nombre de otro.

import { createClient } from "@/lib/supabase/client";

// "15/08/2026" (lo que manda el formulario) -> "2026-08-15" (lo que guarda la base)
function fechaIso(fechaCorta) {
  const [dia, mes, anio] = fechaCorta.split("/");
  return `${anio}-${mes}-${dia}`;
}

function mensajeDeError(error) {
  // 23505 = violación de una restricción unique (encuesta duplicada)
  if (error.code === "23505") return "Ya enviaste esta encuesta.";
  return error.message;
}

// Guarda la encuesta de wellness: sueño, estrés, fatiga y dolor (del 1 al 10) y un comentario.
// Devuelve { status: "success" | "error", message }.
export async function guardarWellness(datos) {
  const faltan = ["sueno", "estres", "fatiga", "dolor"].some((campo) => !datos[campo]);
  if (faltan) return { status: "error", message: "Faltan respuestas de la encuesta" };

  const { error } = await createClient()
    .from("wellness")
    .insert({
      sueno: Number(datos.sueno),
      estres: Number(datos.estres),
      fatiga: Number(datos.fatiga),
      dolor: Number(datos.dolor),
      comentario: datos.comentario || null,
    });

  if (error) return { status: "error", message: mensajeDeError(error) };
  return { status: "success", message: "Wellness guardado correctamente" };
}

// Guarda la encuesta post partido junto con sus golpes o molestias (si hubo),
// todo en una sola transacción: no puede quedar la encuesta sin sus golpes.
// Devuelve { status: "success" | "error", message }.
export async function guardarPostPartido(datos) {
  const faltan = ["fecha_partido", "llegada", "emocional", "fisica"].some(
    (campo) => !datos[campo],
  );
  if (faltan) return { status: "error", message: "Faltan respuestas de la encuesta" };

  const { error } = await createClient().rpc("guardar_post_partido", {
    p_fecha_partido: fechaIso(datos.fecha_partido),
    p_llegada: datos.llegada,
    p_emocional: datos.emocional,
    p_fisica: datos.fisica,
    p_categoria: datos.categoria || null,
    p_minutos: Number.isFinite(datos.minutos) ? datos.minutos : null,
    p_comentario: datos.comentario || null,
    p_golpes: datos.golpes ?? [],
  });

  if (error) return { status: "error", message: mensajeDeError(error) };
  return { status: "success", message: "Encuesta guardada correctamente" };
}
