// Llama a una función de la base que NO usa sesión de ninguna persona sino el secreto del servidor (`CRON_SECRET`).
// Es el caso del cron de cumpleaños y del webhook de Mercado Pago: las funciones `tareas_*` y `cobros_conciliar`
// exigen el secreto (la base solo guarda su huella). SOLO se usa del lado del servidor.
//
// Devuelve lo que responde la función (o null si no devuelve nada). Si falla, lanza un Error.
export async function rpcConSecreto(funcion, args = {}) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) throw new Error("Falta CRON_SECRET");

  const respuesta = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${funcion}`, {
    method: "POST",
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_secreto: secreto, ...args }),
    cache: "no-store",
  });
  if (!respuesta.ok) throw new Error(`${funcion}: ${respuesta.status}`);
  const texto = await respuesta.text(); // algunas funciones no devuelven nada (204)
  return texto ? JSON.parse(texto) : null;
}
