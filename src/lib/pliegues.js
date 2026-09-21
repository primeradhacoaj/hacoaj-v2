// Cálculos de la pantalla de pliegues. Son funciones simples, sin estado:
// reciben un dato y devuelven otro. Copian la lógica de la v1.

import { aNumero } from "@/lib/fuerza";

// Estado según la sumatoria de 6 pliegues (en milímetros). Referencia estimada
// de la B Nacional: menos de 50 bueno, de 50 a 60 regular, más de 60 alto.
export function estadoPliegues(sumatoria) {
  const numero = aNumero(sumatoria);
  if (numero === null) return { tono: "red", texto: "Sin objetivo" };
  if (numero < 50) return { tono: "green", texto: "✓ Bueno" };
  if (numero <= 60) return { tono: "yellow", texto: "Regular" };
  return { tono: "red", texto: "Alto" };
}

// Frase sobre cuánto falta para llegar al peso ideal (o vacío si falta un dato).
export function textoDiferenciaPeso(peso, pesoIdeal) {
  const actual = aNumero(peso);
  const ideal = aNumero(pesoIdeal);
  if (actual === null || ideal === null) return "";

  const diferencia = ideal - actual;
  const distancia = Math.abs(diferencia).toFixed(1);

  if (Math.abs(diferencia) < 0.5) return "Estás muy cerca de tu peso ideal.";
  if (diferencia > 0) return `Falta aumentar ${distancia} kg para llegar al peso ideal.`;
  return `Falta bajar ${distancia} kg para llegar al peso ideal.`;
}

// Estado para la tabla del historial (texto corto, sin el ✓ de la última medición).
export function estadoPlieguesTabla(sumatoria) {
  const numero = aNumero(sumatoria);
  if (numero === null) return { tono: "red", texto: "Sin dato" };
  if (numero < 50) return { tono: "green", texto: "Bueno" };
  if (numero <= 60) return { tono: "yellow", texto: "Regular" };
  return { tono: "red", texto: "Alto" };
}

// Color de la barra del gráfico de sumatoria según su valor.
export function colorBarraPliegues(sumatoria) {
  const numero = aNumero(sumatoria);
  if (numero === null) return "#94a3b8";
  if (numero < 50) return "#10b981";
  if (numero <= 60) return "#f59e0b";
  return "#ef4444";
}
