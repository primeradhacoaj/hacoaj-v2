// CAPA DE DATOS de fuerza. Las pantallas llaman a estas funciones sin saber de
// dónde salen los datos. Hoy devuelven DATOS DE PRUEBA (ficticios); con
// Supabase se cambia el interior de cada función.
//
// La forma de la respuesta es la misma que devolvía `/api/mi-fuerza` en la v1
// (con los mismos nombres de campo), para poder reutilizar la lógica de la
// pantalla tal cual.

// Devuelve la última y la penúltima medición de pecho y sentadilla del jugador.
// `pecho_prev` / `sentadilla_prev` pueden ser null si hay un solo registro.
export async function obtenerMiFuerza(usuario) {
  await new Promise((resolver) => setTimeout(resolver, 500)); // simula la red

  // De momento todos los jugadores ven los mismos datos de prueba.
  void usuario;

  return {
    status: "success",
    peso_corporal: 86,
    pecho: {
      "VMP PECHO": 0.42,
      "C EXTERNA PECHO": 80,
      "RM ESTIMADO PECHO": 104,
      "F RELATIVA (1,3) PECHO": 1.2,
      "Fecha Pecho": "15/08/2026",
      PC: 86,
      Comentario:
        "Muy buena progresión en el press de pecho. Seguimos con el plan y en 4 semanas volvemos a medir.",
    },
    pecho_prev: {
      "VMP PECHO": 0.4,
      "C EXTERNA PECHO": 75,
      "RM ESTIMADO PECHO": 98,
      "F RELATIVA (1,3) PECHO": 1.14,
      "Fecha Pecho": "15/06/2026",
      PC: 86,
      Comentario: "",
    },
    sentadilla: {
      "VMP SENTADILLA": 0.61,
      "C EXTERNA SENT": 120,
      "RM ESTIMADO SENT": 150,
      "F RELATIVA (1,8/2) SENT": 1.74,
      "Fecha Sent": "15/08/2026",
      PC: 86,
      Comentario: "",
    },
    sentadilla_prev: {
      "VMP SENTADILLA": 0.58,
      "C EXTERNA SENT": 110,
      "RM ESTIMADO SENT": 141,
      "F RELATIVA (1,8/2) SENT": 1.64,
      "Fecha Sent": "15/06/2026",
      PC: 86,
      Comentario: "",
    },
  };
}

// Devuelve TODAS las mediciones de pecho y sentadilla del jugador, de la más
// nueva a la más vieja (mismos nombres de campo que `/api/mi-historial-fuerza`
// de la v1). Datos de prueba ficticios.
export async function obtenerMiHistorialFuerza(usuario) {
  await new Promise((resolver) => setTimeout(resolver, 500)); // simula la red
  void usuario;

  const fechas = ["15/08/2026", "15/06/2026", "12/04/2026", "10/02/2026", "05/12/2025"];
  const pesos = [86, 86, 85, 85, 84];

  const pecho = [
    [80, 0.42, 104, 1.2],
    [75, 0.4, 98, 1.14],
    [70, 0.38, 92, 1.08],
    [65, 0.36, 86, 1.01],
    [60, 0.35, 80, 0.95],
  ].map(([carga, vmp, rm, relativa], i) => ({
    "Fecha Pecho": fechas[i],
    Peso: pesos[i],
    "Fecha peso": fechas[i],
    PC: pesos[i],
    "C EXTERNA PECHO": carga,
    "VMP PECHO": vmp,
    "RM ESTIMADO PECHO": rm,
    "F RELATIVA (1,3) PECHO": relativa,
  }));

  const sentadilla = [
    [120, 0.61, 150, 1.74],
    [110, 0.58, 141, 1.64],
    [100, 0.55, 130, 1.53],
    [95, 0.52, 121, 1.42],
    [90, 0.5, 112, 1.33],
  ].map(([carga, vmp, rm, relativa], i) => ({
    "Fecha Sent": fechas[i],
    Peso: pesos[i],
    "Fecha peso": fechas[i],
    PC: pesos[i],
    "C EXTERNA SENT": carga,
    "VMP SENTADILLA": vmp,
    "RM ESTIMADO SENT": rm,
    "F RELATIVA (1,8/2) SENT": relativa,
  }));

  return { status: "success", pecho, sentadilla };
}
