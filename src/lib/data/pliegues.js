// CAPA DE DATOS de pliegues. Las pantallas llaman a estas funciones sin saber
// de dónde salen los datos. Hoy devuelven DATOS DE PRUEBA (ficticios); con
// Supabase se cambia el interior de cada función.
//
// La forma de la respuesta es la misma que devolvía `/api/mi-pliegue` en la v1
// (con los mismos nombres de campo).

// Devuelve la última medición de pliegues del jugador, o `pliegue: null` con un
// mensaje si todavía no tiene ninguna.
export async function obtenerMiPliegue(usuario) {
  await new Promise((resolver) => setTimeout(resolver, 500)); // simula la red
  void usuario;

  return {
    status: "success",
    message: null,
    pliegue: {
      Jugador: "Juan Pérez",
      Peso: 78.5,
      Talla: 180, // en centímetros (en la v1 viene de la altura del jugador)
      IMC: 24.2,
      "pl tricipital": 9,
      "pl subescapular": 11,
      "pl supraespinal": 8,
      "pl abdominal": 14,
      "pl muslo": 12,
      "pl pantorrilla": 7,
      "sumatoria 6 pl": 61,
      "Peso ideal": 76,
      "Fecha pliegue": "15/08/2026",
      Comentario: "Bajar la sumatoria por debajo de 60 mm. Seguimos con las pautas de descenso.",
    },
  };
}
