// CAPA DE DATOS de "Cargar datos" (fuerza y pesos) del cuerpo técnico. En la v1 cada registro se
// agregaba como una fila a las hojas de Google Sheets; ahora va a la base.
//
// Reciben el cliente de Supabase como primer parámetro (el del servidor para leer la lista, el del
// navegador para el resto). Quién puede escribir lo decide la RLS: técnico y administrador.

function verificar({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// Para comparar nombres sin importar mayúsculas, tildes ni espacios de más (igual que el índice
// único de la base: "José  Pérez" y "jose perez" son la misma persona).
export const normalizarNombre = (nombre) =>
  nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

// Todas las personas a las que se les puede cargar datos: TODOS los jugadores, activos o no
// (sin la cuenta de prueba), con su foto.
export async function obtenerJugadoresParaCargar(supabase) {
  const filas = verificar(
    await supabase
      .from("perfiles")
      .select("id, nombre, estado, foto_path, usuario")
      .eq("rol", "jugador")
      .order("nombre"),
  );
  return filas
    .filter((p) => p.usuario !== "hacoaj")
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      activo: p.estado === "activo",
      foto: p.foto_path ? supabase.storage.from("avatares").getPublicUrl(p.foto_path).data.publicUrl : null,
    }));
}

// Último pesaje de un jugador: { peso, fecha: "aaaa-mm-dd" } o null si nunca se pesó.
export async function obtenerUltimoPeso(supabase, perfilId) {
  const [fila] = verificar(
    await supabase
      .from("pesos")
      .select("peso, fecha")
      .eq("perfil_id", perfilId)
      .order("fecha", { ascending: false })
      .limit(1),
  );
  return fila ? { peso: Number(fila.peso), fecha: fila.fecha } : null;
}

// Comentario del último test de fuerza de ese tipo ("" si no hay).
export async function obtenerUltimoComentario(supabase, perfilId, tipo) {
  const [fila] = verificar(
    await supabase
      .from("fuerza_tests")
      .select("comentario")
      .eq("perfil_id", perfilId)
      .eq("tipo", tipo)
      .order("fecha_test", { ascending: false })
      .limit(1),
  );
  return fila?.comentario?.trim() ?? "";
}

// Crea un jugador INACTIVO y sin login, para poder cargarle datos aunque no esté en la base.
// Lo único obligatorio es el nombre; el resto es opcional. Devuelve { ok: true, jugador } o
// { ok: false, error }.
export async function crearJugadorInactivo(supabase, { nombre, posicion, piernaHabil, fechaNacimiento }) {
  const { data, error } = await supabase
    .from("perfiles")
    .insert({
      nombre: nombre.trim().replace(/\s+/g, " "),
      rol: "jugador",
      estado: "inactivo",
      posicion: posicion || null,
      pierna_habil: piernaHabil || null,
      fecha_nacimiento: fechaNacimiento || null,
    })
    .select("id, nombre")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ya existe un jugador con ese nombre" };
    if (error.code === "42501") return { ok: false, error: "No tenés permiso para crear jugadores" };
    return { ok: false, error: "No se pudo crear el jugador. Probá de nuevo" };
  }
  return { ok: true, jugador: { id: data.id, nombre: data.nombre, activo: false, foto: null } };
}

const MENSAJE_ERROR = "No se pudieron guardar los registros. Revisá los datos e intentá de nuevo";

// Guarda varios tests de fuerza (y, si corresponde, su pesaje) en una sola transacción.
// registros: [{ perfil_id, peso, fecha_peso, peso_nuevo, vmp, carga, rm, frel, fecha_test, comentario }]
export async function guardarTestsFuerza(supabase, tipo, registros) {
  const { data, error } = await supabase.rpc("guardar_tests_fuerza", { p_tipo: tipo, p_registros: registros });
  if (error) return { ok: false, error: error.code === "42501" ? "No tenés permiso para cargar datos" : MENSAJE_ERROR };
  return { ok: true, guardados: data };
}

// Guarda varios pesajes de una vez. Un jugador tiene un solo pesaje por día: si ya había uno ese
// día, se reemplaza. registros: [{ perfil_id, fecha: "aaaa-mm-dd", peso }]
export async function guardarPesos(supabase, registros) {
  const { error } = await supabase.from("pesos").upsert(registros, { onConflict: "perfil_id,fecha" });
  if (error) return { ok: false, error: error.code === "42501" ? "No tenés permiso para cargar datos" : MENSAJE_ERROR };
  return { ok: true, guardados: registros.length };
}
