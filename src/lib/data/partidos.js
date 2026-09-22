// Datos de PRUEBA de los partidos de Hacoaj: lo que en la v1 salía de las hojas
// de Google Sheets "Partidos" (un renglón por partido) y "Partidos-jugador" (un
// renglón por jugador y partido), más el resumen del partido que la v1 sacaba
// del SQLite del scraper.
//
// Se arma a partir de los mismos partidos de Hacoaj de `torneoDb.js`, así que
// coinciden con lo que se ve en Equipos y Jugadores. Un delantero del plantel
// hace de "Jugador de Prueba" (el usuario de prueba). Con Supabase se cambia
// solo el interior de cada función.

import { generador } from "@/lib/azar";
import { FORMACIONES } from "@/lib/formaciones";
import { nombresCoinciden } from "@/lib/torneo";
import {
  abreviar,
  obtenerEquipos,
  obtenerPartidosEquipo,
  obtenerPlantel,
  obtenerSintesisPartido,
} from "./torneoDb";

const NOMBRE_PRUEBA = "Jugador de Prueba";
const ESQUEMAS = ["4-4-2", "4-3-3", "4-2-3-1"];
const POSICION_SUPLENTE = { Arquero: "PO", Defensor: "DFC", Volante: "MC", Delantero: "DC" };

let cache = null;

async function base() {
  if (cache) return cache;

  const equipos = await obtenerEquipos();
  const hacoaj = equipos.find((e) => e.nombre.toLowerCase().includes("hacoaj"));
  const abrevHacoaj = abreviar(hacoaj.nombre);
  const plantel = await obtenerPlantel(hacoaj.equipo_id);
  const puestoDe = new Map(plantel.map((j) => [j.jugador_id, j.puesto]));
  const idPrueba = plantel.find((j) => j.puesto === "Delantero").jugador_id;

  const partidos = [];
  const filasPorFecha = {};
  const detalle = {};

  const lista = await obtenerPartidosEquipo(hacoaj.equipo_id, "2026"); // del más nuevo al más viejo
  for (const p of lista) {
    const sintesis = await obtenerSintesisPartido(p.partido_id);
    const esLocal = sintesis.partido.equipo_local === hacoaj.nombre;
    const azar = generador(9000 + p.partido_id);
    const esquema = ESQUEMAS[p.partido_id % ESQUEMAS.length];
    const puestos = FORMACIONES[esquema];

    // Un renglón por jugador (lo que sería "Partidos-jugador").
    const propios = esLocal ? sintesis.formacion_local : sintesis.formacion_visitante;
    let indiceTitular = 0;
    const filas = propios.map((a) => {
      const nombre = a.jugador_id === idPrueba ? NOMBRE_PRUEBA : a.nombre_display;
      return {
        _apellido: a.apellido,
        jugador: nombre,
        posicion: a.titular ? puestos[indiceTitular++].pos : POSICION_SUPLENTE[puestoDe.get(a.jugador_id)],
        titular: a.titular,
        minutos: a.minutos_jugados,
        goles: a.goles,
        asistencias: 0,
        amarillas: a.amarilla,
        rojas: a.roja,
        ingreso_por: "",
        salio_por: "",
        asistencia_de: "",
        minuto_gol: "",
      };
    });
    const porApellido = (apellido) => filas.find((f) => f._apellido === apellido);

    for (const c of sintesis.cambios.filter((x) => x.equipo_abrev === abrevHacoaj)) {
      const entra = porApellido(c.jugador_entra);
      const sale = porApellido(c.jugador_sale);
      if (entra && sale) {
        entra.ingreso_por = sale.jugador;
        sale.salio_por = entra.jugador;
      }
    }

    // Goles de Hacoaj: minuto y, casi siempre, quién dio el pase.
    for (const g of sintesis.goles.filter((x) => x.equipo_abrev === abrevHacoaj)) {
      const autor = porApellido(g.jugador_nombre);
      if (!autor) continue;
      const companeros = filas.filter((f) => f !== autor && f.minutos > 0);
      let pase = "";
      if (azar() < 0.6 && companeros.length > 0) {
        const asistente = companeros[Math.floor(azar() * companeros.length)];
        asistente.asistencias += 1;
        pase = asistente.jugador;
      }
      autor.minuto_gol = autor.minuto_gol ? `${autor.minuto_gol},${g.minuto}` : String(g.minuto);
      autor.asistencia_de = autor.asistencia_de ? `${autor.asistencia_de},${pase}` : pase;
    }
    const jugadoresFila = filas.map(({ _apellido, ...fila }) => fila);

    // Hoja "Partidos".
    const golesHacoaj = esLocal ? sintesis.partido.goles_local : sintesis.partido.goles_visitante;
    const golesRival = esLocal ? sintesis.partido.goles_visitante : sintesis.partido.goles_local;
    const clave = p.fecha;
    const conEstadisticas = p.partido_id % 4 !== 0;
    const capitan = jugadoresFila.find((f) => f.titular && ["DFC", "MC"].includes(f.posicion))?.jugador ?? "";
    const partido = {
      fecha_raw: clave,
      rival: p.rival,
      condicion: esLocal ? "Local" : "Visitante",
      goles_hacoaj: golesHacoaj,
      goles_rival: golesRival,
      formacion: esquema,
      capitan,
      remates_af: conEstadisticas ? 4 + Math.floor(azar() * 12) : null,
      remates_ec: conEstadisticas ? 3 + Math.floor(azar() * 10) : null,
      remates_arco_af: conEstadisticas ? Math.floor(azar() * 8) : null,
      remates_arco_ec: conEstadisticas ? Math.floor(azar() * 6) : null,
      situaciones_af: conEstadisticas ? Math.floor(azar() * 7) : null,
      situaciones_ec: conEstadisticas ? Math.floor(azar() * 6) : null,
      corners_af: conEstadisticas ? Math.floor(azar() * 9) : null,
      corners_ec: conEstadisticas ? Math.floor(azar() * 8) : null,
      corners_con_af: conEstadisticas ? Math.floor(azar() * 3) : null,
      corners_con_ec: conEstadisticas ? Math.floor(azar() * 3) : null,
      tl_af: conEstadisticas ? Math.floor(azar() * 6) : null,
      tl_ec: conEstadisticas ? Math.floor(azar() * 6) : null,
    };
    partidos.push(partido);
    filasPorFecha[clave] = jugadoresFila;

    // Resumen (goles, cambios y tarjetas de los dos equipos).
    const eventos = [];
    const disciplina = [];
    for (const f of jugadoresFila) {
      if (f.salio_por) eventos.push({ min: f.minutos > 0 ? f.minutos : null, tipo: "cambio", entra: f.salio_por, sale: f.jugador, equipo: "hacoaj" });
      for (let i = 0; i < f.amarillas; i++) disciplina.push({ tipo: "amarilla", jugador: f.jugador, equipo: "hacoaj" });
      for (let i = 0; i < f.rojas; i++) disciplina.push({ tipo: "roja", jugador: f.jugador, equipo: "hacoaj" });
      const minutos = f.minuto_gol.split(",").filter(Boolean);
      const pases = f.asistencia_de.split(",");
      for (let i = 0; i < f.goles; i++) {
        eventos.push({
          min: minutos[i] !== undefined ? Number(minutos[i]) : null,
          tipo: "gol",
          jugador: f.jugador,
          equipo: "hacoaj",
          asistencia: pases[i] ?? "",
          enContra: false,
        });
      }
    }
    for (const g of sintesis.goles.filter((x) => x.equipo_abrev !== abrevHacoaj)) {
      eventos.push({ min: g.minuto, tipo: "gol", jugador: g.jugador_nombre, equipo: "rival", asistencia: "", enContra: Boolean(g.en_contra) });
    }
    for (const c of sintesis.cambios.filter((x) => x.equipo_abrev !== abrevHacoaj)) {
      eventos.push({ min: c.minuto, tipo: "cambio", entra: c.jugador_entra, sale: c.jugador_sale, equipo: "rival" });
    }
    for (const t of sintesis.tarjetas.filter((x) => x.equipo_abrev !== abrevHacoaj)) {
      disciplina.push({ tipo: t.tipo.toLowerCase(), jugador: t.jugador_nombre, equipo: "rival" });
    }
    // Lo más reciente arriba; los que no tienen minuto, primero (igual que la v1).
    eventos.sort((a, b) => (a.min === null) !== (b.min === null) ? (a.min === null ? -1 : 1) : (b.min ?? 0) - (a.min ?? 0));
    detalle[clave] = { eventos, disciplina };
  }

  cache = { partidos, filasPorFecha, detalle };
  return cache;
}

const resultadoDe = (golesHacoaj, golesRival) =>
  golesHacoaj > golesRival ? "score-win" : golesHacoaj === golesRival ? "score-draw" : "score-loss";

// Lista de todos los partidos de Hacoaj, del más nuevo al más viejo.
export async function obtenerPartidosHacoaj() {
  const { partidos } = await base();
  return partidos.map((p) => ({
    fecha_raw: p.fecha_raw,
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
export async function obtenerDetallePartido(fecha) {
  const { partidos, filasPorFecha, detalle } = await base();
  const partido = partidos.find((p) => p.fecha_raw === fecha);
  if (!partido) return { partido: null };

  // Un solo partido tiene material de ejemplo (el más reciente).
  const esElUltimo = partidos[0].fecha_raw === fecha;
  return {
    partido: { ...partido, resultado_clase: resultadoDe(partido.goles_hacoaj, partido.goles_rival) },
    jugadores_data: filasPorFecha[fecha],
    videos: [],
    links: esElUltimo ? [{ titulo: "Resumen en SoloAscenso", url: "https://www.soloascenso.com.ar" }] : [],
    resumen_eventos: detalle[fecha].eventos,
    resumen_disciplina: detalle[fecha].disciplina,
  };
}

// Estadísticas de un jugador en el torneo: cruza los partidos de Hacoaj con lo
// que hizo en cada uno (misma cuenta que la v1). `resumen` es null si no hay partidos.
export async function obtenerEstadisticasJugador(nombre, posicion) {
  const { partidos, filasPorFecha } = await base();
  if (partidos.length === 0) return { resumen: null, partidos: [] };

  const esArquero = (posicion ?? "").toLowerCase() === "arquero";
  const suma = {
    citaciones: 0, partidosJugados: 0, titularidades: 0, desdeBanco: 0, minTitular: 0, minSuplente: 0,
    goles: 0, asistencias: 0, amarillas: 0, rojas: 0, golesRecibidos: 0, partidosArquero: 0,
  };

  const detallados = partidos.map((p) => {
    const fila = filasPorFecha[p.fecha_raw].find((f) => nombresCoinciden(f.jugador, nombre));
    const citado = Boolean(fila);
    if (fila) {
      suma.citaciones++;
      if (fila.minutos > 0) {
        suma.partidosJugados++;
        if (fila.titular) {
          suma.titularidades++;
          suma.minTitular += fila.minutos;
        } else {
          suma.desdeBanco++;
          suma.minSuplente += fila.minutos;
        }
      }
      suma.goles += fila.goles;
      suma.asistencias += fila.asistencias;
      suma.amarillas += fila.amarillas;
      suma.rojas += fila.rojas;
      if (esArquero && fila.titular) {
        suma.partidosArquero++;
        suma.golesRecibidos += p.goles_rival;
      }
    }
    return {
      fecha_raw: p.fecha_raw,
      rival: p.rival || "—",
      condicion: p.condicion || "—",
      goles_hacoaj: p.goles_hacoaj,
      goles_rival: p.goles_rival,
      resultado_clase: resultadoDe(p.goles_hacoaj, p.goles_rival),
      posicion: fila?.posicion || "—",
      titular: fila?.titular ?? false,
      minutos: fila?.minutos ?? 0,
      goles: fila?.goles ?? 0,
      asistencias: fila?.asistencias ?? 0,
      amarillas: fila?.amarillas ?? 0,
      rojas: fila?.rojas ?? 0,
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
