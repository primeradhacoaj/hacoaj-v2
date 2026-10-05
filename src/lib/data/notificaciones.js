// Notificaciones push del lado del cuerpo técnico: a quiénes se puede avisar y el envío.
// `supabase` es el cliente de la sesión (el del servidor en las páginas, el del navegador en los componentes).

// Jugadores activos con la cantidad de dispositivos que tienen suscriptos. Solo técnico y administrador.
export async function obtenerResumenPush(supabase) {
  const { data, error } = await supabase.rpc("push_resumen_jugadores");
  if (error) return [];
  return data.map((j) => ({
    id: j.perfil_id,
    nombre: j.nombre,
    usuario: j.usuario,
    dispositivos: j.dispositivos,
    desde: j.desde,
  }));
}

// Pide al servidor que envíe el aviso.
//   destinatarios: "todos" o una lista de ids de perfil
// Devuelve { ok: true, enviados, fallidos, vencidas, sinAviso } o { ok: false, error }.
export async function enviarNotificacion({ titulo, mensaje, url, destinatarios }) {
  try {
    const respuesta = await fetch("/api/push/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, mensaje, url, destinatarios }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) return { ok: false, error: datos.error ?? "No se pudo enviar la notificación." };
    return { ok: true, ...datos };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor." };
  }
}
