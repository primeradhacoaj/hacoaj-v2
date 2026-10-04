// CAPA DE DATOS de los partidos de Hacoaj, leída de Supabase (tablas
// `partidos_hacoaj*`, las que carga el administrador).
//
// Todas las funciones reciben el cliente de Supabase como primer parámetro:
// las páginas del servidor le pasan `await createClient()` de
// `@/lib/supabase/server`, y los componentes del navegador el de
// `@/lib/supabase/client`. Así la misma función sirve para los dos lados.
//
// La forma de las respuestas es la que tenía el mock (que copiaba las hojas
// "Partidos" y "Partidos-jugador" de la v1), para no tocar las pantallas.
//
// El resumen del detalle (línea de tiempo y disciplina) suma a lo que carga el club los
// eventos del RIVAL, que salen del scraper de soloascenso (`torneo_*`) a través de
// `partidos_hacoaj.partido_torneo_id`. Como en la v1, solo se toman los que no son de Hacoaj.

// Cómo figura Hacoaj en los eventos de soloascenso.
const ABREVIATURA_HACOAJ = "NÁU";

export const resultadoDe = (golesHacoaj, golesRival) =>
  golesHacoaj > golesRival ? "score-win" : golesHacoaj === golesRival ? "score-draw" : "score-loss";

function verificar({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// id -> nombre de todos los jugadores (vista `plantel`: solo nombre y posición).
async function nombresDelPlantel(supabase) {
  const filas = verificar(await supabase.from("plantel").select("id, nombre"));
  return new Map(filas.map((f) => [f.id, f.nombre]));
}

// Goles, cambios y tarjetas del rival según el scraper (vacío si el partido no está vinculado).
async function eventosDelRival(supabase, partidoTorneoId) {
  if (!partidoTorneoId) return { goles: [], cambios: [], tarjetas: [] };
  const delRival = "equipo_abrev.is.null,equipo_abrev.neq." + ABREVIATURA_HACOAJ;
  const [goles, cambios, tarjetas] = await Promise.all([
    supabase.from("torneo_goles").select("jugador_nombre, minuto, en_contra").eq("partido_id", partidoTorneoId).or(delRival).then(verificar),
    supabase.from("torneo_cambios").select("jugador_entra, jugador_sale, minuto").eq("partido_id", partidoTorneoId).or(delRival).then(verificar),
    supabase.from("torneo_tarjetas").select("jugador_nombre, tipo").eq("partido_id", partidoTorneoId).or(delRival).then(verificar),
  ]);
  return { goles, cambios, tarjetas };
}

// Lista de todos los partidos de Hacoaj, del más nuevo al más viejo.
export async function obtenerPartidosHacoaj(supabase) {
  const filas = verificar(
    await supabase
      .from("partidos_hacoaj")
      .select("fecha, rival, condicion, goles_hacoaj, goles_rival, formacion")
      .order("fecha", { ascending: false }),
  );
  return filas.map((p) => ({
    fecha_raw: p.fecha,
    rival: p.rival,
    condicion: p.condicion,
    goles_hacoaj: p.goles_hacoaj,
    goles_rival: p.goles_rival,
    resultado_clase: resultadoDe(p.goles_hacoaj, p.goles_rival),
    formacion: p.formacion,
  }));
}

// Detalle de un partido (`fecha` como "2026-05-23"): datos, jugadores, resumen
// y multimedia. `partido` es null si no existe.
export async function obtenerDetallePartido(supabase, fecha) {
  const partido = verificar(
    await supabase.from("partidos_hacoaj").select("*").eq("fecha", fecha).maybeSingle(),
  );
  if (!partido) return { partido: null };

  const [jugadores, goles, cambios, tarjetas, multimedia, nombres, rival] = await Promise.all([
    supabase.from("partidos_hacoaj_jugadores").select("*").eq("partido_id", partido.id).then(verificar),
    supabase.from("partidos_hacoaj_goles").select("*").eq("partido_id", partido.id).order("minuto").then(verificar),
    supabase.from("partidos_hacoaj_cambios").select("*").eq("partido_id", partido.id).order("minuto").then(verificar),
    supabase.from("partidos_hacoaj_tarjetas").select("*").eq("partido_id", partido.id).order("minuto").then(verificar),
    supabase.from("partidos_hacoaj_multimedia").select("*").eq("partido_id", partido.id).order("creado_en").then(verificar),
    nombresDelPlantel(supabase),
    eventosDelRival(supabase, partido.partido_torneo_id),
  ]);

  const nombre = (id) => (id ? (nombres.get(id) ?? "") : "");

  // Una fila por jugador, con los totales y textos que armaba la planilla.
  const jugadores_data = jugadores
    .map((j) => {
      const susGoles = goles.filter((g) => g.perfil_id === j.perfil_id && !g.en_contra);
      const entro = cambios.find((c) => c.jugador_entra_id === j.perfil_id);
      const salio = cambios.find((c) => c.jugador_sale_id === j.perfil_id);
      const tarjetasDe = tarjetas.filter((t) => t.perfil_id === j.perfil_id);
      return {
        jugador: nombre(j.perfil_id),
        posicion: j.posicion_partido ?? "",
        titular: j.titular,
        minutos: j.minutos_jugados,
        goles: susGoles.length,
        asistencias: goles.filter((g) => g.asistencia_de_id === j.perfil_id).length,
        amarillas: tarjetasDe.filter((t) => t.tipo === "amarilla").length,
        rojas: tarjetasDe.filter((t) => t.tipo === "roja").length,
        ingreso_por: nombre(entro?.jugador_sale_id),
        salio_por: nombre(salio?.jugador_entra_id),
        asistencia_de: susGoles.map((g) => nombre(g.asistencia_de_id)).join(","),
        minuto_gol: susGoles.map((g) => g.minuto ?? "").join(","),
      };
    })
    .sort((a, b) => Number(b.titular) - Number(a.titular) || a.jugador.localeCompare(b.jugador, "es"));

  // Línea de tiempo: lo de Hacoaj más lo del rival.
  const eventos = [
    ...goles.map((g) => ({
      min: g.minuto,
      tipo: "gol",
      jugador: nombre(g.perfil_id),
      // un gol en contra de un jugador de Hacoaj le suma al rival
      equipo: g.en_contra ? "rival" : "hacoaj",
      asistencia: nombre(g.asistencia_de_id),
      enContra: g.en_contra,
    })),
    ...cambios.map((c) => ({
      min: c.minuto,
      tipo: "cambio",
      entra: nombre(c.jugador_entra_id),
      sale: nombre(c.jugador_sale_id),
      equipo: "hacoaj",
    })),
    ...rival.goles.map((g) => ({
      min: g.minuto,
      tipo: "gol",
      jugador: g.jugador_nombre ?? "",
      equipo: "rival",
      asistencia: "",
      enContra: g.en_contra,
    })),
    ...rival.cambios.map((c) => ({
      min: c.minuto,
      tipo: "cambio",
      entra: c.jugador_entra ?? "",
      sale: c.jugador_sale ?? "",
      equipo: "rival",
    })),
  ].sort((a, b) =>
    (a.min === null) !== (b.min === null) ? (a.min === null ? -1 : 1) : (b.min ?? 0) - (a.min ?? 0),
  );

  const disciplina = [
    ...tarjetas.map((t) => ({ tipo: t.tipo, jugador: nombre(t.perfil_id), equipo: "hacoaj" })),
    ...rival.tarjetas.map((t) => ({ tipo: t.tipo, jugador: t.jugador_nombre ?? "", equipo: "rival" })),
  ];

  return {
    partido: {
      ...partido,
      fecha_raw: partido.fecha,
      capitan: nombre(partido.capitan_id),
      resultado_clase: resultadoDe(partido.goles_hacoaj, partido.goles_rival),
    },
    jugadores_data,
    videos: multimedia
      .filter((m) => m.tipo === "video")
      .map((m) => ({ id: m.id, drive_id: m.drive_id, titulo: m.titulo })),
    links: multimedia
      .filter((m) => m.tipo === "link")
      .map((m) => ({ id: m.id, titulo: m.titulo, url: m.url })),
    resumen_eventos: eventos,
    resumen_disciplina: disciplina,
  };
}

// Estadísticas del jugador logueado en el torneo: cruza los partidos de Hacoaj
// con lo que hizo en cada uno (misma cuenta que la v1). `resumen` es null si no
// hay partidos. Pensada para usarse desde el navegador, con la sesión del jugador.
export async function obtenerEstadisticasJugador(supabase, posicion) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { resumen: null, partidos: [] };

  const perfil = verificar(
    await supabase.from("perfiles").select("id").eq("auth_user_id", user.id).maybeSingle(),
  );
  if (!perfil) return { resumen: null, partidos: [] };
  const yo = perfil.id;

  const [partidos, filas, goles, asistencias, tarjetas] = await Promise.all([
    supabase.from("partidos_hacoaj").select("id, fecha, rival, condicion, goles_hacoaj, goles_rival").order("fecha", { ascending: false }).then(verificar),
    supabase.from("partidos_hacoaj_jugadores").select("*").eq("perfil_id", yo).then(verificar),
    supabase.from("partidos_hacoaj_goles").select("partido_id").eq("perfil_id", yo).eq("en_contra", false).then(verificar),
    supabase.from("partidos_hacoaj_goles").select("partido_id").eq("asistencia_de_id", yo).then(verificar),
    supabase.from("partidos_hacoaj_tarjetas").select("partido_id, tipo").eq("perfil_id", yo).then(verificar),
  ]);

  if (partidos.length === 0) return { resumen: null, partidos: [] };

  const cuenta = (lista, partidoId, filtro = () => true) =>
    lista.filter((x) => x.partido_id === partidoId && filtro(x)).length;

  const esArquero = (posicion ?? "").toLowerCase() === "arquero";
  const suma = {
    citaciones: 0, partidosJugados: 0, titularidades: 0, desdeBanco: 0, minTitular: 0, minSuplente: 0,
    goles: 0, asistencias: 0, amarillas: 0, rojas: 0, golesRecibidos: 0, partidosArquero: 0,
  };

  const detallados = partidos.map((p) => {
    const fila = filas.find((f) => f.partido_id === p.id);
    const citado = Boolean(fila);
    const minutos = fila?.minutos_jugados ?? 0;
    const golesDelPartido = cuenta(goles, p.id);
    const asistenciasDelPartido = cuenta(asistencias, p.id);
    const amarillas = cuenta(tarjetas, p.id, (t) => t.tipo === "amarilla");
    const rojas = cuenta(tarjetas, p.id, (t) => t.tipo === "roja");

    if (fila) {
      suma.citaciones++;
      if (minutos > 0) {
        suma.partidosJugados++;
        if (fila.titular) {
          suma.titularidades++;
          suma.minTitular += minutos;
        } else {
          suma.desdeBanco++;
          suma.minSuplente += minutos;
        }
      }
      suma.goles += golesDelPartido;
      suma.asistencias += asistenciasDelPartido;
      suma.amarillas += amarillas;
      suma.rojas += rojas;
      if (esArquero && fila.titular) {
        suma.partidosArquero++;
        suma.golesRecibidos += p.goles_rival;
      }
    }

    return {
      fecha_raw: p.fecha,
      rival: p.rival || "—",
      condicion: p.condicion || "—",
      goles_hacoaj: p.goles_hacoaj,
      goles_rival: p.goles_rival,
      resultado_clase: resultadoDe(p.goles_hacoaj, p.goles_rival),
      posicion: fila?.posicion_partido || "—",
      titular: fila?.titular ?? false,
      minutos,
      goles: fila ? golesDelPartido : 0,
      asistencias: fila ? asistenciasDelPartido : 0,
      amarillas: fila ? amarillas : 0,
      rojas: fila ? rojas : 0,
      citado,
    };
  });

  const minutosTotales = suma.minTitular + suma.minSuplente;
  return {
    resumen: {
      partidos_hacoaj: partidos.length,
      partidos_jugados: suma.partidosJugados,
      citaciones: suma.citaciones,
      titularidades: suma.titularidades,
      desde_banco: suma.desdeBanco,
      minutos_totales: minutosTotales,
      minutos_titular: suma.minTitular,
      minutos_suplente: suma.minSuplente,
      promedio_minutos: suma.partidosJugados > 0 ? Math.round(minutosTotales / suma.partidosJugados) : 0,
      goles: suma.goles,
      asistencias: suma.asistencias,
      amarillas: suma.amarillas,
      rojas: suma.rojas,
      es_arquero: esArquero,
      goles_recibidos: suma.golesRecibidos,
      goles_recibidos_pp:
        suma.partidosArquero > 0 ? Number((suma.golesRecibidos / suma.partidosArquero).toFixed(2)) : 0,
    },
    partidos: detallados,
  };
}

// ── Cargar partido (solo administrador) ─────────────────────────────────────

// Lo que necesita la pantalla "Cargar partido": los rivales posibles (equipos del torneo, sin
// Hacoaj ni AFA) y los jugadores activos del plantel con su foto (sin la cuenta de prueba).
export async function obtenerOpcionesCargarPartido(supabase) {
  const [equipos, perfiles] = await Promise.all([
    supabase.from("torneo_equipos").select("nombre").order("nombre").then(verificar),
    supabase
      .from("perfiles")
      .select("id, nombre, foto_path, usuario")
      .eq("rol", "jugador")
      .eq("estado", "activo")
      .order("nombre")
      .then(verificar),
  ]);

  return {
    rivales: equipos.map((e) => e.nombre).filter((n) => !/hacoaj/i.test(n) && n !== "AFA"),
    jugadores: perfiles
      .filter((p) => p.usuario !== "hacoaj")
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        foto: p.foto_path ? supabase.storage.from("avatares").getPublicUrl(p.foto_path).data.publicUrl : null,
      })),
  };
}

// Guarda el partido completo (partido, jugadores, goles, cambios y tarjetas) en una sola
// transacción de la base. Devuelve { ok: true } o { ok: false, error: "mensaje para mostrar" }.
export async function guardarPartidoHacoaj(supabase, partido) {
  const { error } = await supabase.rpc("guardar_partido_hacoaj", { p: partido });
  if (!error) return { ok: true };

  if (error.code === "23505") return { ok: false, error: "Ya hay un partido cargado en esa fecha" };
  if (error.code === "42501") return { ok: false, error: "Solo el administrador puede cargar partidos" };
  return { ok: false, error: "No se pudo guardar el partido. Revisá los datos e intentá de nuevo" };
}
