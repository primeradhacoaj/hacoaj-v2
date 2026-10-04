// CAPA DE DATOS de las tablas del torneo que publica soloascenso.com.ar: posiciones,
// goleadores y fixture, leídas de Supabase (`torneo_posiciones`, `torneo_goleadores`
// y `torneo_partidos`). En la v1 eran tres JSON (`data/*.json`) que actualizaba el
// scraper; devuelven lo mismo que `_leer_posiciones`, `_leer_goleadores` y la pantalla
// del fixture de la v1 (todo como texto, para no tocar las pantallas).
//
// Reciben el cliente de Supabase como primer parámetro (ver `torneoDb.js`).

import { diaDe } from "./torneoDb";

function verificar({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

const esHacoaj = (nombre) => nombre.toLowerCase().includes("hacoaj");

// La temporada más reciente que tiene datos en una tabla.
async function ultimaTemporada(supabase, tabla) {
  const [fila] = verificar(
    await supabase.from(tabla).select("temporada").order("temporada", { ascending: false }).limit(1),
  );
  return fila?.temporada ?? null;
}

async function filasDePosiciones(supabase) {
  const temporada = await ultimaTemporada(supabase, "torneo_posiciones");
  if (temporada === null) return [];
  return verificar(
    await supabase.from("torneo_posiciones").select("*").eq("temporada", temporada).order("posicion"),
  );
}

// Tabla de posiciones de la temporada actual: { zona_a, zona_b }.
export async function obtenerPosiciones(supabase) {
  const filas = await filasDePosiciones(supabase);
  const deZona = (zona) =>
    filas
      .filter((f) => f.zona === zona)
      .map((f) => ({
        pos: String(f.posicion),
        nombre: f.equipo,
        pts: String(f.pts),
        j: String(f.j),
        g: String(f.g),
        e: String(f.e),
        p: String(f.p),
        gf: String(f.gf),
        gc: String(f.gc),
        dif: f.dif > 0 ? `+${f.dif}` : String(f.dif),
        es_hacoaj: esHacoaj(f.equipo),
      }));
  return { zona_a: deZona("A"), zona_b: deZona("B") };
}

// Ranking de goleadores de la temporada actual.
export async function obtenerGoleadores(supabase) {
  const temporada = await ultimaTemporada(supabase, "torneo_goleadores");
  if (temporada === null) return [];
  const filas = verificar(
    await supabase.from("torneo_goleadores").select("*").eq("temporada", temporada).order("posicion"),
  );
  return filas.map((g) => ({
    pos: String(g.posicion),
    jugador: g.jugador,
    equipo: g.equipo,
    goles: String(g.goles),
    es_hacoaj: esHacoaj(g.equipo),
  }));
}

// Fixture de la temporada actual: las fechas ordenadas, la lista de equipos para el
// filtro y la zona de cada equipo (sale de la tabla de posiciones).
export async function obtenerFixture(supabase) {
  const posiciones = await filasDePosiciones(supabase);
  const equipoZona = Object.fromEntries(posiciones.map((f) => [f.equipo, f.zona]));
  const anio = await anioDelFixture(supabase);
  if (anio === null) return { fechas: [], equipos: [], equipo_zona: equipoZona };

  const [partidos, proximos] = await Promise.all([
    supabase
      .from("torneo_partidos")
      .select("id, fecha, hora, jornada, equipo_local, equipo_visitante, goles_local, goles_visitante, arbitro")
      .gte("fecha", `${anio}-01-01`)
      .lte("fecha", `${anio}-12-31`)
      .order("fecha")
      .order("hora")
      .order("id")
      .then(verificar),
    // Los que todavía no se jugaron (sin síntesis, por eso no están en `torneo_partidos`).
    supabase
      .from("torneo_proximos")
      .select("id, fecha, hora, jornada, equipo_local, equipo_visitante, arbitro")
      .gte("fecha", `${anio}-01-01`)
      .lte("fecha", `${anio}-12-31`)
      .order("fecha")
      .order("hora")
      .order("id")
      .then(verificar),
  ]);

  const porJornada = new Map();
  const todos = [
    ...partidos,
    ...proximos.map((p) => ({ ...p, id: null, goles_local: null, goles_visitante: null })),
  ];
  for (const p of todos) {
    const jugado = p.goles_local !== null && p.goles_visitante !== null;
    const lista = porJornada.get(p.jornada) ?? [];
    lista.push({
      partido_id: p.id,
      fecha: p.fecha,
      hora_orden: p.hora ?? "",
      dia: diaDe(p.fecha),
      hora: p.hora ?? "",
      local: p.equipo_local,
      visitante: p.equipo_visitante,
      goles_local: jugado ? String(p.goles_local) : "",
      goles_visitante: jugado ? String(p.goles_visitante) : "",
      arbitro: p.arbitro ?? "",
      jugado,
      es_hacoaj_local: esHacoaj(p.equipo_local),
      es_hacoaj_visit: esHacoaj(p.equipo_visitante),
    });
    porJornada.set(p.jornada, lista);
  }

  // Dentro de cada fecha, por día y hora; `fecha` y `hora_orden` solo sirven para ordenar.
  const fechas = [...porJornada.entries()]
    .sort(([a], [b]) => a - b)
    .map(([jornada, lista]) => [
      String(jornada),
      lista
        .sort((x, y) => (x.fecha + x.hora_orden).localeCompare(y.fecha + y.hora_orden))
        .map(({ fecha: _fecha, hora_orden: _hora, ...partido }) => partido),
    ]);
  const equipos = (Object.keys(equipoZona).length > 0
    ? Object.keys(equipoZona)
    : [...new Set(partidos.flatMap((p) => [p.equipo_local, p.equipo_visitante]))]
  ).sort((a, b) => a.localeCompare(b, "es"));
  return { fechas, equipos, equipo_zona: equipoZona };
}

async function anioDelFixture(supabase) {
  const [fila] = verificar(
    await supabase.from("torneo_partidos").select("fecha").order("fecha", { ascending: false }).limit(1),
  );
  return fila ? Number(fila.fecha.slice(0, 4)) : null;
}
