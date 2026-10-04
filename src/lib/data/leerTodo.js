// Supabase devuelve como máximo 1000 filas por pedido: las tablas grandes (historiales,
// encuestas…) se leen por tandas. `construir` arma la consulta desde cero en cada tanda
// (un builder de supabase-js se ejecuta una sola vez) y debe incluir un `order` estable.
const TANDA = 1000;

export async function leerTodo(construir) {
  const filas = [];
  for (let desde = 0; ; desde += TANDA) {
    const { data, error } = await construir().range(desde, desde + TANDA - 1);
    if (error) throw new Error(error.message);
    filas.push(...data);
    if (data.length < TANDA) return filas;
  }
}
