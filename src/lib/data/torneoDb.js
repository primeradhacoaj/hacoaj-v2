// CAPA DE DATOS del torneo (réplica de soloascenso.com.ar), leída de Supabase.
// En la v1 era el SQLite del scraper (`primera_d.db`): equipos, jugadores,
// partidos, apariciones, goles, tarjetas y cambios. Las funciones devuelven lo
// mismo que las respuestas `/api/torneo/...` de la v1 (mismos nombres de campos),
// así las pantallas no cambiaron.
//
// Todas reciben el cliente de Supabase como primer parámetro (el del servidor en
// las páginas, `@/lib/supabase/client` en los componentes del navegador).
// Los totales por equipo y jugador se suman en la base (funciones `torneo_plantel`,
// `torneo_stats_equipo` y `torneo_rankings`): son miles de apariciones.

function verificar({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// "HIGUAIN, JERÓNIMO TOMÁS" -> { apellido: "Higuain", nombreDisplay: "Jerónimo Tomás Higuain" }
const aTitulo = (texto) => texto.trim().toLowerCase().replace(/(^|[\s'-])(\S)/g, (_, antes, letra) => antes + letra.toUpperCase());

function nombresDe(nombreCompleto) {
  if (nombreCompleto.includes(",")) {
    const [apellido, nombres] = nombreCompleto.split(",", 2);
    return { apellido: aTitulo(apellido), nombreDisplay: `${aTitulo(nombres)} ${aTitulo(apellido)}` };
  }
  const palabras = nombreCompleto.split(/\s+/).filter(Boolean);
  return { apellido: palabras.at(-1) ?? nombreCompleto, nombreDisplay: nombreCompleto };
}

// "GAUNA STERIN, TOMÁS" -> "Tomás Gauna Sterin"
export const nombreNatural = (nombreCompleto) => nombresDe(nombreCompleto).nombreDisplay;

const numero = (v) => (v === null || v === undefined ? v : Number(v));

// Lista de equipos, por orden alfabético.
export async function obtenerEquipos(supabase) {
  const filas = verificar(await supabase.from("torneo_equipos").select("id, nombre").order("nombre"));
  return filas.map((e) => ({ equipo_id: e.id, nombre: e.nombre }));
}

// Plantel de un equipo con lo que jugó cada uno (en todas las temporadas).
export async function obtenerPlantel(supabase, equipoId) {
  const filas = verificar(await supabase.rpc("torneo_plantel", { p_equipo_id: equipoId }));
  return filas.map((j) => ({
    jugador_id: j.jugador_id,
    nombre_completo: j.nombre_completo,
    fecha_nacimiento: j.fecha_nacimiento,
    puesto: j.puesto,
    partidos: numero(j.partidos),
    titular: numero(j.titular),
    minutos: numero(j.minutos),
    goles: numero(j.goles),
    amarillas: numero(j.amarillas),
    rojas: numero(j.rojas),
  }));
}

// Estadísticas de un equipo en una temporada ("2026", "2025", … o "todos").
export async function obtenerStatsEquipo(supabase, equipoId, temporada = "2026") {
  const [s] = verificar(await supabase.rpc("torneo_stats_equipo", { p_equipo_id: equipoId, p_temporada: temporada }));
  if (!s) return null;

  const pj = numero(s.pj);
  const gf = numero(s.gf);
  const gc = numero(s.gc);
  const pts = numero(s.pg) * 3 + numero(s.pe);
  return {
    nombre: s.nombre,
    temporada,
    pj,
    pg: numero(s.pg),
    pe: numero(s.pe),
    pp: numero(s.pp),
    gf,
    gc,
    dif: gf - gc,
    pts,
    pct_pts: pj > 0 ? Number(((pts / (pj * 3)) * 100).toFixed(1)) : 0,
    goles_partido: pj > 0 ? Number((gf / pj).toFixed(2)) : 0,
    amarillas: numero(s.amarillas),
    rojas: numero(s.rojas),
  };
}

// Partidos de un equipo en una temporada, del más nuevo al más viejo.
export async function obtenerPartidosEquipo(supabase, equipoId, temporada = "2026") {
  const [equipo] = verificar(await supabase.from("torneo_equipos").select("nombre").eq("id", equipoId));
  if (!equipo) return [];

  let consulta = supabase
    .from("torneo_partidos")
    .select("id, fecha, equipo_local, equipo_visitante, goles_local, goles_visitante, estadio, arbitro, url")
    .or(`equipo_local.eq."${equipo.nombre}",equipo_visitante.eq."${equipo.nombre}"`)
    .not("goles_local", "is", null)
    .not("goles_visitante", "is", null)
    .order("fecha", { ascending: false })
    .order("id", { ascending: false });
  if (temporada !== "todos") {
    consulta = consulta.gte("fecha", `${temporada}-01-01`).lte("fecha", `${temporada}-12-31`);
  }

  return verificar(await consulta).map((p) => {
    const local = p.equipo_local === equipo.nombre;
    const gf = local ? p.goles_local : p.goles_visitante;
    const gc = local ? p.goles_visitante : p.goles_local;
    return {
      partido_id: p.id,
      fecha: p.fecha,
      rival: local ? p.equipo_visitante : p.equipo_local,
      condicion: local ? "Local" : "Visitante",
      gf,
      gc,
      resultado: gf > gc ? "V" : gf < gc ? "D" : "E",
      estadio: p.estadio,
      arbitro: p.arbitro,
      url: p.url,
    };
  });
}

// "2026-05-23" -> "23.05.26" (el formato del día en el fixture de la fuente)
export function diaDe(fechaIso) {
  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}.${mes}.${anio.slice(2)}`;
}

// Síntesis de un partido: goles, tarjetas, cambios y las dos formaciones.
export async function obtenerSintesisPartido(supabase, partidoId) {
  const [fila] = verificar(
    await supabase
      .from("torneo_partidos")
      .select("id, fecha, jornada, equipo_local, equipo_visitante, goles_local, goles_visitante, estadio, arbitro, url")
      .eq("id", partidoId),
  );
  if (!fila) return null;
  const { id, ...resto } = fila;
  const partido = { partido_id: id, ...resto };

  // La fuente deja el minuto vacío cuando no lo informa: esos eventos van primero (como en la v1).
  const porMinuto = { ascending: true, nullsFirst: true };
  const [goles, tarjetas, cambios, apariciones] = await Promise.all([
    supabase
      .from("torneo_goles")
      .select("jugador_nombre, equipo_abrev, minuto, en_contra")
      .eq("partido_id", partidoId)
      .order("minuto", porMinuto)
      .order("id"),
    supabase
      .from("torneo_tarjetas")
      .select("jugador_nombre, equipo_abrev, tipo, minuto")
      .eq("partido_id", partidoId)
      .order("minuto", porMinuto)
      .order("id"),
    supabase
      .from("torneo_cambios")
      .select("jugador_entra, jugador_sale, equipo_abrev, minuto")
      .eq("partido_id", partidoId)
      .order("minuto", porMinuto)
      .order("id"),
    supabase
      .from("torneo_apariciones")
      .select(
        "jugador_id, titular, numero_camiseta, posicion_partido, equipo_en_partido, minutos_jugados, goles, amarilla, roja, torneo_jugadores(nombre_completo)",
      )
      .eq("partido_id", partidoId)
      .order("titular", { ascending: false })
      .order("posicion_partido")
      .order("numero_camiseta"),
  ]);

  const formacion = (nombreEquipo) =>
    verificar(apariciones)
      .filter((a) => a.equipo_en_partido === nombreEquipo)
      .map(({ torneo_jugadores: jugador, ...a }) => {
        const { apellido, nombreDisplay } = nombresDe(jugador.nombre_completo);
        return {
          ...a,
          nombre_completo: jugador.nombre_completo,
          nombre_display: nombreDisplay,
          apellido,
        };
      });

  return {
    partido,
    goles: verificar(goles),
    tarjetas: verificar(tarjetas),
    cambios: verificar(cambios),
    formacion_local: formacion(partido.equipo_local),
    formacion_visitante: formacion(partido.equipo_visitante),
  };
}

// Ficha de un jugador: datos, resumen y cada partido que jugó.
export async function obtenerJugador(supabase, jugadorId) {
  const [jugador] = verificar(
    await supabase
      .from("torneo_jugadores")
      .select("id, nombre_completo, fecha_nacimiento, puesto, torneo_jugador_equipo(torneo_equipos(id, nombre))")
      .eq("id", jugadorId),
  );
  if (!jugador) return null;
  const equipo = jugador.torneo_jugador_equipo[0]?.torneo_equipos;

  const filas = verificar(
    await supabase
      .from("torneo_apariciones")
      .select(
        "partido_id, titular, minuto_ingreso, minuto_salida, minutos_jugados, goles, amarilla, roja, equipo_en_partido, numero_camiseta, posicion_partido, torneo_partidos(fecha, equipo_local, equipo_visitante, goles_local, goles_visitante)",
      )
      .eq("jugador_id", jugadorId),
  );
  const apariciones = filas
    .map(({ torneo_partidos: p, ...a }) => ({ ...a, ...p }))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.partido_id - a.partido_id));

  const suma = (campo) => apariciones.reduce((total, a) => total + (Number(a[campo]) || 0), 0);
  return {
    jugador: {
      jugador_id: jugador.id,
      nombre_completo: jugador.nombre_completo,
      fecha_nacimiento: jugador.fecha_nacimiento,
      puesto: jugador.puesto,
      equipo: equipo?.nombre ?? "",
      equipo_id: equipo?.id ?? null,
    },
    resumen: {
      partidos: apariciones.length,
      titular: apariciones.filter((a) => a.titular).length,
      minutos: suma("minutos_jugados"),
      goles: suma("goles"),
      amarillas: suma("amarilla"),
      rojas: suma("roja"),
    },
    apariciones,
  };
}

// Ranking de jugadores. `equipo`: id o "todos". `temporadas`: lista de años
// (["2026"]) o ["todos"]. Va de más a menos goles y, si empatan, minutos.
export async function obtenerRankings(supabase, { equipo = "todos", temporadas = ["2026"] } = {}) {
  const filas = verificar(
    await supabase.rpc("torneo_rankings", { p_equipo: String(equipo), p_temporadas: temporadas.map(String) }),
  );
  return filas.map((r) => ({
    jugador_id: r.jugador_id,
    nombre_completo: r.nombre_completo,
    puesto: r.puesto,
    equipo: r.equipo,
    equipo_id: r.equipo_id,
    partidos: numero(r.partidos),
    titular: numero(r.titular),
    minutos: numero(r.minutos),
    goles: numero(r.goles),
    amarillas: numero(r.amarillas),
    rojas: numero(r.rojas),
  }));
}
