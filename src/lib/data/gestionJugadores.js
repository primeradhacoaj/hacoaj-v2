// CAPA DE DATOS para agregar, editar y eliminar jugadores (solo administrador). En la v1 esto
// modificaba la hoja "Usuarios"; ahora llama a funciones de la base (`agregar_jugador`,
// `editar_jugador`, `eliminar_jugador`) que hacen todo junto —incluido crear o cambiar la cuenta
// de login— en una sola transacción y solo si quien llama es administrador.
//
// Reciben el cliente de Supabase del navegador (`@/lib/supabase/client`).

const BUCKET = "avatares";
const MAXIMO_FOTO = 400; // px del lado mayor (la v1 también achicaba a 400)

// Los errores propios de las funciones (dato inválido, ya existe…) traen su mensaje en español;
// cualquier otro se resume.
function mensajeDe(error) {
  if (["22023", "23505", "23503"].includes(error.code)) return error.message;
  if (error.code === "42501") return "Solo el administrador puede hacer esto";
  return "No se pudo completar la operación. Probá de nuevo";
}

// datos: { nombre, rol, estado, posicion, pierna_habil, fecha_nacimiento, altura, usuario, contrasena }
export async function agregarJugador(supabase, datos) {
  const { data, error } = await supabase.rpc("agregar_jugador", { p: datos });
  if (error) return { ok: false, error: mensajeDe(error) };
  return { ok: true, id: data };
}

// cambios: solo los campos que cambiaron (ver `editar_jugador`).
export async function editarJugador(supabase, id, cambios) {
  const { error } = await supabase.rpc("editar_jugador", { p_perfil: id, p: cambios });
  if (error) return { ok: false, error: mensajeDe(error) };
  return { ok: true };
}

export async function eliminarJugador(supabase, id) {
  const { error } = await supabase.rpc("eliminar_jugador", { p_perfil: id });
  if (error) return { ok: false, error: mensajeDe(error) };
  return { ok: true };
}

// Cuántos datos tiene cargados un jugador (para avisar qué se perdería al eliminarlo).
export async function contarDatosDeJugador(supabase, id) {
  const contar = async (tabla) => {
    const { count, error } = await supabase.from(tabla).select("id", { count: "exact", head: true }).eq("perfil_id", id);
    if (error) throw new Error(error.message);
    return count ?? 0;
  };
  const [fuerza, pliegues, pesos, wellness, postPartido, partidos] = await Promise.all([
    contar("fuerza_tests"),
    contar("pliegues"),
    contar("pesos"),
    contar("wellness"),
    contar("post_partido"),
    contar("partidos_hacoaj_jugadores"),
  ]);
  return { fuerza, pliegues, pesos, wellness, postPartido, partidos };
}

// Achica la imagen elegida (máximo 400 px) y la devuelve como JPEG.
async function achicar(archivo) {
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, MAXIMO_FOTO / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error("No se pudo procesar la imagen"))), "image/jpeg", 0.9),
  );
}

// Sube una foto nueva (con nombre aleatorio, así la URL no se adivina) y la deja como foto del jugador.
// Si tenía otra, la borra. Devuelve { ok: true, path } o { ok: false, error }.
export async function cambiarFoto(supabase, perfilId, archivo, pathAnterior) {
  try {
    const blob = await achicar(archivo);
    const path = `${crypto.randomUUID()}.jpg`;
    const subida = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
    if (subida.error) return { ok: false, error: "No se pudo subir la foto" };

    const { error } = await supabase.from("perfiles").update({ foto_path: path }).eq("id", perfilId);
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      return { ok: false, error: "No se pudo guardar la foto" };
    }
    if (pathAnterior) await supabase.storage.from(BUCKET).remove([pathAnterior]);
    return { ok: true, path };
  } catch {
    return { ok: false, error: "No se pudo procesar la foto" };
  }
}

// Borra del almacenamiento la foto de un jugador que se eliminó.
export async function borrarFoto(supabase, path) {
  if (path) await supabase.storage.from(BUCKET).remove([path]);
}
