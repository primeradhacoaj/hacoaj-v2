// Datos de PRUEBA de las respuestas de encuestas de TODO el plantel, para las
// pantallas de wellness y post partido del panel técnico. En la v1 esto
// salía de las hojas de Google Sheets llenadas por los jugadores; acá se
// genera una sola vez, de forma determinística.
//
// Nota: las encuestas del jugador (`src/lib/data/encuestas.js`) todavía NO
// persisten lo que se carga (validan y responden "ok" nomás, hasta que haya
// base de datos). Estas respuestas son independientes, para poder mostrar
// cómo se van a ver las pantallas del técnico con datos reales.

import { generador } from "@/lib/azar";
import {
  CATEGORIAS,
  ESCALAS_WELLNESS,
  LADOS,
  OPCIONES_EMOCIONAL,
  OPCIONES_FISICA,
  OPCIONES_LLEGADA,
  TIPOS_GOLPE,
  ZONAS_CON_LADO,
  ZONAS_SIN_LADO,
} from "@/lib/encuestas";
import { obtenerJugadoresPanel } from "./plantel";
import { obtenerEquipos, obtenerPartidosEquipo } from "./torneoDb";

let cache = null;

async function base() {
  if (cache) return cache;

  const { jugadores } = await obtenerJugadoresPanel();
  // Partidos de prueba de Hacoaj (del SQLite ficticio): esta vista del plantel sigue
  // con datos de prueba hasta migrar el panel técnico, así que no depende de la base.
  const hacoaj = (await obtenerEquipos()).find((e) => e.nombre.toLowerCase().includes("hacoaj"));
  const partidos = (await obtenerPartidosEquipo(hacoaj.equipo_id, "2026")).map((p) => ({
    fecha_raw: p.fecha,
    rival: p.rival,
  }));
  const azar = generador(8500);

  // ── Wellness: una respuesta por semana, últimas 6 semanas, no todos los jugadores cada semana ──
  const wellness = [];
  for (const j of jugadores) {
    const azarJ = generador(8600 + j.jugador_id);
    for (let semana = 5; semana >= 0; semana--) {
      if (azarJ() < 0.15) continue; // no todos cargan todas las semanas
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - semana * 7 - Math.floor(azarJ() * 3));
      const valor = (base) => Math.min(10, Math.max(1, Math.round(base + azarJ() * 4 - 2)));
      wellness.push({
        jugador: j.nombre,
        fecha: fechaCorta(fecha),
        sueno: valor(7),
        estres: valor(4),
        fatiga: valor(5),
        dolor: valor(3),
        comentario: azarJ() < 0.25 ? comentarioWellness(azarJ) : "",
      });
    }
  }

  // ── Post partido: una respuesta por partido y jugador, no todos citados en todos ──
  const postPartido = [];
  for (const j of jugadores) {
    const azarJ = generador(8700 + j.jugador_id);
    for (const p of partidos) {
      if (azarJ() < 0.3) continue; // no todos respondieron todos los partidos
      const golpes = [];
      if (azarJ() < 0.22) golpes.push(armarGolpe(azarJ));
      if (azarJ() < 0.05) golpes.push(armarGolpe(azarJ));
      postPartido.push({
        jugador: j.nombre,
        fechaPartido: fechaDeIso(p.fecha_raw),
        rival: p.rival,
        llegada: OPCIONES_LLEGADA[Math.floor(azarJ() * OPCIONES_LLEGADA.length)],
        emocional: OPCIONES_EMOCIONAL[Math.floor(azarJ() * OPCIONES_EMOCIONAL.length)],
        fisica: OPCIONES_FISICA[Math.floor(azarJ() * OPCIONES_FISICA.length)],
        categoria: azarJ() < 0.85 ? "Promocional Amateur" : CATEGORIAS[Math.floor(azarJ() * CATEGORIAS.length)],
        minutos: golpes.length > 0 || azarJ() < 0.7 ? String(20 + Math.floor(azarJ() * 71)) : "0",
        comentario: azarJ() < 0.2 ? comentarioPartido(azarJ) : "",
        golpes,
      });
    }
  }

  cache = { wellness, postPartido };
  return cache;
}

function fechaCorta(fecha) {
  const dd = String(fecha.getDate()).padStart(2, "0");
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${fecha.getFullYear()}`;
}

// "2026-05-23" (fecha_raw del fixture) -> "23/05/2026"
function fechaDeIso(fechaIso) {
  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}/${mes}/${anio}`;
}

function armarGolpe(azar) {
  const tipo = TIPOS_GOLPE[Math.floor(azar() * TIPOS_GOLPE.length)];
  if (tipo === "Otro") {
    return { tipo, ubicacion: "", lado: "", comentario: "Molestia sin especificar" };
  }
  const conLado = azar() < 0.65;
  const zona = conLado
    ? ZONAS_CON_LADO[Math.floor(azar() * ZONAS_CON_LADO.length)]
    : ZONAS_SIN_LADO[Math.floor(azar() * ZONAS_SIN_LADO.length)];
  return {
    tipo,
    ubicacion: zona,
    lado: conLado ? LADOS[Math.floor(azar() * LADOS.length)] : "",
    comentario: "",
  };
}

const COMENTARIOS_WELLNESS = [
  "Dormí poco, semana de exámenes.",
  "Me sentí muy bien esta semana.",
  "Algo de sobrecarga en las piernas.",
  "Todo normal.",
];
function comentarioWellness(azar) {
  return COMENTARIOS_WELLNESS[Math.floor(azar() * COMENTARIOS_WELLNESS.length)];
}

const COMENTARIOS_PARTIDO = [
  "Buen partido, sin sobresaltos.",
  "Cansado por el calor.",
  "Podríamos haber presionado más arriba.",
  "Todo bien.",
];
function comentarioPartido(azar) {
  return COMENTARIOS_PARTIDO[Math.floor(azar() * COMENTARIOS_PARTIDO.length)];
}

// Respuestas de wellness de todo el plantel.
export async function obtenerWellnessPlantel() {
  const { wellness } = await base();
  return wellness;
}

// Escalas usadas en la pregunta de wellness (para mostrar el texto de cada nivel).
export function textoEscalaWellness(nombre, valor) {
  const escala = ESCALAS_WELLNESS.find((e) => e.nombre === nombre);
  return escala?.textos[valor] ?? "";
}

// Respuestas post partido de todo el plantel.
export async function obtenerPostPartidoPlantel() {
  const { postPartido } = await base();
  return postPartido;
}
