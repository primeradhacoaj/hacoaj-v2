// Eventos del calendario del panel técnico: cumpleaños (tabla `perfiles`),
// partidos de Hacoaj, testeos de fuerza/pliegues y los eventos propios que
// carga el cuerpo técnico. En la v1 esto salía de `/api/calendario`.
//
// Por ahora solo se muestran los partidos YA jugados de Hacoaj; los próximos
// (goles vacíos en `torneo_partidos`) quedan para cuando se conecte el torneo.

import { obtenerPartidosHacoaj } from "./partidos";

function verificar({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

function claveDe(anio, mes, dia) {
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
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

  // Cumpleaños: todas las personas activas con fecha de nacimiento (jugadores, cuerpo técnico y staff).
  const personas = verificar(
    await supabase.from("perfiles").select("nombre, fecha_nacimiento").eq("estado", "activo").not("fecha_nacimiento", "is", null),
  );
  for (const p of personas) {
    const [, mesNacimiento, dia] = p.fecha_nacimiento.split("-").map(Number);
    if (mesNacimiento === mes) agregar(eventos, claveDe(anio, mes, dia), { tipo: "cumple", nombre: p.nombre });
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

  // Eventos propios que cargó el cuerpo técnico (tabla `eventos_calendario`).
  const primero = claveDe(anio, mes, 1);
  const ultimo = claveDe(anio, mes, new Date(anio, mes, 0).getDate());
  const { data: propios, error } = await supabase
    .from("eventos_calendario")
    .select("id, fecha, titulo, icono")
    .gte("fecha", primero)
    .lte("fecha", ultimo)
    .order("creado_en");
  if (error) throw new Error(error.message);
  for (const e of propios) {
    agregar(eventos, e.fecha, { tipo: "custom", id: e.id, titulo: e.titulo, icono: e.icono });
  }

  // Testeos: uno por fecha y tipo (el plantel entero se testea el mismo día).
  const agregarTesteos = (fechas, etiqueta) => {
    for (const fecha of new Set(fechas)) agregar(eventos, fecha, { tipo: "testeo", nombre: etiqueta });
  };
  const [fuerza, pliegues] = await Promise.all([
    supabase.from("fuerza_tests").select("tipo, fecha_test").gte("fecha_test", primero).lte("fecha_test", ultimo),
    supabase.from("pliegues").select("fecha").gte("fecha", primero).lte("fecha", ultimo),
  ]);
  const testsFuerza = verificar(fuerza);
  agregarTesteos(testsFuerza.filter((t) => t.tipo === "sentadilla").map((t) => t.fecha_test), "Testeo de Sentadilla");
  agregarTesteos(testsFuerza.filter((t) => t.tipo === "pecho").map((t) => t.fecha_test), "Testeo de Pecho");
  agregarTesteos(verificar(pliegues).map((t) => t.fecha), "Testeo de Pliegues");

  return eventos;
}
