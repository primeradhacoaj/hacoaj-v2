// Lógica de la pantalla "Cargar partido" (copiada de la v1, `cargar_partido.html`), sin nada
// de pantalla: cadenas de cambios por puesto, validaciones y el armado de lo que se envía.
//
// Una CADENA es lo que pasó en un puesto de la cancha: el titular y, si hubo cambios, los
// que fueron entrando después. Cada paso de la cadena es una ENTRADA:
//   { id, pos, min, goles, asistencias, ta, tr, asistenciaDe: [], minutoGol: [] }
// `id` es el id del perfil del jugador; `asistenciaDe[i]` y `minutoGol[i]` son los datos del
// gol número i de ese jugador (el id de quien lo asistió y el minuto, ambos opcionales).

export const POSICIONES = ["PO", "DFD", "DFC", "DFI", "MCD", "MC", "MD", "MI", "MCO", "EI", "ED", "DC"];
export const CANTIDAD_SUPLENTES = 9;
export const MINUTOS_PARTIDO = 90;

export function inicialesDe(nombre) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes.at(-1)[0] : "")).toUpperCase();
}

function copiar(cadenas) {
  return cadenas.map((cadena) =>
    cadena.map((e) => ({ ...e, asistenciaDe: [...e.asistenciaDe], minutoGol: [...e.minutoGol] })),
  );
}

const entradaNueva = (id, pos, min) => ({
  id,
  pos,
  min,
  goles: 0,
  asistencias: 0,
  ta: 0,
  tr: 0,
  asistenciaDe: [],
  minutoGol: [],
});

// Una cadena por cada titular, con 90 minutos.
export function crearCadenas(puestos) {
  return puestos
    .filter((puesto) => puesto.jugadorId)
    .map((puesto) => [entradaNueva(puesto.jugadorId, puesto.pos, MINUTOS_PARTIDO)]);
}

const minutosAcumulados = (cadena, hasta = cadena.length) =>
  cadena.slice(0, hasta).reduce((total, e) => total + e.min, 0);

// Minuto en que entró la entrada número `indice` de la cadena (la suma de lo que jugaron los anteriores).
export const minutoDeIngreso = (cadena, indice) => minutosAcumulados(cadena, indice);

// Suplentes del banco que todavía no entraron.
export function suplentesDisponibles(cadenas, banco) {
  const usados = new Set(cadenas.flat().map((e) => e.id));
  return banco.filter((id) => id && !usados.has(id));
}

export function agregarCambio(cadenas, indice, suplenteId, pos) {
  const nuevas = copiar(cadenas);
  const cadena = nuevas[indice];
  cadena.push(entradaNueva(suplenteId, pos, Math.max(0, MINUTOS_PARTIDO - minutosAcumulados(cadena))));
  return nuevas;
}

export function deshacerCambio(cadenas, indice) {
  const nuevas = copiar(cadenas);
  const cadena = nuevas[indice];
  if (cadena.length <= 1) return nuevas;
  cadena.pop();
  cadena.at(-1).min = MINUTOS_PARTIDO - minutosAcumulados(cadena, cadena.length - 1);
  return nuevas;
}

export function cambiarMinutos(cadenas, si, ci, valor) {
  const nuevas = copiar(cadenas);
  nuevas[si][ci].min = parseInt(valor, 10) || 0;
  return nuevas;
}

export function cambiarMinutoDeGol(cadenas, si, ci, gi, valor) {
  const nuevas = copiar(cadenas);
  const minuto = parseInt(valor, 10);
  nuevas[si][ci].minutoGol[gi] = Number.isNaN(minuto) ? "" : minuto;
  return nuevas;
}

export function cambiarAsistenciaDeGol(cadenas, si, ci, gi, valor) {
  const nuevas = copiar(cadenas);
  nuevas[si][ci].asistenciaDe[gi] = valor;
  return nuevas;
}

// Cambia goles, asistencias o tarjetas de una entrada. Devuelve las cadenas nuevas y, si se
// corrigió algo, un `error` para mostrar. Reglas de la v1: nunca más goles ni más asistencias
// que los goles de Hacoaj, y la tarjeta es amarilla o roja (no las dos).
export function cambiarEstadistica(cadenas, si, ci, campo, valor, golesHacoaj) {
  const nuevas = copiar(cadenas);
  const entrada = nuevas[si][ci];
  entrada[campo] = parseInt(valor, 10) || 0;
  let error = "";

  if (campo === "ta" && entrada.ta) entrada.tr = 0;
  if (campo === "tr" && entrada.tr) entrada.ta = 0;

  if (campo === "goles" || campo === "asistencias") {
    const suma = (c) => nuevas.flat().reduce((total, e) => total + e[c], 0);
    if (campo === "goles" && suma("goles") > golesHacoaj) {
      entrada.goles = Math.max(0, entrada.goles - (suma("goles") - golesHacoaj));
      error = `No puede haber más goles individuales que los de Hacoaj (${golesHacoaj})`;
    }
    if (campo === "asistencias" && suma("asistencias") > golesHacoaj) {
      entrada.asistencias = Math.max(0, entrada.asistencias - (suma("asistencias") - golesHacoaj));
      error = `No puede haber más asistencias que goles de Hacoaj (${golesHacoaj})`;
    }
    if (campo === "goles") {
      // Un dato por gol: se recorta lo que sobra y se completa con vacíos.
      entrada.asistenciaDe = Array.from({ length: entrada.goles }, (_, i) => entrada.asistenciaDe[i] ?? "");
      entrada.minutoGol = Array.from({ length: entrada.goles }, (_, i) => entrada.minutoGol[i] ?? "");
    }
  }
  return { cadenas: nuevas, error };
}

export function totales(cadenas) {
  const todas = cadenas.flat();
  return {
    goles: todas.reduce((total, e) => total + e.goles, 0),
    asistencias: todas.reduce((total, e) => total + e.asistencias, 0),
  };
}

// Qué jugadores pueden figurar como asistidores de un gol: los que declararon asistencias y
// todavía tienen alguna sin usar en otro gol. `cupo` y `usadas` son por id de jugador.
export function cuposDeAsistencia(cadenas) {
  const cupo = new Map();
  const usadas = new Map();
  for (const e of cadenas.flat()) {
    if (e.asistencias > 0) cupo.set(e.id, e.asistencias);
    for (const id of e.asistenciaDe) if (id) usadas.set(id, (usadas.get(id) ?? 0) + 1);
  }
  return { cupo, usadas };
}

const numeroOVacio = (texto) => {
  if (texto === "" || texto === undefined || texto === null) return "";
  return parseInt(texto, 10) || 0;
};

// Lo que recibe la función de la base `guardar_partido_hacoaj` (ver su migración).
export function armarPartido({ info, formacion, capitanId, cadenas, banco }) {
  const jugadores = [];
  const goles = [];
  const cambios = [];
  const tarjetas = [];

  for (const cadena of cadenas) {
    cadena.forEach((e, ci) => {
      jugadores.push({ perfil_id: e.id, posicion: e.pos, titular: ci === 0, minutos: e.min });
      for (let gi = 0; gi < e.goles; gi++) {
        goles.push({
          perfil_id: e.id,
          asistencia_de_id: e.asistenciaDe[gi] || "",
          minuto: e.minutoGol[gi] === undefined ? "" : e.minutoGol[gi],
        });
      }
      if (e.ta) tarjetas.push({ perfil_id: e.id, tipo: "amarilla" });
      if (e.tr) tarjetas.push({ perfil_id: e.id, tipo: "roja" });
      if (ci > 0) {
        cambios.push({ entra_id: e.id, sale_id: cadena[ci - 1].id, minuto: minutosAcumulados(cadena, ci) });
      }
    });
  }

  // Los del banco que no entraron quedan citados, sin posición ni minutos (como en la v1).
  for (const id of suplentesDisponibles(cadenas, banco)) {
    jugadores.push({ perfil_id: id, posicion: "", titular: false, minutos: 0 });
  }

  const { estadisticas } = info;
  return {
    fecha: info.fecha,
    rival: info.rival,
    condicion: info.condicion,
    goles_hacoaj: parseInt(info.golesHacoaj, 10) || 0,
    goles_rival: parseInt(info.golesRival, 10) || 0,
    formacion,
    capitan_id: capitanId,
    ...Object.fromEntries(Object.entries(estadisticas).map(([campo, valor]) => [campo, numeroOVacio(valor)])),
    jugadores,
    goles,
    cambios,
    tarjetas,
  };
}

// Las estadísticas opcionales del partido, en el orden en que se muestran: [campo, etiqueta].
export const ESTADISTICAS = [
  { seccion: "Remates", pares: [["remates_arco_af", "remates_arco_ec", "Remates al arco"], ["remates_af", "remates_ec", "Remates totales"]] },
  { seccion: "Situaciones de gol", pares: [["situaciones_af", "situaciones_ec", "Situaciones"]] },
  { seccion: "Corners", pares: [["corners_af", "corners_ec", "Corners"], ["corners_con_af", "corners_con_ec", "Corners conectados"]] },
  { seccion: "Tiros libres", pares: [["tl_af", "tl_ec", "Tiros libres"]] },
];

export const ESTADISTICAS_VACIAS = Object.fromEntries(
  ESTADISTICAS.flatMap((s) => s.pares.flatMap(([a, b]) => [[a, ""], [b, ""]])),
);
