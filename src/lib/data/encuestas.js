// CAPA DE DATOS de encuestas. Las pantallas llaman a estas funciones sin saber
// dónde se guardan las respuestas. Hoy NO guardan nada de verdad (son datos de
// prueba): validan y responden "ok". Con Supabase se cambia el interior de cada
// función para insertar las filas en la base.
//
// Las respuestas tienen la misma forma que recibían `/api/guardar-wellness` y
// `/api/guardar-post-partido` en la v1.

const esperar = (milisegundos) =>
  new Promise((resolver) => setTimeout(resolver, milisegundos));

// Guarda la encuesta de wellness: sueño, estrés, fatiga y dolor (del 1 al 10) y un comentario.
// Devuelve { status: "success" | "error", message }.
export async function guardarWellness(usuario, datos) {
  await esperar(500); // simula la red
  void usuario;

  const faltan = ["sueno", "estres", "fatiga", "dolor"].some((campo) => !datos[campo]);
  if (faltan) return { status: "error", message: "Faltan respuestas de la encuesta" };

  return { status: "success", message: "Wellness guardado correctamente" };
}

// Guarda la encuesta post partido. Si hubo golpes o molestias, en la base se
// graba una fila por cada uno; si no hubo, una sola fila con "No".
// Devuelve { status: "success" | "error", message }.
export async function guardarPostPartido(usuario, datos) {
  await esperar(500); // simula la red
  void usuario;

  const faltan = ["fecha_partido", "llegada", "emocional", "fisica"].some(
    (campo) => !datos[campo],
  );
  if (faltan) return { status: "error", message: "Faltan respuestas de la encuesta" };

  return { status: "success", message: "Encuesta guardada correctamente" };
}
