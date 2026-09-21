// Datos de PRUEBA del torneo (ficticios). Misma forma que el `_leer_posiciones`
// de la v1: { zona_a, zona_b }, con cada fila como texto:
// pos, nombre, pts, j, g, e, p, gf, gc, dif, es_hacoaj.
// Con Supabase se cambia solo el interior de cada función.

const ZONA_A = [
  ["Club Atlético Ferrer", 11, 4, 3, 31, 16],
  ["Náutico Hacoaj", 10, 5, 3, 28, 15],
  ["Deportivo Ribera", 10, 3, 5, 26, 20],
  ["Social Los Álamos", 9, 5, 4, 24, 19],
  ["Unión del Sur", 8, 6, 4, 22, 21],
  ["Sportivo Belgrano Norte", 7, 5, 6, 21, 23],
  ["Juventud Unida", 6, 4, 8, 18, 27],
  ["Atlético Villa Lía", 4, 3, 11, 14, 33],
];

const ZONA_B = [
  ["Racing de Boedo", 12, 4, 2, 33, 14],
  ["Club Estrella Azul", 10, 6, 2, 27, 13],
  ["Defensores de Pacheco", 9, 5, 4, 25, 19],
  ["Comunicaciones Norte", 8, 4, 6, 23, 22],
  ["Sportivo Las Heras", 7, 6, 5, 20, 21],
  ["Deportivo Merlo Sur", 6, 5, 7, 19, 24],
  ["Atlético San Justo", 5, 4, 9, 15, 28],
  ["Real Ituzaingó", 3, 5, 10, 12, 31],
];

// Arma las filas: calcula partidos jugados, puntos y diferencia de gol, y
// ordena por puntos, diferencia y goles a favor.
function armarZona(equipos) {
  return equipos
    .map(([nombre, g, e, p, gf, gc]) => ({
      nombre,
      g,
      e,
      p,
      gf,
      gc,
      j: g + e + p,
      pts: g * 3 + e,
      dif: gf - gc,
    }))
    .sort((a, b) => b.pts - a.pts || b.dif - a.dif || b.gf - a.gf)
    .map((fila, indice) => ({
      pos: String(indice + 1),
      nombre: fila.nombre,
      pts: String(fila.pts),
      j: String(fila.j),
      g: String(fila.g),
      e: String(fila.e),
      p: String(fila.p),
      gf: String(fila.gf),
      gc: String(fila.gc),
      dif: fila.dif > 0 ? `+${fila.dif}` : String(fila.dif),
      es_hacoaj: fila.nombre.toLowerCase().includes("hacoaj"),
    }));
}

export async function obtenerPosiciones() {
  return { zona_a: armarZona(ZONA_A), zona_b: armarZona(ZONA_B) };
}
