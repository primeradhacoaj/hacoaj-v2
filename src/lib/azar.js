// Generador de números "al azar" con semilla fija: con la misma semilla da
// siempre la misma secuencia (0 ≤ n < 1). Sirve para los datos de prueba, que
// tienen que verse igual en cada recarga.
export function generador(semilla) {
  let x = semilla;
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}
