import { NextResponse } from "next/server";
import { esUuid, formatearPesos } from "@/lib/cobros";
import { firmaValida, mercadoPagoConfigurado, obtenerPago } from "@/lib/mercadoPago";
import { enviarADispositivos } from "@/lib/pushServidor";
import { rpcConSecreto } from "@/lib/rpcConSecreto";

export const runtime = "nodejs"; // la firma usa node:crypto y el aviso usa la librería de push
export const dynamic = "force-dynamic";

// POST /api/webhooks/mercadopago → aviso de Mercado Pago (servidor a servidor) cada vez que un pago cambia.
//
// Es público (no hay sesión de nadie), así que se protege solo:
//   1. valida la firma `x-signature` con el Webhook Secret: sin ella, cualquiera podría mandar avisos falsos;
//   2. NO confía en el cuerpo (trae apenas el id): consulta el pago real con `GET /v1/payments/:id`;
//   3. concilia con `cobros_conciliar` usando `external_reference` (el id del pedido), que la base protege con el
//      secreto del servidor y que ignora avisos repetidos o fuera de orden.
//
// Responde 200 apenas el pago quedó conciliado. Si algo falla de nuestro lado responde 500 para que Mercado
// Pago reintente (lo hace de forma escalonada durante horas); si el aviso no nos sirve (otro tipo de evento, pago
// que no es de un pedido nuestro) responde 200 igual, para que no insista.
export async function POST(request) {
  if (!mercadoPagoConfigurado() || !process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Mercado Pago no está configurado" }, { status: 503 });
  }

  const url = new URL(request.url);
  const cuerpo = await request.json().catch(() => ({}));
  const idDato = url.searchParams.get("data.id") ?? (cuerpo?.data?.id != null ? String(cuerpo.data.id) : null);

  const firmado = firmaValida({
    firma: request.headers.get("x-signature"),
    idSolicitud: request.headers.get("x-request-id"),
    idDato: url.searchParams.get("data.id"),
  });
  if (!firmado) return NextResponse.json({ error: "Firma inválida" }, { status: 401 });

  const tipo = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? cuerpo?.type;
  if (tipo !== "payment" || !idDato) return NextResponse.json({ ok: true, ignorado: true });

  try {
    const pago = await obtenerPago(idDato);
    if (!pago || !esUuid(pago.external_reference)) return NextResponse.json({ ok: true, ignorado: true });

    const resultado = await rpcConSecreto("cobros_conciliar", {
      p_pedido_id: pago.external_reference,
      p_mp_pago_id: String(pago.id),
      p_estado_mp: String(pago.status),
      p_monto: Number(pago.transaction_amount),
    });
    if (!resultado.encontrado) return NextResponse.json({ ok: true, ignorado: true });
    if (resultado.alerta) console.error("Cobro con monto distinto:", pago.external_reference, resultado.alerta);

    if (resultado.cambio && ["pagado", "reembolsado"].includes(resultado.estado)) {
      await avisarAlAdministrador(resultado);
    }
    return NextResponse.json({ ok: true, estado: resultado.estado });
  } catch (error) {
    console.error("Webhook de Mercado Pago:", error);
    return NextResponse.json({ error: "No se pudo procesar el aviso" }, { status: 500 });
  }
}

// Notificación push al celular del administrador. Si falla, no importa: el pago ya quedó conciliado.
async function avisarAlAdministrador({ estado, jugador, concepto, monto, destinos }) {
  try {
    if (destinos.length === 0) return;
    const pagado = estado === "pagado";
    const envio = await enviarADispositivos(destinos, {
      titulo: pagado ? "💰 Pago recibido" : "↩️ Pago reembolsado",
      mensaje: `${jugador}: ${concepto} (${formatearPesos(monto)})`,
      url: "/panel/cobros",
    });
    if (envio?.vencidos.length) await rpcConSecreto("tareas_quitar_vencidas", { p_endpoints: envio.vencidos });
  } catch (error) {
    console.error("Aviso de pago al administrador:", error);
  }
}
