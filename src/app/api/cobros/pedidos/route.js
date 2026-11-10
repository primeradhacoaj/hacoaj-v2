import { NextResponse } from "next/server";
import { validarNuevoCobro } from "@/lib/cobros";
import { crearPreferencia, mercadoPagoConfigurado } from "@/lib/mercadoPago";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/cobros/pedidos
//   { conceptoId, perfilIds: [idPerfil, …], cantidad }
//   → { pedidos: [{ id, perfilId, jugador, concepto, monto, link }], fallidos: [{ jugador, error }] }
//
// Solo el administrador (lo verifica la base al crear los pedidos). Por cada jugador crea un pedido pendiente y le
// pide a Mercado Pago su preferencia de pago; el link (init_point) queda guardado en el pedido. Si Mercado Pago
// rechaza alguna preferencia, ese pedido se cancela y se informa aparte.
export async function POST(request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Tenés que iniciar sesión." }, { status: 401 });

  if (!mercadoPagoConfigurado()) {
    return NextResponse.json({ error: "Mercado Pago no está configurado en el servidor." }, { status: 500 });
  }

  const cuerpo = await request.json().catch(() => null);
  const validado = validarNuevoCobro(cuerpo ?? {});
  if (!validado.ok) return NextResponse.json({ error: validado.error }, { status: 400 });
  const { conceptoId, perfilIds, cantidad } = validado.datos;

  const { data: creados, error } = await supabase.rpc("cobros_crear_pedidos", {
    p_concepto_id: conceptoId,
    p_perfil_ids: perfilIds,
    p_cantidad: cantidad,
  });
  if (error) {
    // 42501 sin permiso · 22023 dato inválido · 23505 ya hay un cobro pendiente: los mensajes ya vienen en español.
    const estado = error.code === "42501" ? 403 : ["22023", "23505"].includes(error.code) ? 400 : 500;
    const mensaje = estado === 500 ? "No se pudieron crear los cobros." : error.message;
    return NextResponse.json({ error: mensaje }, { status: estado });
  }

  const base = new URL(request.url).origin;
  const pedidos = [];
  const fallidos = [];
  for (const pedido of creados) {
    try {
      const preferencia = await crearPreferencia(pedido, base);
      const { error: errorGuardado } = await supabase.rpc("cobros_guardar_preferencia", {
        p_pedido_id: pedido.pedido_id,
        p_preferencia_id: preferencia.id,
        p_link: preferencia.link,
      });
      if (errorGuardado) throw new Error("No se pudo guardar el link de pago");
      pedidos.push({
        id: pedido.pedido_id,
        perfilId: pedido.perfil_id,
        jugador: pedido.jugador,
        concepto: pedido.concepto,
        monto: pedido.monto,
        link: preferencia.link,
      });
    } catch (falla) {
      console.error("Cobro sin link de pago:", falla);
      await supabase.rpc("cobros_cancelar_pedido", { p_pedido_id: pedido.pedido_id });
      fallidos.push({ jugador: pedido.jugador, error: "Mercado Pago no pudo generar el link de pago." });
    }
  }

  return NextResponse.json({ pedidos, fallidos });
}
