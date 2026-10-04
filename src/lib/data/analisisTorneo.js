// Datos para la pestaña "Promocional 2026" del Dashboard de análisis: cómo le
// va a Hacoaj en el torneo (no todo el plantel de fuerza/pliegues, sino el
// rendimiento en los partidos). Se arma con los mismos datos que ya usan
// Equipos, Jugadores y el resto del Torneo técnico (`torneoDb.js`), más
// `plantel.js` para la ficha (posición, pierna hábil) de cada jugador.

import { obtenerJugadoresPanel } from "./plantel";
import {
  abreviar,
  obtenerEquipos,
  obtenerPartidosEquipo,
  obtenerPlantel,
  obtenerSintesisPartido,
  obtenerStatsEquipo,
} from "./torneoDb";

async function equipoHacoaj() {
  const equipos = await obtenerEquipos();
  return equipos.find((e) => e.nombre.toLowerCase().includes("hacoaj"));
}

// Goles a favor y en contra de Hacoaj, con el minuto de cada uno, juntando
// la síntesis de todos sus partidos de la temporada.
async function golesPorMinuto(equipoId, nombreHacoaj, temporada) {
  const abrevHacoaj = abreviar(nombreHacoaj);
  const partidos = await obtenerPartidosEquipo(equipoId, temporada);
  const favor = [];
  const contra = [];

  for (const p of partidos) {
    const sintesis = await obtenerSintesisPartido(p.partido_id);
    if (!sintesis) continue;
    for (const g of sintesis.goles) {
      (g.equipo_abrev === abrevHacoaj ? favor : contra).push(g.minuto);
    }
  }
  return { favor, contra };
}

// Resumen del torneo para Hacoaj: estadísticas del equipo, cada jugador con
// lo que hizo (partidos, titularidades, minutos, goles, tarjetas) y los goles
// del equipo agrupados por minuto.
export async function obtenerResumenTorneoHacoaj(supabase, temporada = "2026") {
  const hacoaj = await equipoHacoaj();
  const [stats, plantelBase, { jugadores: fichas, posiciones }, goles] = await Promise.all([
    obtenerStatsEquipo(hacoaj.equipo_id, temporada),
    obtenerPlantel(hacoaj.equipo_id),
    obtenerJugadoresPanel(supabase),
    golesPorMinuto(hacoaj.equipo_id, hacoaj.nombre, temporada),
  ]);

  const estadisticasPorId = new Map(plantelBase.map((j) => [j.jugador_id, j]));
  const jugadores = fichas.map((f) => {
    const e = estadisticasPorId.get(f.jugador_id) ?? {};
    return {
      ...f,
      partidos: e.partidos ?? 0,
      titular: e.titular ?? 0,
      minutos: e.minutos ?? 0,
      goles: e.goles ?? 0,
      amarillas: e.amarillas ?? 0,
      rojas: e.rojas ?? 0,
    };
  });

  return { equipo: hacoaj.nombre, stats, jugadores, posiciones, goles };
}
