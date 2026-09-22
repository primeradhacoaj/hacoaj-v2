// Datos de PRUEBA del plantel de Hacoaj para el panel técnico: ficha de cada
// jugador (datos personales) y el historial de fuerza, pliegues y pesos de
// TODO el plantel. En la v1 esto salía de la hoja "Usuarios" y de las hojas
// de fuerza/pliegues filtradas por jugador; acá se genera una sola vez, de
// forma determinística, a partir del plantel de Hacoaj que ya arma
// `torneoDb.js` (mismos 16 jugadores que se ven en Equipos y Planteles).
//
// Devuelve lo mismo que las respuestas `/api/jugadores-panel`,
// `/api/historial-fuerza-raw` y `/api/historial-pliegues-raw` de la v1.

import { generador } from "@/lib/azar";
import { formatearNombre } from "@/lib/torneo";
import { obtenerEquipos, obtenerPlantel } from "./torneoDb";

// La v1 tiene 6 posiciones para elegir; el plantel de Hacoaj solo trae 4
// puestos (Arquero/Defensor/Volante/Delantero), así que a Defensores y
// Volantes se los reparte entre las dos variantes de la v1.
const POSICIONES_TECNICO = {
  Arquero: ["Arquero"],
  Defensor: ["Central", "Lateral"],
  Volante: ["Volante", "Mediocampista"],
  Delantero: ["Delantero"],
};

const ALTURA_BASE = { Arquero: 188, Defensor: 182, Volante: 175, Delantero: 178 };

function sinAcentos(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function fechaCorta(fecha) {
  const dd = String(fecha.getDate()).padStart(2, "0");
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${fecha.getFullYear()}`;
}

function calcularEdad(fechaNacimiento) {
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  if (
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())
  ) {
    edad--;
  }
  return edad;
}

let cache = null;

async function base() {
  if (cache) return cache;

  const equipos = await obtenerEquipos();
  const hacoaj = equipos.find((e) => e.nombre.toLowerCase().includes("hacoaj"));
  const plantelBase = await obtenerPlantel(hacoaj.equipo_id);
  const azar = generador(4200);

  const usados = new Set();
  const jugadores = plantelBase.map((j, indice) => {
    const nombre = formatearNombre(j.nombre_completo);
    const [apellido] = j.nombre_completo.split(",");
    let usuario = sinAcentos(apellido.trim()).replace(/[^a-z]/g, "");
    if (usados.has(usuario)) usuario = `${usuario}${indice}`;
    usados.add(usuario);

    const variantes = POSICIONES_TECNICO[j.puesto];
    const posicion = variantes[indice % variantes.length];
    const altura = ALTURA_BASE[j.puesto] + Math.round(azar() * 14 - 7);

    return {
      jugador_id: j.jugador_id,
      nombre,
      usuario,
      posicion,
      piernaHabil: azar() < 0.75 ? "D" : azar() < 0.8 ? "I" : "Ambidiestro",
      altura,
      nacimiento: fechaCorta(new Date(j.fecha_nacimiento)),
      edad: calcularEdad(j.fecha_nacimiento),
      estado: indice === plantelBase.length - 1 ? "Inactivo" : "Activo",
      rol_jugador: "jugador",
    };
  });

  // ── Fuerza: 3 registros de sentadilla y pecho por jugador, cada 6 semanas ──
  const sentadilla = [];
  const pecho = [];
  const comentariosFuerza = [
    "Buena progresión, seguimos con el plan.",
    "Costó un poco esta vez, revisar descanso.",
    "Mejoró la técnica notablemente.",
    "",
  ];
  for (const j of jugadores) {
    const azarJ = generador(5200 + j.jugador_id);
    const pesoCorporal = 68 + Math.round(azarJ() * 22);
    for (let i = 2; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i * 42);
      const fechaTexto = fechaCorta(fecha);
      const comentario = comentariosFuerza[Math.floor(azarJ() * comentariosFuerza.length)];

      const cargaSent = 60 + Math.round(azarJ() * 60);
      const vmpSent = Number((0.35 + azarJ() * 0.35).toFixed(2));
      const rmSent = Math.round(cargaSent * (1 + (0.6 - vmpSent) * 0.5));
      sentadilla.push({
        jugador: j.nombre,
        fecha: fechaTexto,
        peso: pesoCorporal,
        carga: cargaSent,
        vmp: vmpSent,
        rm: rmSent,
        fRelativa: Number((rmSent / pesoCorporal).toFixed(2)),
        comentario,
      });

      const cargaPecho = 40 + Math.round(azarJ() * 45);
      const vmpPecho = Number((0.25 + azarJ() * 0.3).toFixed(2));
      const rmPecho = Math.round(cargaPecho * (1 + (0.45 - vmpPecho) * 0.5));
      pecho.push({
        jugador: j.nombre,
        fecha: fechaTexto,
        peso: pesoCorporal,
        carga: cargaPecho,
        vmp: vmpPecho,
        rm: rmPecho,
        fRelativa: Number((rmPecho / pesoCorporal).toFixed(2)),
        comentario,
      });
    }
  }

  // ── Pliegues: 2 registros por jugador, cada 2 meses ──
  const pliegues = [];
  for (const j of jugadores) {
    const azarJ = generador(6300 + j.jugador_id);
    const talla = Number((j.altura / 100).toFixed(2));
    for (let i = 1; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i * 60);
      const peso = 68 + Math.round(azarJ() * 20);
      const pl = () => Math.round(4 + azarJ() * 14);
      const seis = [pl(), pl(), pl(), pl(), pl(), pl()];
      const sumatoria = seis.reduce((total, valor) => total + valor, 0);
      pliegues.push({
        jugador: j.nombre,
        fecha: fechaCorta(fecha),
        peso,
        talla,
        imc: Number((peso / (talla * talla)).toFixed(1)),
        plTricipital: seis[0],
        plSubescapular: seis[1],
        plSupraespinal: seis[2],
        plAbdominal: seis[3],
        plMuslo: seis[4],
        plPantorrilla: seis[5],
        sumatoria6: sumatoria,
        pesoIdeal: Math.round(peso - (sumatoria - 45) * 0.15),
        comentario: "",
      });
    }
  }

  // ── Pesos: pesajes cada 2 semanas, últimos 4 ──
  const pesos = [];
  for (const j of jugadores) {
    const azarJ = generador(7400 + j.jugador_id);
    let peso = 68 + Math.round(azarJ() * 20);
    for (let i = 3; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i * 14);
      peso += Math.round(azarJ() * 3 - 1.5);
      pesos.push({ jugador: j.nombre, fecha: fechaCorta(fecha), peso });
    }
  }

  cache = { jugadores, sentadilla, pecho, pliegues, pesos };
  return cache;
}

// Lista del plantel para la grilla de "Jugadores", con las posiciones
// presentes (para el filtro).
export async function obtenerJugadoresPanel() {
  const { jugadores, pesos } = await base();
  const ultimoPeso = new Map();
  for (const p of pesos) ultimoPeso.set(p.jugador, p.peso);

  const conPeso = jugadores.map((j) => ({ ...j, peso: ultimoPeso.get(j.nombre) ?? null }));
  const posiciones = [...new Set(conPeso.map((j) => j.posicion))].sort((a, b) => a.localeCompare(b, "es"));
  return { jugadores: conPeso, posiciones };
}

// Historial de fuerza de todo el plantel (para la ficha de cada jugador y
// para el historial completo del plantel).
export async function obtenerHistorialFuerzaPlantel() {
  const { sentadilla, pecho } = await base();
  return { sentadilla, pecho };
}

// Historial de pliegues y pesos de todo el plantel.
export async function obtenerHistorialPlieguesPlantel() {
  const { pliegues, pesos } = await base();
  return { pliegues, pesos };
}
