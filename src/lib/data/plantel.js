// CAPA DE DATOS del plantel para el panel técnico, leída de Supabase: la ficha de
// cada persona (tabla `perfiles`) y el historial de fuerza, pliegues y pesos de
// TODO el plantel. En la v1 salía de la hoja "Usuarios" y de las hojas de
// fuerza/pliegues; devuelve la misma forma que las respuestas de la v1
// (`/api/jugadores-panel`, `/api/historial-fuerza-raw`, `/api/historial-pliegues-raw`).
//
// Todas las funciones reciben el cliente de Supabase (el del servidor, ver
// `@/lib/supabase/server`). Quién puede ver qué lo decide la base con RLS: el
// técnico y el administrador leen todo; un jugador solo recibiría lo suyo.

import { leerTodo } from "./leerTodo";

// "2026-09-20" -> "20/09/2026" (el formato que usan las pantallas)
function fechaCorta(iso) {
  if (!iso) return "";
  const [anio, mes, dia] = iso.split("T")[0].split("-");
  return `${dia}/${mes}/${anio}`;
}

// El año 1900 es un valor de relleno de la planilla (se cargó solo día y mes porque no se
// conoce el año): sirve para el calendario de cumpleaños, pero no para calcular la edad.
function calcularEdad(fechaIso) {
  if (!fechaIso || fechaIso < "1901-01-01") return null;
  const nacimiento = new Date(`${fechaIso}T00:00:00`);
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

const numero = (v) => (v === null || v === undefined ? null : Number(v));

async function miRol(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("perfiles").select("rol").eq("auth_user_id", user.id).maybeSingle();
  return data?.rol ?? null;
}

// Lista de personas para la grilla de "Jugadores", con las posiciones presentes
// (para el filtro). El técnico ve a los jugadores; el administrador ve además al
// resto (técnico, staff y administradores), igual que en la v1.
export async function obtenerJugadoresPanel(supabase) {
  const rol = await miRol(supabase);
  const perfiles = await leerTodo(() => {
    let consulta = supabase
      .from("perfiles")
      .select("id, usuario, nombre, rol, posicion, pierna_habil, altura, fecha_nacimiento, estado, foto_path")
      .order("nombre");
    if (rol !== "administrador") consulta = consulta.eq("rol", "jugador");
    return consulta;
  });
  const pesos = await leerTodo(() => supabase.from("pesos").select("perfil_id, fecha, peso").order("fecha"));

  const ultimoPeso = new Map();
  for (const p of pesos) ultimoPeso.set(p.perfil_id, numero(p.peso)); // vienen de más viejo a más nuevo

  const jugadores = perfiles.map((p) => ({
    jugador_id: p.id,
    nombre: p.nombre,
    usuario: p.usuario ?? "",
    posicion: p.posicion ?? "",
    piernaHabil: p.pierna_habil ?? "",
    altura: numero(p.altura),
    // sin año conocido (relleno 1900) se muestra solo "dd/mm"
    nacimiento: p.fecha_nacimiento < "1901-01-01" ? fechaCorta(p.fecha_nacimiento).slice(0, 5) : fechaCorta(p.fecha_nacimiento),
    edad: calcularEdad(p.fecha_nacimiento),
    estado: p.estado === "activo" ? "Activo" : "Inactivo",
    rol_jugador: p.rol,
    peso: ultimoPeso.get(p.id) ?? null,
    foto: p.foto_path
      ? supabase.storage.from("avatares").getPublicUrl(p.foto_path).data.publicUrl
      : null,
  }));

  const posiciones = [...new Set(jugadores.map((j) => j.posicion).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  return { jugadores, posiciones };
}

// Historial de fuerza de todo el plantel (para la ficha de cada jugador y para
// el historial completo del plantel). Del más nuevo al más viejo.
export async function obtenerHistorialFuerzaPlantel(supabase) {
  const filas = await leerTodo(() =>
    supabase
      .from("fuerza_tests")
      .select("tipo, fecha_test, peso, carga_externa, vmp, rm_estimado, f_relativa, comentario, perfiles(nombre)")
      .order("fecha_test", { ascending: false })
      .order("id"),
  );
  const comoFila = (f) => ({
    jugador: f.perfiles.nombre,
    fecha: fechaCorta(f.fecha_test),
    peso: numero(f.peso),
    carga: numero(f.carga_externa),
    vmp: numero(f.vmp),
    rm: numero(f.rm_estimado),
    fRelativa: numero(f.f_relativa),
    comentario: f.comentario ?? "",
  });
  return {
    sentadilla: filas.filter((f) => f.tipo === "sentadilla").map(comoFila),
    pecho: filas.filter((f) => f.tipo === "pecho").map(comoFila),
  };
}

// Historial de pliegues y pesos de todo el plantel. Del más nuevo al más viejo.
export async function obtenerHistorialPlieguesPlantel(supabase) {
  const [pliegues, pesos] = await Promise.all([
    leerTodo(() =>
      supabase
        .from("pliegues")
        .select(
          "fecha, peso, talla, imc, pl_tricipital, pl_subescapular, pl_supraespinal, pl_abdominal, pl_muslo, pl_pantorrilla, sumatoria_6, peso_ideal, comentario, perfiles(nombre)",
        )
        .order("fecha", { ascending: false })
        .order("id"),
    ),
    leerTodo(() =>
      supabase.from("pesos").select("fecha, peso, perfiles(nombre)").order("fecha", { ascending: false }).order("id"),
    ),
  ]);
  return {
    pliegues: pliegues.map((p) => ({
      jugador: p.perfiles.nombre,
      fecha: fechaCorta(p.fecha),
      peso: numero(p.peso),
      talla: numero(p.talla), // en cm
      imc: numero(p.imc),
      plTricipital: numero(p.pl_tricipital),
      plSubescapular: numero(p.pl_subescapular),
      plSupraespinal: numero(p.pl_supraespinal),
      plAbdominal: numero(p.pl_abdominal),
      plMuslo: numero(p.pl_muslo),
      plPantorrilla: numero(p.pl_pantorrilla),
      sumatoria6: numero(p.sumatoria_6),
      pesoIdeal: numero(p.peso_ideal),
      comentario: p.comentario ?? "",
    })),
    pesos: pesos.map((p) => ({ jugador: p.perfiles.nombre, fecha: fechaCorta(p.fecha), peso: numero(p.peso) })),
  };
}

// "dd/mm/aaaa" -> Date, para ordenar cronológicamente.
function comoFecha(fechaCorta) {
  const [dd, mm, aa] = fechaCorta.split("/").map(Number);
  return new Date(aa, mm - 1, dd);
}

// Jugadores ACTIVOS con su propio historial de fuerza (sentadilla, pecho),
// pliegues y pesos, cada uno del más viejo al más nuevo (para el Dashboard de
// análisis: promedios, evolución y comparar el último registro contra el primero).
// Igual que el dashboard de la v1: solo jugadores activos, sin la cuenta de
// prueba `hacoaj` ("Primera Hacoaj").
export async function obtenerJugadoresConHistorial(supabase) {
  const [{ jugadores, posiciones }, fuerza, composicion] = await Promise.all([
    obtenerJugadoresPanel(supabase),
    obtenerHistorialFuerzaPlantel(supabase),
    obtenerHistorialPlieguesPlantel(supabase),
  ]);

  const porOrden = (a, b) => comoFecha(a.fecha) - comoFecha(b.fecha);
  const de = (lista, nombre) => lista.filter((r) => r.jugador === nombre).sort(porOrden);

  const activos = jugadores.filter(
    (j) => j.rol_jugador === "jugador" && j.estado === "Activo" && j.usuario !== "hacoaj",
  );
  const conHistorial = activos.map((j) => ({
    ...j,
    fuerzaSent: de(fuerza.sentadilla, j.nombre),
    fuerzaPecho: de(fuerza.pecho, j.nombre),
    pliegues: de(composicion.pliegues, j.nombre),
    pesos: de(composicion.pesos, j.nombre),
  }));

  return {
    jugadores: conHistorial,
    posiciones: [...new Set(conHistorial.map((j) => j.posicion).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
  };
}
