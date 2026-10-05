import { NextResponse } from "next/server";
import { validarNotificacion } from "@/lib/notificaciones";
import { enviarPush } from "@/lib/pushServidor";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs"; // la librería de envío necesita Node

// POST /api/push/enviar
//   { titulo, mensaje, url, destinatarios: "todos" | [idPerfil, …] }
//   → { enviados, fallidos, vencidas, sinAviso }
//
// Solo cuerpo técnico y administrador (lo verifica la base al pedir los destinatarios).
export async function POST(request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Tenés que iniciar sesión." }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  const validado = validarNotificacion(cuerpo ?? {});
  if (!validado.ok) return NextResponse.json({ error: validado.error }, { status: 400 });

  const resultado = await enviarPush(supabase, validado.datos);
  if (!resultado.ok) return NextResponse.json({ error: resultado.error }, { status: resultado.estado });

  const { ok, ...resto } = resultado;
  return NextResponse.json(resto);
}
