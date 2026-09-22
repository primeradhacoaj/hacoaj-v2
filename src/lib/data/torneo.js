// Datos de PRUEBA del torneo (ficticios). Misma forma que el `_leer_posiciones`
// de la v1: { zona_a, zona_b }, con cada fila como texto:
// pos, nombre, pts, j, g, e, p, gf, gc, dif, es_hacoaj.
// Con Supabase se cambia solo el interior de cada función.

import { generador } from "@/lib/azar";

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

// ── Goleadores ──────────────────────────────────────────────────────────────
// Misma forma que el `_leer_goleadores` de la v1.

const GOLEADORES = [
  ["Matías Ferreyra", "Racing de Boedo", 12],
  ["Lucas Benítez", "Club Atlético Ferrer", 10],
  ["Tomás Villalba", "Náutico Hacoaj", 9],
  ["Nicolás Ortega", "Club Estrella Azul", 9],
  ["Agustín Molina", "Deportivo Ribera", 8],
  ["Facundo Sosa", "Defensores de Pacheco", 8],
  ["Joaquín Peralta", "Social Los Álamos", 7],
  ["Franco Iglesias", "Racing de Boedo", 7],
  ["Bruno Acosta", "Comunicaciones Norte", 6],
  ["Ezequiel Correa", "Náutico Hacoaj", 6],
  ["Gonzalo Paz", "Unión del Sur", 6],
  ["Ignacio Rivas", "Sportivo Las Heras", 5],
  ["Santiago Luna", "Club Atlético Ferrer", 5],
  ["Martín Aguirre", "Deportivo Merlo Sur", 5],
  ["Julián Cabrera", "Juventud Unida", 4],
];

export async function obtenerGoleadores() {
  return GOLEADORES.map(([jugador, equipo, goles], indice) => ({
    pos: String(indice + 1),
    jugador,
    equipo,
    goles: String(goles),
    es_hacoaj: equipo.toLowerCase().includes("hacoaj"),
  }));
}

// ── Fixture ─────────────────────────────────────────────────────────────────
// Se arma con todos contra todos (método del círculo) entre los 16 equipos.
// Las primeras FECHAS_JUGADAS de 2026 ya tienen resultado. Los resultados salen
// de un generador con semilla fija: son siempre los mismos.

const FECHAS_JUGADAS = 12;
const ARBITROS = [
  "Manuel Prieto",
  "Tomás Aybar",
  "Martín Morenza",
  "Antonella Álvarez",
  "Facundo Carretero",
];
const HORAS = ["15:00", "15:30", "17:00", "17:30"];

function textoDia(fecha) {
  const dd = String(fecha.getUTCDate()).padStart(2, "0");
  const mm = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${String(fecha.getUTCFullYear()).slice(2)}`;
}

// Nombres de los 16 equipos (zona A y luego zona B).
export const NOMBRES_EQUIPOS = [...ZONA_A, ...ZONA_B].map((fila) => fila[0]);

// Arma las fechas de una temporada: [[número de fecha, [partidos]]].
// Opciones: `anio`, `semilla` de los resultados, `jugadas` (cuántas fechas ya
// tienen resultado) y `mezclar` (cambia el orden de los equipos).
export function armarFixture({ anio = 2026, semilla = 2026, jugadas = FECHAS_JUGADAS, mezclar = false } = {}) {
  const azar = generador(semilla);
  const equipos = [...NOMBRES_EQUIPOS];
  if (mezclar) {
    for (let i = equipos.length - 1; i > 0; i--) {
      const j = Math.floor(azar() * (i + 1));
      [equipos[i], equipos[j]] = [equipos[j], equipos[i]];
    }
  }
  const cantidad = equipos.length;
  const rotativos = equipos.slice(1);
  const fechas = [];

  for (let f = 0; f < cantidad - 1; f++) {
    const orden = [equipos[0], ...rotativos];
    const dia = textoDia(new Date(Date.UTC(anio, 4, 23 + f * 7)));
    const partidos = [];
    for (let i = 0; i < cantidad / 2; i++) {
      const a = orden[i];
      const b = orden[cantidad - 1 - i];
      // Quién es local: una moneda por partido. (El método del círculo deja
      // fijo el orden de los enfrentamientos; alternar con `f % 2` no alcanza,
      // porque el equipo en el índice 0 termina siempre del mismo lado.)
      const [local, visitante] = azar() < 0.5 ? [a, b] : [b, a];
      const jugado = f < jugadas;
      partidos.push({
        dia,
        hora: HORAS[i % HORAS.length],
        local,
        visitante,
        goles_local: jugado ? String(Math.floor(azar() * 3.4)) : "",
        goles_visitante: jugado ? String(Math.floor(azar() * 2.8)) : "",
        arbitro: ARBITROS[(f + i) % ARBITROS.length],
        jugado,
        es_hacoaj_local: local.toLowerCase().includes("hacoaj"),
        es_hacoaj_visit: visitante.toLowerCase().includes("hacoaj"),
      });
    }
    fechas.push([String(f + 1), partidos]);
    rotativos.unshift(rotativos.pop());
  }
  return fechas;
}

// Devuelve lo mismo que arma la pantalla de la v1: las fechas ordenadas, la
// lista de equipos para el filtro y la zona de cada equipo.
export async function obtenerFixture() {
  const fechas = armarFixture();
  const equipoZona = {};
  ZONA_A.forEach(([nombre]) => (equipoZona[nombre] = "A"));
  ZONA_B.forEach(([nombre]) => (equipoZona[nombre] = "B"));
  return {
    fechas,
    equipos: Object.keys(equipoZona).sort((a, b) => a.localeCompare(b, "es")),
    equipo_zona: equipoZona,
  };
}
