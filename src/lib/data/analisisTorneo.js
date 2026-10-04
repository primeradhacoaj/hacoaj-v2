// Datos para la pestaña "Promocional 2026" del Dashboard de análisis: cómo le va a
// Hacoaj en el torneo (no el plantel de fuerza/pliegues, sino el rendimiento en los
// partidos). Igual que en la v1 (`/api/dashboard-torneo`), sale de los partidos que
// carga el club (`partidos_hacoaj*`); solo los goles en contra por minuto vienen del
// scraper (`torneo_goles`), porque el club no los registra.
//
// Recibe el cliente de Supabase del servidor.

import { leerTodo } from "./leerTodo";
import { obtenerJugadoresPanel } from "./plantel";

// Cómo figura Hacoaj en los eventos de soloascenso (goles, tarjetas, cambios).
const ABREVIATURA_HACOAJ = "NÁU";

function verificar({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// Nombre corto para los gráficos: el apellido (última palabra) y, si dos jugadores
// comparten apellido, "F. Apellido" con las letras del nombre que hagan falta.
function nombresParaMostrar(nombres) {
  const porApellido = new Map();
  for (const nombre of nombres) {
    const apellido = nombre.split(" ").at(-1) || nombre;
    porApellido.set(apellido, [...(porApellido.get(apellido) ?? []), nombre]);
  }
  const resultado = new Map();
  for (const [apellido, grupo] of porApellido) {
    if (grupo.length === 1) {
      resultado.set(grupo[0], apellido);
      continue;
    }
    for (const completo of grupo) {
      const nombre = completo.split(" ")[0] ?? "";
      const otros = grupo.filter((n) => n !== completo).map((n) => n.split(" ")[0] ?? "");
      let largo = 1;
      while (largo < nombre.length && otros.some((o) => o.slice(0, largo) === nombre.slice(0, largo))) largo++;
      resultado.set(completo, `${nombre.slice(0, largo)}. ${apellido}`);
    }
  }
  return resultado;
}

const masFrecuentes = (cuenta, limite, minimo = 1) =>
  [...cuenta.entries()]
    .filter(([, veces]) => veces >= minimo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite);

// Resumen del torneo para Hacoaj: estadísticas del equipo, cada jugador con lo que
// hizo, los goles del equipo por minuto, las combinaciones de gol, las parejas de
// cambio y la formación más usada.
export async function obtenerResumenTorneoHacoaj(supabase) {
  const [partidos, apariciones, golesClub, cambios, tarjetas, { jugadores: fichas }] = await Promise.all([
    supabase.from("partidos_hacoaj").select("id, condicion, formacion, goles_hacoaj, goles_rival, partido_torneo_id").then(verificar),
    leerTodo(() =>
      supabase.from("partidos_hacoaj_jugadores").select("partido_id, perfil_id, posicion_partido, titular, minutos_jugados").order("id"),
    ),
    leerTodo(() => supabase.from("partidos_hacoaj_goles").select("perfil_id, asistencia_de_id, minuto, en_contra").order("id")),
    leerTodo(() => supabase.from("partidos_hacoaj_cambios").select("jugador_entra_id, jugador_sale_id").order("id")),
    leerTodo(() => supabase.from("partidos_hacoaj_tarjetas").select("perfil_id, tipo").order("id")),
    obtenerJugadoresPanel(supabase),
  ]);

  // Los jugadores del plantel (no la cuenta de prueba). Los nombres cortos se arman con todos.
  const plantel = fichas.filter((f) => f.rol_jugador === "jugador" && f.usuario !== "hacoaj");
  const nombreCorto = nombresParaMostrar(plantel.map((f) => f.nombre));
  const fichaPorId = new Map(plantel.map((f) => [f.jugador_id, f]));
  const corto = (id) => {
    const ficha = fichaPorId.get(id);
    return ficha ? (nombreCorto.get(ficha.nombre) ?? ficha.nombre) : null;
  };
  const condicionDe = new Map(partidos.map((p) => [p.id, p.condicion]));

  // ── Equipo ──
  const pg = partidos.filter((p) => p.goles_hacoaj > p.goles_rival).length;
  const pe = partidos.filter((p) => p.goles_hacoaj === p.goles_rival).length;
  const gf = partidos.reduce((total, p) => total + p.goles_hacoaj, 0);
  const gc = partidos.reduce((total, p) => total + p.goles_rival, 0);
  const pts = pg * 3 + pe;
  const pj = partidos.length;
  const redondear = (valor, decimales = 2) => (pj > 0 ? Number(valor.toFixed(decimales)) : 0);
  const stats = { pj, pg, pe, pp: pj - pg - pe, gf, gc, pts };

  // ── Jugadores: solo se cuentan las filas en que el jugador fue titular o tuvo posición
  // (como la v1, que ignoraba las filas de citados que no entraron). ──
  const jugadores = plantel
    .map((f) => {
      const suyas = apariciones.filter((a) => a.perfil_id === f.jugador_id && (a.titular || a.posicion_partido));
      if (suyas.length === 0) return null;

      const posicionesPartido = {};
      const minutosPorPosicion = {};
      for (const a of suyas) {
        if (!a.posicion_partido) continue;
        posicionesPartido[a.posicion_partido] = (posicionesPartido[a.posicion_partido] ?? 0) + 1;
        minutosPorPosicion[a.posicion_partido] = (minutosPorPosicion[a.posicion_partido] ?? 0) + a.minutos_jugados;
      }
      const deTitular = suyas.filter((a) => a.titular);
      const deSuplente = suyas.filter((a) => !a.titular);
      const suma = (filas) => filas.reduce((total, a) => total + a.minutos_jugados, 0);

      return {
        nombre: f.nombre,
        nombreCorto: nombreCorto.get(f.nombre) ?? f.nombre,
        posicion: f.posicion,
        partidos: suyas.length,
        titular: deTitular.length,
        suplente: deSuplente.length,
        minutos: suma(suyas),
        minutosTitular: suma(deTitular),
        minutosSuplente: suma(deSuplente),
        goles: golesClub.filter((g) => g.perfil_id === f.jugador_id && !g.en_contra).length,
        asistencias: golesClub.filter((g) => g.asistencia_de_id === f.jugador_id).length,
        amarillas: tarjetas.filter((t) => t.perfil_id === f.jugador_id && t.tipo === "amarilla").length,
        rojas: tarjetas.filter((t) => t.perfil_id === f.jugador_id && t.tipo === "roja").length,
        condiciones: suyas.map((a) => condicionDe.get(a.partido_id) ?? ""),
        posicionesPartido,
        minutosPorPosicion,
      };
    })
    .filter(Boolean);
  const estaEnLista = new Set(jugadores.map((j) => j.nombre));
  const enLista = (id) => {
    const ficha = fichaPorId.get(id);
    return ficha ? estaEnLista.has(ficha.nombre) : false;
  };

  // Índice de rotación: qué parte de los minutos disponibles (11 jugadores × 90' × partidos)
  // jugaron los 11 con más minutos. Cerca de 100% = siempre los mismos.
  const minutosTop11 = [...jugadores].sort((a, b) => b.minutos - a.minutos).slice(0, 11).reduce((t, j) => t + j.minutos, 0);
  const rotacion = pj > 0 ? Number(((minutosTop11 / (pj * 11 * 90)) * 100).toFixed(1)) : 0;

  // Parejas "sale → entra" (solo las que se repiten) y combinaciones "asistidor → goleador".
  const parejas = new Map();
  for (const c of cambios) {
    if (!enLista(c.jugador_sale_id)) continue;
    const sale = corto(c.jugador_sale_id);
    const entra = corto(c.jugador_entra_id);
    if (!sale || !entra) continue;
    parejas.set(`${sale} → ${entra}`, (parejas.get(`${sale} → ${entra}`) ?? 0) + 1);
  }
  const combinaciones = new Map();
  for (const g of golesClub) {
    if (g.en_contra || !g.asistencia_de_id || !enLista(g.perfil_id)) continue;
    const asistidor = corto(g.asistencia_de_id);
    const goleador = corto(g.perfil_id);
    if (!asistidor || !goleador) continue;
    combinaciones.set(`${asistidor} → ${goleador}`, (combinaciones.get(`${asistidor} → ${goleador}`) ?? 0) + 1);
  }

  const usos = new Map();
  for (const p of partidos) if (p.formacion) usos.set(p.formacion, (usos.get(p.formacion) ?? 0) + 1);
  const formacionMasUsada = masFrecuentes(usos, 1)[0]?.[0] ?? "";

  // Minutos de los goles: a favor, los que anotó el club; en contra, los del scraper (si el
  // partido está vinculado). Se descartan los que no tienen minuto.
  const idsTorneo = partidos.map((p) => p.partido_torneo_id).filter(Boolean);
  const golesContra =
    idsTorneo.length > 0
      ? verificar(
          await supabase
            .from("torneo_goles")
            .select("minuto")
            .in("partido_id", idsTorneo)
            .neq("equipo_abrev", ABREVIATURA_HACOAJ)
            .not("minuto", "is", null),
        )
      : [];

  return {
    equipo: "Náutico Hacoaj",
    stats,
    kpis: {
      puntosPartido: redondear(pts / (pj || 1)),
      golesPartido: redondear(gf / (pj || 1)),
      golesContraPartido: redondear(gc / (pj || 1)),
      rotacion,
    },
    jugadores,
    posiciones: [...new Set(jugadores.map((j) => j.posicion).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
    goles: {
      favor: golesClub.filter((g) => g.minuto !== null && !g.en_contra && enLista(g.perfil_id)).map((g) => g.minuto),
      contra: golesContra.map((g) => g.minuto),
    },
    cambiosTop: masFrecuentes(parejas, 10, 2),
    combinacionesGol: masFrecuentes(combinaciones, 10),
    formacionMasUsada,
  };
}
