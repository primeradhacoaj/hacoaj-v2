import webpush from "web-push";
import { CLAVE_PUBLICA_VAPID } from "@/lib/push";

// Envío de notificaciones push. SOLO se usa del lado del servidor (Route Handlers): necesita la clave privada de
// VAPID, que vive únicamente en las variables de entorno (`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).

// Manda el aviso a una lista de dispositivos [{ endpoint, p256dh, auth }].
// Devuelve { enviados, fallidos, vencidos } (`vencidos` = direcciones que el servicio de push da por inexistentes:
// app desinstalada o permiso retirado; conviene borrarlas). Devuelve null si falta configurar las claves.
export async function enviarADispositivos(destinos, { titulo, mensaje, url }) {
  const privada = process.env.VAPID_PRIVATE_KEY;
  const contacto = process.env.VAPID_SUBJECT;
  if (!privada || !contacto) return null;
  webpush.setVapidDetails(contacto, CLAVE_PUBLICA_VAPID, privada);

  const carga = JSON.stringify({ title: titulo, body: mensaje, url });
  const resultados = await Promise.allSettled(
    destinos.map((d) =>
      webpush.sendNotification(
        { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
        carga,
        { TTL: 60 * 60 * 24 }, // si el celular está apagado, el aviso espera hasta 24 h
      ),
    ),
  );

  let enviados = 0;
  const vencidos = [];
  resultados.forEach((resultado, i) => {
    if (resultado.status === "fulfilled") enviados += 1;
    else if ([404, 410].includes(resultado.reason?.statusCode)) vencidos.push(destinos[i].endpoint);
  });
  return { enviados, fallidos: destinos.length - enviados, vencidos };
}

// Envío pedido por una persona del cuerpo técnico (usa su sesión).
//
// Los destinatarios los entrega la base con `push_destinatarios`, que verifica que quien pide sea técnico o
// administrador (el cliente de Supabase que se recibe es el de la sesión de quien está enviando).
// `perfilIds` nulo = todos los jugadores activos. Devuelve:
//   { ok: true, enviados, fallidos, vencidas, sinAviso }   sinAviso = cuántas de las personas pedidas no tienen
//                                                           ningún dispositivo suscripto
//   { ok: false, estado, error }
export async function enviarPush(supabase, { titulo, mensaje, url, perfilIds = null }) {
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    return { ok: false, estado: 500, error: "Las notificaciones no están configuradas en el servidor." };
  }

  const { data: destinos, error } = await supabase.rpc("push_destinatarios", { p_perfil_ids: perfilIds });
  if (error) {
    const prohibido = error.code === "42501";
    return { ok: false, estado: prohibido ? 403 : 500, error: prohibido ? "No tenés permiso para enviar notificaciones." : "No se pudo leer a los destinatarios." };
  }

  const sinAviso = perfilIds ? perfilIds.length - new Set(destinos.map((d) => d.perfil_id)).size : 0;
  if (destinos.length === 0) return { ok: true, enviados: 0, fallidos: 0, vencidas: 0, sinAviso };

  const envio = await enviarADispositivos(destinos, { titulo, mensaje, url });
  let borradas = 0;
  if (envio.vencidos.length > 0) {
    const { data } = await supabase.rpc("push_quitar_vencidas", { p_endpoints: envio.vencidos });
    borradas = data ?? 0;
  }
  return { ok: true, enviados: envio.enviados, fallidos: envio.fallidos, vencidas: borradas, sinAviso };
}
