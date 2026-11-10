-- Cobros del plantel con Mercado Pago (solo administrador).
--
-- El administrador define CONCEPTOS (cuota, camiseta, tercer tiempo…) y genera un PEDIDO por cada jugador al que
-- se lo cobra. Cada pedido tiene su link de pago de Mercado Pago (Checkout Pro). El estado del pedido NO lo cambia
-- quien vuelve del pago: lo concilia el webhook (servidor a servidor) después de consultar el pago real.
--
-- · Las tablas solo las LEE el administrador (RLS). Nadie escribe directo: todo pasa por funciones.
-- · Las funciones del administrador verifican adentro que quien llama lo sea (`private.exigir_administrador`).
-- · `cobros_conciliar` la llama el webhook, que no tiene sesión de ninguna persona: igual que las tareas diarias,
--   pide el secreto del servidor (guardado solo como huella en `private.secretos_tareas`).
--
-- Errores propios (con mensaje en español para mostrar):
--   42501 sin permiso · 22023 dato inválido · 23505 ya existe

-- ── Conceptos ───────────────────────────────────────────────────────────────

create table public.cobros_conceptos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (char_length(btrim(nombre)) between 1 and 80),
  descripcion text check (descripcion is null or char_length(descripcion) <= 200),
  precio      numeric(12, 2) not null check (precio > 0 and precio <= 10000000),
  stock       integer check (stock is null or stock >= 0),  -- null = sin control de stock
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- ── Pedidos (uno por jugador y cobro; su id viaja a Mercado Pago como `external_reference`) ──

create table public.cobros_pedidos (
  id               uuid primary key default gen_random_uuid(),
  concepto_id      uuid not null references public.cobros_conceptos (id) on delete restrict,
  perfil_id        uuid not null references public.perfiles (id) on delete restrict,
  cantidad         integer not null default 1 check (cantidad between 1 and 100),
  monto            numeric(12, 2) not null check (monto > 0),  -- precio × cantidad al momento de crear el pedido
  estado           text not null default 'pendiente'
                   check (estado in ('pendiente', 'pagado', 'cancelado', 'reembolsado')),
  mp_estado        text,         -- último `status` informado por Mercado Pago (approved, pending, rejected…)
  mp_pago_id       text,         -- id del pago en Mercado Pago
  preferencia_id   text,         -- id de la preferencia de pago
  link_pago        text,         -- init_point: el link que se le manda al jugador
  stock_descontado boolean not null default false,
  creado_en        timestamptz not null default now(),
  pagado_en        timestamptz,
  actualizado_en   timestamptz not null default now()
);

create index cobros_pedidos_perfil_idx on public.cobros_pedidos (perfil_id);
create index cobros_pedidos_concepto_idx on public.cobros_pedidos (concepto_id);
create index cobros_pedidos_estado_idx on public.cobros_pedidos (estado);

-- ── Registro de notificaciones recibidas del webhook (auditoría) ─────────────

create table public.cobros_eventos (
  id          bigint generated always as identity primary key,
  pedido_id   uuid references public.cobros_pedidos (id) on delete set null,
  mp_pago_id  text,
  mp_estado   text,
  resultado   text not null,  -- cambio · sin_cambio · monto_distinto · pedido_desconocido
  recibido_en timestamptz not null default now()
);

create index cobros_eventos_pedido_idx on public.cobros_eventos (pedido_id);

-- ── Permisos: solo el administrador lee; nadie escribe directo ───────────────

alter table public.cobros_conceptos enable row level security;
alter table public.cobros_pedidos enable row level security;
alter table public.cobros_eventos enable row level security;

create policy "Solo el administrador ve los conceptos de cobro"
  on public.cobros_conceptos for select to authenticated
  using ((select private.rol_actual()) = 'administrador');

create policy "Solo el administrador ve los pedidos de cobro"
  on public.cobros_pedidos for select to authenticated
  using ((select private.rol_actual()) = 'administrador');

create policy "Solo el administrador ve los eventos de cobro"
  on public.cobros_eventos for select to authenticated
  using ((select private.rol_actual()) = 'administrador');

revoke all on public.cobros_conceptos, public.cobros_pedidos, public.cobros_eventos from anon, authenticated;
grant select on public.cobros_conceptos, public.cobros_pedidos, public.cobros_eventos to authenticated;

-- ── Funciones del administrador ──────────────────────────────────────────────

-- Crea o edita un concepto (p_id nulo = nuevo). Devuelve su id.
create function public.cobros_guardar_concepto(
  p_id          uuid,
  p_nombre      text,
  p_descripcion text,
  p_precio      numeric,
  p_stock       integer,
  p_activo      boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_desc   text := nullif(btrim(coalesce(p_descripcion, '')), '');
  v_id     uuid;
begin
  perform private.exigir_administrador();
  if v_nombre = '' or char_length(v_nombre) > 80 then
    raise exception 'El nombre tiene que tener entre 1 y 80 caracteres' using errcode = '22023';
  end if;
  if v_desc is not null and char_length(v_desc) > 200 then
    raise exception 'La descripción admite hasta 200 caracteres' using errcode = '22023';
  end if;
  if p_precio is null or p_precio <= 0 or p_precio > 10000000 then
    raise exception 'El precio tiene que ser mayor a 0' using errcode = '22023';
  end if;
  if p_stock is not null and p_stock < 0 then
    raise exception 'El stock no puede ser negativo' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.cobros_conceptos (nombre, descripcion, precio, stock, activo)
    values (v_nombre, v_desc, round(p_precio, 2), p_stock, coalesce(p_activo, true))
    returning id into v_id;
  else
    update public.cobros_conceptos
       set nombre = v_nombre, descripcion = v_desc, precio = round(p_precio, 2),
           stock = p_stock, activo = coalesce(p_activo, true)
     where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'El concepto no existe' using errcode = '22023';
    end if;
  end if;
  return v_id;
end;
$$;

-- Genera un pedido pendiente por cada jugador elegido. Devuelve lo que hace falta para armar la preferencia de pago.
create function public.cobros_crear_pedidos(
  p_concepto_id uuid,
  p_perfil_ids  uuid[],
  p_cantidad    integer default 1
)
returns table (
  pedido_id   uuid,
  perfil_id   uuid,
  jugador     text,
  concepto    text,
  descripcion text,
  cantidad    integer,
  monto       numeric,
  precio      numeric
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_concepto public.cobros_conceptos;
  v_ids      uuid[];
  v_cant     integer := coalesce(p_cantidad, 1);
  v_repetido text;
begin
  perform private.exigir_administrador();

  select * into v_concepto from public.cobros_conceptos where id = p_concepto_id;
  if not found or not v_concepto.activo then
    raise exception 'El concepto no existe o está desactivado' using errcode = '22023';
  end if;
  if v_cant < 1 or v_cant > 100 then
    raise exception 'La cantidad tiene que estar entre 1 y 100' using errcode = '22023';
  end if;

  select array_agg(distinct x) into v_ids from unnest(coalesce(p_perfil_ids, '{}')) as x;
  if v_ids is null or cardinality(v_ids) = 0 or cardinality(v_ids) > 200 then
    raise exception 'Elegí entre 1 y 200 jugadores' using errcode = '22023';
  end if;
  if (select count(*) from public.perfiles p where p.id = any (v_ids) and p.estado = 'activo') <> cardinality(v_ids) then
    raise exception 'Hay jugadores que no existen o están inactivos' using errcode = '22023';
  end if;

  if v_concepto.stock is not null and v_concepto.stock < v_cant * cardinality(v_ids) then
    raise exception 'No alcanza el stock (hay %, se piden %)', v_concepto.stock, v_cant * cardinality(v_ids)
      using errcode = '22023';
  end if;

  select p.nombre into v_repetido
  from public.cobros_pedidos o join public.perfiles p on p.id = o.perfil_id
  where o.concepto_id = p_concepto_id and o.estado = 'pendiente' and o.perfil_id = any (v_ids)
  limit 1;
  if v_repetido is not null then
    raise exception '% ya tiene un cobro pendiente de este concepto', v_repetido using errcode = '23505';
  end if;

  return query
  with nuevos as (
    insert into public.cobros_pedidos (concepto_id, perfil_id, cantidad, monto)
    select p_concepto_id, x, v_cant, round(v_concepto.precio * v_cant, 2)
    from unnest(v_ids) as x
    returning id, cobros_pedidos.perfil_id, cobros_pedidos.cantidad, cobros_pedidos.monto
  )
  select n.id, n.perfil_id, p.nombre, v_concepto.nombre, v_concepto.descripcion, n.cantidad, n.monto, v_concepto.precio
  from nuevos n join public.perfiles p on p.id = n.perfil_id
  order by p.nombre;
end;
$$;

-- Guarda la preferencia que devolvió Mercado Pago (id y link de pago) en un pedido pendiente.
create function public.cobros_guardar_preferencia(p_pedido_id uuid, p_preferencia_id text, p_link text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.exigir_administrador();
  update public.cobros_pedidos
     set preferencia_id = p_preferencia_id, link_pago = p_link, actualizado_en = now()
   where id = p_pedido_id and estado = 'pendiente';
end;
$$;

-- Cancela un pedido que todavía no se pagó.
create function public.cobros_cancelar_pedido(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text;
begin
  perform private.exigir_administrador();
  select estado into v_estado from public.cobros_pedidos where id = p_pedido_id for update;
  if v_estado is null then
    raise exception 'El cobro no existe' using errcode = '22023';
  end if;
  if v_estado <> 'pendiente' then
    raise exception 'Solo se puede cancelar un cobro pendiente' using errcode = '22023';
  end if;
  update public.cobros_pedidos set estado = 'cancelado', actualizado_en = now() where id = p_pedido_id;
end;
$$;

-- ── Conciliación (la llama el webhook con el estado REAL del pago, ya consultado a Mercado Pago) ─────────────
--
-- Reglas:
--  · `approved` → pagado (descuenta el stock una sola vez). Si el monto cobrado no coincide con el del pedido, no
--    cambia nada y queda registrado para revisar.
--  · `refunded` / `charged_back` → reembolsado (devuelve el stock).
--  · `rejected` / `cancelled` → cancelado, salvo que el pedido ya esté pagado.
--  · `pending` / `in_process` y demás → sigue pendiente (se guarda el estado de Mercado Pago).
--  · Una notificación repetida o fuera de orden no deshace un estado más avanzado.
-- Devuelve el resultado y los dispositivos del administrador para avisarle.
create function public.cobros_conciliar(
  p_secreto    text,
  p_pedido_id  uuid,
  p_mp_pago_id text,
  p_estado_mp  text,
  p_monto      numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped      public.cobros_pedidos;
  v_concepto public.cobros_conceptos;
  v_jugador  text;
  v_nuevo    text;
  v_cambio   boolean := false;
  v_alerta   text;
  v_destinos jsonb;
begin
  perform private.exigir_secreto_tareas(p_secreto);

  select * into v_ped from public.cobros_pedidos where id = p_pedido_id for update;
  if not found then
    insert into public.cobros_eventos (mp_pago_id, mp_estado, resultado) values (p_mp_pago_id, p_estado_mp, 'pedido_desconocido');
    return jsonb_build_object('encontrado', false);
  end if;

  select * into v_concepto from public.cobros_conceptos where id = v_ped.concepto_id for update;
  select nombre into v_jugador from public.perfiles where id = v_ped.perfil_id;

  v_nuevo := case p_estado_mp
    when 'approved' then 'pagado'
    when 'refunded' then 'reembolsado'
    when 'charged_back' then 'reembolsado'
    when 'rejected' then 'cancelado'
    when 'cancelled' then 'cancelado'
    else 'pendiente'
  end;

  if v_nuevo = 'pagado' and abs(coalesce(p_monto, 0) - v_ped.monto) > 0.01 then
    v_alerta := 'monto_distinto';
  elsif v_ped.estado = 'reembolsado' then
    null;  -- estado final
  elsif v_ped.estado = 'pagado' and v_nuevo in ('pendiente', 'cancelado') then
    null;  -- una notificación vieja no deshace un pago
  elsif v_nuevo = 'pendiente' and v_ped.estado <> 'pendiente' then
    null;  -- tampoco vuelve a pendiente un pedido ya cancelado
  elsif v_nuevo <> v_ped.estado then
    v_cambio := true;
  end if;

  if v_cambio then
    if v_nuevo = 'pagado' and not v_ped.stock_descontado then
      if v_concepto.stock is not null then
        update public.cobros_conceptos set stock = greatest(stock - v_ped.cantidad, 0) where id = v_concepto.id;
      end if;
      v_ped.stock_descontado := true;
    elsif v_nuevo = 'reembolsado' and v_ped.stock_descontado then
      if v_concepto.stock is not null then
        update public.cobros_conceptos set stock = stock + v_ped.cantidad where id = v_concepto.id;
      end if;
      v_ped.stock_descontado := false;
    end if;

    update public.cobros_pedidos
       set estado = v_nuevo,
           stock_descontado = v_ped.stock_descontado,
           pagado_en = case when v_nuevo = 'pagado' and pagado_en is null then now() else pagado_en end,
           actualizado_en = now()
     where id = v_ped.id;
  end if;

  if v_alerta is null then
    update public.cobros_pedidos
       set mp_estado = p_estado_mp, mp_pago_id = p_mp_pago_id, actualizado_en = now()
     where id = v_ped.id;
  end if;

  insert into public.cobros_eventos (pedido_id, mp_pago_id, mp_estado, resultado)
  values (v_ped.id, p_mp_pago_id, p_estado_mp, coalesce(v_alerta, case when v_cambio then 'cambio' else 'sin_cambio' end));

  select coalesce(jsonb_agg(jsonb_build_object('perfil_id', s.perfil_id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]'::jsonb)
    into v_destinos
  from public.push_suscripciones s
  join public.perfiles p on p.id = s.perfil_id
  where p.rol = 'administrador' and p.estado = 'activo';

  return jsonb_build_object(
    'encontrado', true,
    'cambio', v_cambio,
    'alerta', v_alerta,
    'estado', case when v_cambio then v_nuevo else v_ped.estado end,
    'jugador', v_jugador,
    'concepto', v_concepto.nombre,
    'monto', v_ped.monto,
    'destinos', v_destinos
  );
end;
$$;

revoke execute on function public.cobros_guardar_concepto(uuid, text, text, numeric, integer, boolean) from public, anon;
revoke execute on function public.cobros_crear_pedidos(uuid, uuid[], integer) from public, anon;
revoke execute on function public.cobros_guardar_preferencia(uuid, text, text) from public, anon;
revoke execute on function public.cobros_cancelar_pedido(uuid) from public, anon;
grant execute on function public.cobros_guardar_concepto(uuid, text, text, numeric, integer, boolean) to authenticated;
grant execute on function public.cobros_crear_pedidos(uuid, uuid[], integer) to authenticated;
grant execute on function public.cobros_guardar_preferencia(uuid, text, text) to authenticated;
grant execute on function public.cobros_cancelar_pedido(uuid) to authenticated;

-- El webhook no tiene sesión (usa la clave pública y el secreto), por eso va abierta a `anon`: la protección es el secreto.
revoke execute on function public.cobros_conciliar(text, uuid, text, text, numeric) from public;
grant execute on function public.cobros_conciliar(text, uuid, text, text, numeric) to anon, authenticated;
