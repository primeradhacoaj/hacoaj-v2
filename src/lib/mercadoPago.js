import { createHmac, timingSafeEqual } from "node:crypto";

// Cliente mínimo de Mercado Pago (Checkout Pro). SOLO se usa del lado del servidor (Route Handlers): el Access Token
// y el secreto del webhook viven únicamente en variables de entorno (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`) y no
// llegan nunca al navegador. Como Checkout Pro paga por redirección, no hace falta la Public Key.

const API = "https://api.mercadopago.com";

export function mercadoPagoConfigurado() {
  return Boolean(process.env.MP_ACCESS_TOKEN && process.env.MP_WEBHOOK_SECRET);
}

async function pedirAMercadoPago(ruta, opciones = {}) {
  const respuesta = await fetch(`${API}${ruta}`, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...opciones.headers,
    },
    cache: "no-store",
  });
  const datos = await respuesta.json().catch(() => ({}));
  return { ok: respuesta.ok, estado: respuesta.status, datos };
}

// Crea la preferencia de pago de un pedido y devuelve { id, link } (`link` = init_point, la dirección a la que se
// manda a pagar). `base` es el origen público de la app (https://…): de ahí salen las back_urls y la dirección del
// webhook. Mercado Pago no acepta direcciones locales, así que en desarrollo (http) se omiten.
//
//   pedido: { pedido_id, jugador, concepto, descripcion, cantidad, precio }  (lo que devuelve `cobros_crear_pedidos`)
export async function crearPreferencia(pedido, base) {
  const publica = base.startsWith("https://");
  const cuerpo = {
    items: [
      {
        id: pedido.pedido_id,
        title: pedido.concepto,
        description: pedido.descripcion || undefined,
        quantity: pedido.cantidad,
        unit_price: Number(pedido.precio),
        currency_id: "ARS",
      },
    ],
    payer: { name: pedido.jugador },
    // El id del pedido vuelve intacto en el pago: es lo que permite conciliarlo con la base.
    external_reference: pedido.pedido_id,
    back_urls: {
      success: `${base}/pago/resultado?estado=exito`,
      pending: `${base}/pago/resultado?estado=pendiente`,
      failure: `${base}/pago/resultado?estado=fallo`,
    },
    statement_descriptor: "HACOAJ",
    ...(publica && { auto_return: "approved", notification_url: `${base}/api/webhooks/mercadopago` }),
  };

  const { ok, estado, datos } = await pedirAMercadoPago("/checkout/preferences", {
    method: "POST",
    // Si se repite el pedido (reintento de red), Mercado Pago devuelve la misma preferencia en vez de crear otra.
    headers: { "X-Idempotency-Key": pedido.pedido_id },
    body: JSON.stringify(cuerpo),
  });
  if (!ok || !datos.id || !datos.init_point) {
    console.error("Mercado Pago no creó la preferencia:", estado, datos?.message ?? datos?.error);
    throw new Error(`Mercado Pago rechazó la preferencia (${estado})`);
  }
  return { id: datos.id, link: datos.init_point };
}

// Pide a Mercado Pago el pago REAL. Es la fuente de verdad: el cuerpo del webhook solo trae el id.
// Devuelve null si el pago no existe (404); lanza un Error ante cualquier otra falla.
export async function obtenerPago(idPago) {
  const { ok, estado, datos } = await pedirAMercadoPago(`/v1/payments/${encodeURIComponent(idPago)}`);
  if (estado === 404) return null;
  if (!ok) throw new Error(`Mercado Pago respondió ${estado} al consultar el pago`);
  return datos;
}

// Valida la firma del webhook (cabecera `x-signature` = "ts=…,v1=…"). Mercado Pago firma con HMAC-SHA256, usando el
// Webhook Secret de la aplicación, este texto: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
// (si falta algún dato, esa parte se omite). Sin la firma correcta, cualquiera podría mandar avisos falsos.
export function firmaValida({ firma, idSolicitud, idDato }) {
  const secreto = process.env.MP_WEBHOOK_SECRET;
  if (!secreto || !firma) return false;

  const partes = Object.fromEntries(
    firma.split(",").map((parte) => {
      const [clave, ...valor] = parte.trim().split("=");
      return [clave, valor.join("=")];
    }),
  );
  if (!partes.ts || !partes.v1) return false;

  // Los ids alfanuméricos se firman en minúscula.
  const id = /^[a-z0-9]+$/i.test(idDato ?? "") ? idDato.toLowerCase() : idDato;
  let manifiesto = "";
  if (id) manifiesto += `id:${id};`;
  if (idSolicitud) manifiesto += `request-id:${idSolicitud};`;
  manifiesto += `ts:${partes.ts};`;

  const esperada = createHmac("sha256", secreto).update(manifiesto).digest("hex");
  const recibida = Buffer.from(partes.v1, "utf8");
  const calculada = Buffer.from(esperada, "utf8");
  return recibida.length === calculada.length && timingSafeEqual(recibida, calculada);
}
