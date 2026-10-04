// Datos de PRUEBA del calendario del panel técnico: cumpleaños del plantel,
// partidos de Hacoaj y testeos de fuerza/pliegues de un mes. En la v1 esto
// salía de `/api/calendario`, que juntaba la hoja "Usuarios", el fixture y
// las hojas de fuerza/pliegues. Acá se arma con los mismos datos que ya usan
// Jugadores, Partidos y los historiales del plantel, así que es consistente
// entre pantallas.
//
// Los partidos futuros del fixture (`torneo.js`) son un dataset aparte del
// SQLite de Hacoaj (`torneoDb.js`, del que sale `obtenerPartidosHacoaj`) y no
// coinciden entre sí (ver notas de `torneoDb.js`) — para no mostrar dos
// fechas distintas para lo que se supone es el mismo partido, el calendario
// solo usa los partidos ya jugados de Hacoaj.

import { obtenerHistorialFuerzaPlantel, obtenerHistorialPlieguesPlantel, obtenerJugadoresPanel } from "./plantel";
import { obtenerPartidosHacoaj } from "./partidos";

function claveDe(anio, mes, dia) {
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// "dd/mm/aaaa" → { dia, mes }
function diaYMes(fechaCorta) {
  const [dd, mm] = fechaCorta.split("/").map(Number);
  return { dia: dd, mes: mm };
}

function agregar(eventos, clave, evento) {
  (eventos[clave] ??= []).push(evento);
}

// Eventos del mes pedido, agrupados por fecha ("aaaa-mm-dd"): cumpleaños,
// partidos de Hacoaj y testeos (uno por fecha, no uno por jugador — el
// plantel entero se testea el mismo día). Misma forma que devolvía
// `/api/calendario` en la v1.
export async function obtenerEventosDelMes(supabase, anio, mes) {
  const eventos = {};

  const { jugadores } = await obtenerJugadoresPanel();
  for (const j of jugadores) {
    const { dia, mes: mesNacimiento } = diaYMes(j.nacimiento);
    if (mesNacimiento === mes) agregar(eventos, claveDe(anio, mes, dia), { tipo: "cumple", nombre: j.nombre });
  }

  const partidos = await obtenerPartidosHacoaj(supabase);
  for (const p of partidos) {
    const [a, m, d] = p.fecha_raw.split("-").map(Number);
    if (a !== anio || m !== mes) continue;
    agregar(eventos, claveDe(anio, mes, d), {
      tipo: "partido",
      rival: p.rival,
      condicion: p.condicion === "Local" ? "L" : "V",
      resultado: `${p.goles_hacoaj}-${p.goles_rival}`,
      jugado: true,
    });
  }

  const agregarTesteos = (filas, etiqueta) => {
    const vistas = new Set();
    for (const fila of filas) {
      const { dia, mes: mesFila } = diaYMes(fila.fecha);
      if (mesFila !== mes) continue;
      const clave = claveDe(anio, mes, dia);
      if (vistas.has(clave)) continue;
      vistas.add(clave);
      agregar(eventos, clave, { tipo: "testeo", nombre: etiqueta });
    }
  };
  const { sentadilla, pecho } = await obtenerHistorialFuerzaPlantel();
  const { pliegues } = await obtenerHistorialPlieguesPlantel();
  agregarTesteos(sentadilla, "Testeo de Sentadilla");
  agregarTesteos(pecho, "Testeo de Pecho");
  agregarTesteos(pliegues, "Testeo de Pliegues");

  return eventos;
}
