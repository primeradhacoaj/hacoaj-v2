// Cobros del plantel (solo administrador): lo que lee la pantalla y lo que puede hacer.
// `supabase` es el cliente de la sesión (el del servidor en las páginas, el del navegador en los componentes).
// Las tablas solo las ve el administrador (RLS); para cualquier otro rol las consultas vuelven vacías.

// Conceptos, pedidos y jugadores activos a quienes se les puede cobrar.
export async function obtenerCobros(supabase) {
  const [conceptos, pedidos, jugadores] = await Promise.all([
    supabase
      .from("cobros_conceptos")
      .select("id, nombre, descripcion, precio, stock, activo")
      .order("creado_en", { ascending: false }),
    supabase
      .from("cobros_pedidos")
      .select(
        "id, cantidad, monto, estado, mp_estado, link_pago, creado_en, pagado_en, concepto:cobros_conceptos(id, nombre), jugador:perfiles(id, nombre)",
      )
      .order("creado_en", { ascending: false })
      .limit(500),
    supabase.from("perfiles").select("id, nombre").eq("rol", "jugador").eq("estado", "activo").order("nombre"),
  ]);

  return {
    conceptos: (conceptos.data ?? []).map((c) => ({ ...c, precio: Number(c.precio) })),
    pedidos: (pedidos.data ?? []).map((p) => ({ ...p, monto: Number(p.monto) })),
    jugadores: jugadores.data ?? [],
  };
}

// Crea o edita un concepto (`id` nulo = nuevo). Devuelve { ok: true } o { ok: false, error }.
export async function guardarConcepto(supabase, { id, nombre, descripcion, precio, stock, activo }) {
  const { error } = await supabase.rpc("cobros_guardar_concepto", {
    p_id: id ?? null,
    p_nombre: nombre,
    p_descripcion: descripcion || null,
    p_precio: precio,
    p_stock: stock === "" || stock == null ? null : Number(stock),
    p_activo: activo,
  });
  return error ? { ok: false, error: textoDeError(error, "No se pudo guardar el concepto.") } : { ok: true };
}

// Cancela un cobro que todavía no se pagó.
export async function cancelarCobro(supabase, pedidoId) {
  const { error } = await supabase.rpc("cobros_cancelar_pedido", { p_pedido_id: pedidoId });
  return error ? { ok: false, error: textoDeError(error, "No se pudo cancelar el cobro.") } : { ok: true };
}

// Pide al servidor que genere los pedidos y sus links de pago de Mercado Pago.
// Devuelve { ok: true, pedidos, fallidos } o { ok: false, error }.
export async function generarCobros({ conceptoId, perfilIds, cantidad }) {
  try {
    const respuesta = await fetch("/api/cobros/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conceptoId, perfilIds, cantidad }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) return { ok: false, error: datos.error ?? "No se pudieron generar los cobros." };
    return { ok: true, ...datos };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor." };
  }
}

// Los errores propios de la base (42501, 22023…) ya traen un mensaje en español para mostrar.
function textoDeError(error, porDefecto) {
  return ["42501", "22023", "23505"].includes(error.code) ? error.message : porDefecto;
}
