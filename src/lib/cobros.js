// Reglas compartidas de los cobros del plantel (las usan la pantalla del administrador y el servidor).

export const ESTADOS_COBRO = [
  { id: "pendiente", texto: "Pendiente" },
  { id: "pagado", texto: "Pagado" },
  { id: "cancelado", texto: "Cancelado" },
  { id: "reembolsado", texto: "Reembolsado" },
];

export const TEXTO_ESTADO = Object.fromEntries(ESTADOS_COBRO.map((e) => [e.id, e.texto]));

const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

// 15000 → "$ 15.000,00"
export function formatearPesos(monto) {
  return pesos.format(Number(monto) || 0);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuid(valor) {
  return typeof valor === "string" && UUID.test(valor);
}

// Valida lo que llega a la API para generar cobros. Devuelve { ok: true, datos } o { ok: false, error }.
export function validarNuevoCobro({ conceptoId, perfilIds, cantidad }) {
  if (!esUuid(conceptoId)) return { ok: false, error: "Elegí un concepto." };
  if (!Array.isArray(perfilIds) || perfilIds.length === 0 || perfilIds.length > 200) {
    return { ok: false, error: "Elegí al menos un jugador." };
  }
  if (!perfilIds.every(esUuid)) return { ok: false, error: "Hay un jugador que no es válido." };
  const unidades = Number(cantidad ?? 1);
  if (!Number.isInteger(unidades) || unidades < 1 || unidades > 100) {
    return { ok: false, error: "La cantidad tiene que estar entre 1 y 100." };
  }
  return { ok: true, datos: { conceptoId, perfilIds: [...new Set(perfilIds)], cantidad: unidades } };
}

// Texto para mandarle el link al jugador (por WhatsApp, por ejemplo).
export function mensajeDeCobro({ jugador, concepto, monto, link }) {
  const nombre = String(jugador ?? "").split(" ")[0];
  return `Hola ${nombre}! Te paso el link para pagar "${concepto}" (${formatearPesos(monto)}): ${link}`;
}
