// Datos de PRUEBA que reemplazan a la base SQLite del scraper de la v1
// (`primera_d.db`): equipos, jugadores, partidos, apariciones, goles, tarjetas
// y cambios. Es todo ficticio y determinístico (se arma una sola vez, con
// semilla fija).
//
// Las funciones de abajo devuelven lo mismo que las respuestas
// `/api/torneo/...` de la v1 (mismos nombres de campos). Con Supabase se
// cambia solo el interior de cada una por una consulta.

import { generador } from "@/lib/azar";
import { armarFixture, NOMBRES_EQUIPOS } from "./torneo";

const TEMPORADAS = [2024, 2025, 2026];

const APELLIDOS = [
  "Acosta", "Aguirre", "Alvarado", "Benítez", "Britos", "Cabrera", "Caballero", "Correa",
  "Delgado", "Domínguez", "Escobar", "Ferreyra", "Figueroa", "Gallo", "Godoy", "Herrera",
  "Ibáñez", "Iglesias", "Juárez", "Ledesma", "Luna", "Luque", "Maidana", "Medina",
  "Molina", "Navarro", "Núñez", "Ojeda", "Olivera", "Ortega", "Paz", "Peralta",
  "Pereyra", "Ponce", "Quiroga", "Ramos", "Rivas", "Rojas", "Romero", "Salinas",
  "Sandoval", "Sosa", "Suárez", "Toledo", "Trejo", "Urquiza", "Vega", "Villalba",
  "Ybarra", "Zárate", "Bustos", "Cardozo", "Duarte", "Fleitas", "Giménez", "Leiva",
  "Montiel", "Nieva", "Palacios", "Robles",
];

const NOMBRES = [
  "Matías", "Lucas", "Tomás", "Nicolás", "Agustín", "Facundo", "Joaquín", "Franco",
  "Bruno", "Ezequiel", "Gonzalo", "Ignacio", "Santiago", "Martín", "Julián", "Federico",
  "Leandro", "Maximiliano", "Sebastián", "Rodrigo", "Damián", "Cristian", "Emiliano",
  "Gabriel", "Hernán", "Iván", "Jorge", "Kevin", "Lautaro", "Mauro", "Nahuel", "Oscar",
  "Pablo", "Ramiro", "Sergio", "Thiago", "Valentín", "Walter", "Axel", "Braian",
];

// Cuántos jugadores tiene cada plantel por puesto.
const PUESTOS_PLANTEL = [
  ["Arquero", 2],
  ["Defensor", 6],
  ["Volante", 6],
  ["Delantero", 4],
];
const RANGO_PUESTO = { Arquero: 1, Defensor: 2, Volante: 3, Delantero: 4 };
const POSICION_EN_PARTIDO = {
  Arquero: "arquero",
  Defensor: "defensor",
  Volante: "mediocampista",
  Delantero: "delantero",
};

const PALABRAS_MENORES = ["del", "los", "las", "club"];

export function abreviar(nombre) {
  const palabra = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(" ")
    .find((p) => p.length > 2 && !PALABRAS_MENORES.includes(p.toLowerCase()));
  return (palabra ?? nombre).slice(0, 3).toUpperCase();
}

function fechaIso(dia) {
  const [dd, mm, aa] = dia.split(".");
  return `20${aa}-${mm}-${dd}`;
}

// ── Armado de la base (una sola vez) ────────────────────────────────────────

function armarEquiposYJugadores() {
  const azar = generador(77);
  const equipos = NOMBRES_EQUIPOS.map((nombre, indice) => ({ equipo_id: indice + 1, nombre }));
  const jugadores = [];
  let proximoId = 1;

  for (const equipo of equipos) {
    const usados = new Set();
    for (const [puesto, cantidad] of PUESTOS_PLANTEL) {
      for (let i = 0; i < cantidad; i++) {
        let nombreCompleto;
        do {
          const apellido = APELLIDOS[Math.floor(azar() * APELLIDOS.length)];
          const nombre = NOMBRES[Math.floor(azar() * NOMBRES.length)];
          nombreCompleto = `${apellido.toUpperCase()}, ${nombre.toUpperCase()}`;
        } while (usados.has(nombreCompleto));
        usados.add(nombreCompleto);

        const anio = 1988 + Math.floor(azar() * 18);
        const mes = String(1 + Math.floor(azar() * 12)).padStart(2, "0");
        const dia = String(1 + Math.floor(azar() * 28)).padStart(2, "0");
        jugadores.push({
          jugador_id: proximoId++,
          nombre_completo: nombreCompleto,
          fecha_nacimiento: `${anio}-${mes}-${dia}`,
          puesto,
          equipo_id: equipo.equipo_id,
        });
      }
    }
  }
  return { equipos, jugadores };
}

// Elige `n` jugadores del puesto, favoreciendo a los primeros del plantel (los "titulares de siempre").
function elegir(plantel, puesto, n, azar, excluidos = new Set()) {
  return plantel
    .map((j, indice) => ({ j, orden: azar() + indice * 0.05 }))
    .filter(({ j }) => j.puesto === puesto && !excluidos.has(j.jugador_id))
    .sort((a, b) => a.orden - b.orden)
    .slice(0, n)
    .map(({ j }) => j);
}

// Genera lo que pasó en un partido para un equipo: quiénes jugaron, los goles,
// las tarjetas y los cambios.
function armarLado({ partido, equipo, goles, plantel, azar }) {
  const abrev = abreviar(equipo.nombre);
  const titulares = [
    ...elegir(plantel, "Arquero", 1, azar),
    ...elegir(plantel, "Defensor", 4, azar),
    ...elegir(plantel, "Volante", 4, azar),
    ...elegir(plantel, "Delantero", 2, azar),
  ];
  const enCancha = new Set(titulares.map((j) => j.jugador_id));
  const restantes = plantel
    .filter((j) => !enCancha.has(j.jugador_id))
    .map((j) => ({ j, orden: azar() }))
    .sort((a, b) => a.orden - b.orden)
    .map(({ j }) => j);
  const suplentes = restantes.slice(0, 3);

  const filas = [
    ...titulares.map((j, i) => ({ j, titular: 1, numero: i + 1, minutos: 90 })),
    ...suplentes.map((j, i) => ({ j, titular: 0, numero: 12 + i, minutos: 0 })),
  ].map((f) => ({
    partido_id: partido.partido_id,
    jugador_id: f.j.jugador_id,
    titular: f.titular,
    numero_camiseta: f.numero,
    posicion_partido: f.titular ? POSICION_EN_PARTIDO[f.j.puesto] : "suplente",
    equipo_en_partido: equipo.nombre,
    minutos_jugados: f.minutos,
    goles: 0,
    amarilla: 0,
    roja: 0,
    _entra: 0,
    _puesto: f.j.puesto,
  }));

  // Dos cambios: entra un suplente y sale un titular de campo.
  const cambios = [];
  const yaSalio = new Set();
  for (let i = 0; i < 2; i++) {
    const minuto = 55 + Math.floor(azar() * 30);
    const candidatos = filas.filter((f) => f.titular && f._puesto !== "Arquero" && !yaSalio.has(f.jugador_id));
    const sale = candidatos[Math.floor(azar() * candidatos.length)];
    const entra = filas.filter((f) => !f.titular)[i];
    yaSalio.add(sale.jugador_id);
    sale.minutos_jugados = minuto;
    entra.minutos_jugados = 90 - minuto;
    entra._entra = minuto;
    cambios.push({
      partido_id: partido.partido_id,
      jugador_entra: apellidoDe(plantel, entra.jugador_id),
      jugador_sale: apellidoDe(plantel, sale.jugador_id),
      equipo_abrev: abrev,
      minuto,
    });
  }

  // Goles: los hacen los que estaban en la cancha, más los delanteros que los volantes.
  const eventosGoles = [];
  const peso = { Delantero: 5, Volante: 3, Defensor: 1, Arquero: 0 };
  const habilitados = filas.filter((f) => f.minutos_jugados > 0 && f._puesto !== "Arquero");
  const suma = habilitados.reduce((total, f) => total + peso[f._puesto], 0);
  for (let g = 0; g < goles; g++) {
    let punto = azar() * suma;
    const autor = habilitados.find((f) => (punto -= peso[f._puesto]) < 0) ?? habilitados[0];
    const desde = autor._entra;
    const hasta = autor.titular ? autor.minutos_jugados : 90;
    autor.goles += 1;
    eventosGoles.push({
      partido_id: partido.partido_id,
      jugador_nombre: apellidoDe(plantel, autor.jugador_id),
      equipo_abrev: abrev,
      minuto: desde + 1 + Math.floor(azar() * Math.max(1, hasta - desde)),
      en_contra: 0,
    });
  }

  // Tarjetas: casi siempre una amarilla, a veces dos, y de vez en cuando una roja.
  const tarjetas = [];
  const jugaron = filas.filter((f) => f.minutos_jugados > 0 && f._puesto !== "Arquero");
  const cantidadTarjetas = (azar() < 0.7 ? 1 : 0) + (azar() < 0.25 ? 1 : 0);
  for (let t = 0; t < cantidadTarjetas; t++) {
    const fila = jugaron[Math.floor(azar() * jugaron.length)];
    if (fila.amarilla || fila.roja) continue;
    fila.amarilla = 1;
    tarjetas.push({
      partido_id: partido.partido_id,
      jugador_nombre: apellidoDe(plantel, fila.jugador_id),
      equipo_abrev: abrev,
      tipo: "Amarilla",
      minuto: 10 + Math.floor(azar() * 80),
    });
  }
  if (azar() < 0.05) {
    const fila = jugaron[Math.floor(azar() * jugaron.length)];
    if (!fila.roja) {
      fila.roja = 1;
      tarjetas.push({
        partido_id: partido.partido_id,
        jugador_nombre: apellidoDe(plantel, fila.jugador_id),
        equipo_abrev: abrev,
        tipo: "Roja",
        minuto: 30 + Math.floor(azar() * 60),
      });
    }
  }

  return {
    apariciones: filas.map(({ _entra, _puesto, ...aparicion }) => aparicion),
    goles: eventosGoles,
    tarjetas,
    cambios,
  };
}

function apellidoDe(plantel, jugadorId) {
  const jugador = plantel.find((j) => j.jugador_id === jugadorId);
  return titulo(jugador.nombre_completo.split(",")[0]);
}

function titulo(texto) {
  return texto.trim().charAt(0).toUpperCase() + texto.trim().slice(1).toLowerCase();
}

let cache = null;

function base() {
  if (cache) return cache;

  const { equipos, jugadores } = armarEquiposYJugadores();
  const equipoPorNombre = new Map(equipos.map((e) => [e.nombre, e]));
  const plantelPorEquipo = new Map(
    equipos.map((e) => [e.equipo_id, jugadores.filter((j) => j.equipo_id === e.equipo_id)]),
  );

  const partidos = [];
  const apariciones = [];
  const goles = [];
  const tarjetas = [];
  const cambios = [];
  let proximoPartido = 1;

  for (const anio of TEMPORADAS) {
    const fechas = armarFixture({
      anio,
      semilla: anio,
      jugadas: anio === 2026 ? undefined : 15,
      mezclar: anio !== 2026,
    });
    for (const [numero, lista] of fechas) {
      for (const p of lista.filter((x) => x.jugado)) {
        const partido = {
          partido_id: proximoPartido++,
          fecha: fechaIso(p.dia),
          dia: p.dia,
          jornada: Number(numero),
          equipo_local: p.local,
          equipo_visitante: p.visitante,
          goles_local: Number(p.goles_local),
          goles_visitante: Number(p.goles_visitante),
          estadio: `Cancha de ${p.local}`,
          arbitro: p.arbitro,
          url: "https://www.soloascenso.com.ar",
        };
        partidos.push(partido);

        const azar = generador(5000 + partido.partido_id);
        for (const [nombre, golesEquipo] of [
          [p.local, partido.goles_local],
          [p.visitante, partido.goles_visitante],
        ]) {
          const equipo = equipoPorNombre.get(nombre);
          const lado = armarLado({
            partido,
            equipo,
            goles: golesEquipo,
            plantel: plantelPorEquipo.get(equipo.equipo_id),
            azar,
          });
          apariciones.push(...lado.apariciones);
          goles.push(...lado.goles);
          tarjetas.push(...lado.tarjetas);
          cambios.push(...lado.cambios);
        }
      }
    }
  }

  const jugadorPorId = new Map(jugadores.map((j) => [j.jugador_id, j]));
  const partidoPorId = new Map(partidos.map((p) => [p.partido_id, p]));
  cache = { equipos, jugadores, partidos, apariciones, goles, tarjetas, cambios, jugadorPorId, partidoPorId };
  return cache;
}

// ── Consultas (mismas respuestas que las `/api/torneo/...` de la v1) ───────

const anioDe = (partido) => Number(partido.fecha.slice(0, 4));

function sumar(filas, campo) {
  return filas.reduce((total, f) => total + (f[campo] || 0), 0);
}

function resumenDe(filas) {
  return {
    partidos: filas.length,
    titular: sumar(filas, "titular"),
    minutos: sumar(filas, "minutos_jugados"),
    goles: sumar(filas, "goles"),
    amarillas: sumar(filas, "amarilla"),
    rojas: sumar(filas, "roja"),
  };
}

// Lista de equipos, por orden alfabético.
export async function obtenerEquipos() {
  return [...base().equipos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

// Plantel de un equipo con lo que jugó cada uno (en todas las temporadas).
export async function obtenerPlantel(equipoId) {
  const { jugadores, apariciones } = base();
  return jugadores
    .filter((j) => j.equipo_id === equipoId)
    .map((j) => {
      const r = resumenDe(apariciones.filter((a) => a.jugador_id === j.jugador_id));
      return {
        jugador_id: j.jugador_id,
        nombre_completo: j.nombre_completo,
        fecha_nacimiento: j.fecha_nacimiento,
        puesto: j.puesto,
        partidos: r.partidos,
        titular: r.titular,
        minutos: r.minutos,
        goles: r.goles,
        amarillas: r.amarillas,
        rojas: r.rojas,
      };
    })
    .sort(
      (a, b) =>
        RANGO_PUESTO[a.puesto] - RANGO_PUESTO[b.puesto] ||
        a.nombre_completo.localeCompare(b.nombre_completo, "es"),
    );
}

// Estadísticas de un equipo en una temporada ("2026", "2025", … o "todos").
export async function obtenerStatsEquipo(equipoId, temporada = "2026") {
  const { equipos, partidos, apariciones, jugadorPorId, partidoPorId } = base();
  const equipo = equipos.find((e) => e.equipo_id === equipoId);
  if (!equipo) return null;

  const deLaTemporada = (p) => temporada === "todos" || String(anioDe(p)) === String(temporada);
  const suyos = partidos.filter(
    (p) => (p.equipo_local === equipo.nombre || p.equipo_visitante === equipo.nombre) && deLaTemporada(p),
  );

  let pg = 0;
  let pe = 0;
  let pp = 0;
  let gf = 0;
  let gc = 0;
  for (const p of suyos) {
    const local = p.equipo_local === equipo.nombre;
    const a = local ? p.goles_local : p.goles_visitante;
    const b = local ? p.goles_visitante : p.goles_local;
    gf += a;
    gc += b;
    if (a > b) pg++;
    else if (a === b) pe++;
    else pp++;
  }
  const pj = suyos.length;
  const pts = pg * 3 + pe;

  const tarjetas = apariciones.filter(
    (a) =>
      jugadorPorId.get(a.jugador_id).equipo_id === equipoId &&
      deLaTemporada(partidoPorId.get(a.partido_id)),
  );

  return {
    nombre: equipo.nombre,
    temporada,
    pj,
    pg,
    pe,
    pp,
    gf,
    gc,
    dif: gf - gc,
    pts,
    pct_pts: pj > 0 ? Number(((pts / (pj * 3)) * 100).toFixed(1)) : 0,
    goles_partido: pj > 0 ? Number((gf / pj).toFixed(2)) : 0,
    amarillas: sumar(tarjetas, "amarilla"),
    rojas: sumar(tarjetas, "roja"),
  };
}

// Partidos de un equipo en una temporada, del más nuevo al más viejo.
export async function obtenerPartidosEquipo(equipoId, temporada = "2026") {
  const { equipos, partidos } = base();
  const equipo = equipos.find((e) => e.equipo_id === equipoId);
  if (!equipo) return [];

  return partidos
    .filter(
      (p) =>
        (p.equipo_local === equipo.nombre || p.equipo_visitante === equipo.nombre) &&
        (temporada === "todos" || String(anioDe(p)) === String(temporada)),
    )
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.partido_id - a.partido_id))
    .map((p) => {
      const local = p.equipo_local === equipo.nombre;
      const gf = local ? p.goles_local : p.goles_visitante;
      const gc = local ? p.goles_visitante : p.goles_local;
      return {
        partido_id: p.partido_id,
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

// Síntesis de un partido: goles, tarjetas, cambios y las dos formaciones.
export async function obtenerSintesisPartido(partidoId) {
  const { partidoPorId, apariciones, goles, tarjetas, cambios, jugadorPorId } = base();
  const partido = partidoPorId.get(partidoId);
  if (!partido) return null;

  const porMinuto = (a, b) => a.minuto - b.minuto;
  const formacion = (nombreEquipo) =>
    apariciones
      .filter((a) => a.partido_id === partidoId && a.equipo_en_partido === nombreEquipo)
      .map((a) => {
        const jugador = jugadorPorId.get(a.jugador_id);
        const [apellido, nombres] = jugador.nombre_completo.split(",").map((t) => t.trim());
        return {
          ...a,
          nombre_completo: jugador.nombre_completo,
          nombre_display: `${titulo(nombres)} ${titulo(apellido)}`,
          apellido: titulo(apellido),
          titular: Boolean(a.titular),
        };
      });

  return {
    partido: { ...partido },
    goles: goles.filter((g) => g.partido_id === partidoId).sort(porMinuto),
    tarjetas: tarjetas.filter((t) => t.partido_id === partidoId).sort(porMinuto),
    cambios: cambios.filter((c) => c.partido_id === partidoId).sort(porMinuto),
    formacion_local: formacion(partido.equipo_local),
    formacion_visitante: formacion(partido.equipo_visitante),
  };
}

// Síntesis de un partido del fixture (2026), buscándolo por equipos y día
// ("23.05.26"). Devuelve null si no se jugó o no se encuentra. (La v1 hacía la
// búsqueda en dos pasos; con Supabase el fixture va a traer el id del partido.)
export async function obtenerSintesis(local, visitante, dia) {
  const partido = base().partidos.find(
    (p) => p.equipo_local === local && p.equipo_visitante === visitante && p.dia === dia,
  );
  return partido ? obtenerSintesisPartido(partido.partido_id) : null;
}

// Ficha de un jugador: datos, resumen y cada partido que jugó.
export async function obtenerJugador(jugadorId) {
  const { jugadorPorId, equipos, apariciones, partidoPorId } = base();
  const jugador = jugadorPorId.get(jugadorId);
  if (!jugador) return null;
  const equipo = equipos.find((e) => e.equipo_id === jugador.equipo_id);
  const suyas = apariciones.filter((a) => a.jugador_id === jugadorId);

  return {
    jugador: {
      jugador_id: jugador.jugador_id,
      nombre_completo: jugador.nombre_completo,
      fecha_nacimiento: jugador.fecha_nacimiento,
      puesto: jugador.puesto,
      equipo: equipo.nombre,
      equipo_id: equipo.equipo_id,
    },
    resumen: resumenDe(suyas),
    apariciones: suyas
      .map((a) => {
        const p = partidoPorId.get(a.partido_id);
        return {
          ...a,
          fecha: p.fecha,
          equipo_local: p.equipo_local,
          equipo_visitante: p.equipo_visitante,
          goles_local: p.goles_local,
          goles_visitante: p.goles_visitante,
        };
      })
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)),
  };
}

// Ranking de jugadores. `equipo`: id o "todos". `temporadas`: lista de años
// (["2026"]) o ["todos"]. Va de más a menos goles y, si empatan, minutos.
export async function obtenerRankings({ equipo = "todos", temporadas = ["2026"] } = {}) {
  const { jugadores, equipos, apariciones, partidoPorId } = base();
  const todas = temporadas.includes("todos");
  const filtradas = apariciones.filter(
    (a) => todas || temporadas.includes(String(anioDe(partidoPorId.get(a.partido_id)))),
  );

  return jugadores
    .filter((j) => equipo === "todos" || j.equipo_id === Number(equipo))
    .map((j) => {
      const suyas = filtradas.filter((a) => a.jugador_id === j.jugador_id);
      if (suyas.length === 0) return null;
      return {
        jugador_id: j.jugador_id,
        nombre_completo: j.nombre_completo,
        puesto: j.puesto,
        equipo: equipos.find((e) => e.equipo_id === j.equipo_id).nombre,
        equipo_id: j.equipo_id,
        ...resumenDe(suyas),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.goles - a.goles || b.minutos - a.minutos);
}
