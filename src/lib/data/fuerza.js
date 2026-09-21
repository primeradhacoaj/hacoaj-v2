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
