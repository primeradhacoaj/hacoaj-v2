// Cálculos y formato de la pantalla de fuerza. Son funciones simples, sin
// estado: reciben un dato y devuelven otro. Copian la lógica de la v1.

// Los datos pueden venir como número, texto con coma ("1,25") o vacíos.
export function aNumero(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor === "number") return valor;
  const numero = parseFloat(String(valor).replace(",", "."));
  return Number.isNaN(numero) ? null : numero;
}

// Número con decimales fijos, o `vacio` ("--" por defecto) si no hay dato.
export function formatear(valor, decimales, vacio = "--") {
  const numero = aNumero(valor);
  return numero === null ? vacio : numero.toFixed(decimales);
}

// Fecha para mostrar. Google Sheets a veces entrega un número de serie
// (ej. 45723) en vez de un texto; ese caso se convierte a fecha.
export function fechaLegible(fecha) {
  if (!fecha) return "";
  const numero = aNumero(fecha);
  if (numero !== null && numero > 40000) {
    return new Date((numero - 25569) * 86400000).toLocaleDateString("es-AR");
  }
  return String(fecha);
}

// Estado según qué tan cerca está la fuerza relativa del objetivo.
//   ratio >= 1    verde   objetivo alcanzado
//   ratio >= 0.8  amarillo cerca del objetivo
//   menos         rojo    todavía se puede mejorar
export function estadoProgreso(ratio) {
  if (ratio >= 1) return { tono: "green", texto: "✓ Objetivo alcanzado" };
  if (ratio >= 0.8) return { tono: "yellow", texto: "↑ Cerca del objetivo" };
  return { tono: "red", texto: "Aun puedes mejorar!" };
}

// Diferencia contra el test anterior, o null si falta alguno de los dos.
export function diferencia(actual, anterior) {
  const a = aNumero(actual);
  const b = aNumero(anterior);
  return a !== null && b !== null ? a - b : null;
}

// Marca "ya vista" la última medición para mostrar "Nuevas métricas" solo la
// primera vez. Se guarda en el navegador con estas mismas claves que la v1.
export const CLAVE_VISTO_PECHO = "fuerza_seen_pecho";
export const CLAVE_VISTO_SENTADILLA = "fuerza_seen_sent";

export function esNuevo(clave, fecha) {
  if (!fecha) return false;
  try {
    return window.localStorage.getItem(clave) !== String(fecha);
  } catch {
    return false;
  }
}

export function marcarComoVisto(clave, fecha) {
  if (!fecha) return;
  try {
    window.localStorage.setItem(clave, String(fecha));
  } catch {
    // sin localStorage simplemente no se recuerda
  }
}
