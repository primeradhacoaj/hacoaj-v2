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

// Devuelve TODAS las mediciones de pliegues del jugador, de la más nueva a la
// más vieja (mismos nombres de campo que `/api/mis-pliegues` de la v1). Si no
// hay ninguna, devuelve una lista vacía y un mensaje. Datos de prueba ficticios.
export async function obtenerMisPliegues(usuario) {
  await new Promise((resolver) => setTimeout(resolver, 500)); // simula la red
  void usuario;

  const registros = [
    ["15/08/2026", 78.5, 61],
    ["15/06/2026", 78.2, 58.9],
    ["12/04/2026", 78.0, 55.8],
    ["10/02/2026", 77.4, 52],
    ["05/12/2025", 76.8, 48.5],
  ];

  return {
    status: "success",
    message: null,
    pliegues: registros.map(([fecha, peso, sumatoria]) => ({
      "Fecha pliegue": fecha,
      Peso: peso,
      "sumatoria 6 pl": sumatoria,
    })),
  };
}
