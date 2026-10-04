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

// Resumen del torneo para Hacoaj: estadísticas del equipo, cada jugador con lo que
// hizo (partidos, titularidades, minutos, goles, tarjetas) y los goles del equipo por minuto.
export async function obtenerResumenTorneoHacoaj(supabase) {
  const [partidos, apariciones, golesClub, tarjetas, { jugadores: fichas }] = await Promise.all([
    supabase.from("partidos_hacoaj").select("id, goles_hacoaj, goles_rival, partido_torneo_id").then(verificar),
    leerTodo(() => supabase.from("partidos_hacoaj_jugadores").select("perfil_id, titular, minutos_jugados").order("id")),
    leerTodo(() => supabase.from("partidos_hacoaj_goles").select("perfil_id, minuto, en_contra").order("id")),
    leerTodo(() => supabase.from("partidos_hacoaj_tarjetas").select("perfil_id, tipo").order("id")),
    obtenerJugadoresPanel(supabase),
  ]);

  const pg = partidos.filter((p) => p.goles_hacoaj > p.goles_rival).length;
  const pe = partidos.filter((p) => p.goles_hacoaj === p.goles_rival).length;
  const gf = partidos.reduce((total, p) => total + p.goles_hacoaj, 0);
  const gc = partidos.reduce((total, p) => total + p.goles_rival, 0);
  const stats = {
    pj: partidos.length,
    pg,
    pe,
    pp: partidos.length - pg - pe,
    gf,
    gc,
    pts: pg * 3 + pe,
  };

  // Un jugador por fila; entran los jugadores del plantel (no la cuenta de prueba) que jugaron.
  const jugadores = fichas
    .filter((f) => f.rol_jugador === "jugador" && f.usuario !== "hacoaj")
    .map((f) => {
      const suyas = apariciones.filter((a) => a.perfil_id === f.jugador_id);
      return {
        ...f,
        partidos: suyas.length,
        titular: suyas.filter((a) => a.titular).length,
        minutos: suyas.reduce((total, a) => total + a.minutos_jugados, 0),
        goles: golesClub.filter((g) => g.perfil_id === f.jugador_id && !g.en_contra).length,
        amarillas: tarjetas.filter((t) => t.perfil_id === f.jugador_id && t.tipo === "amarilla").length,
        rojas: tarjetas.filter((t) => t.perfil_id === f.jugador_id && t.tipo === "roja").length,
      };
    })
    .filter((j) => j.partidos > 0);

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
    jugadores,
    posiciones: [...new Set(jugadores.map((j) => j.posicion).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
    goles: {
      favor: golesClub.filter((g) => g.minuto !== null).map((g) => g.minuto),
      contra: golesContra.map((g) => g.minuto),
    },
  };
}
