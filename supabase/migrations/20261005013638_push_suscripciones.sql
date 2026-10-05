-- Suscripciones a las notificaciones push (Web Push). En la v1 vivían en un archivo JSON del servidor
-- (`push_subscriptions.json`) y en la hoja "PushSuscripciones".
--
-- Una suscripción es lo que el navegador de UN dispositivo entrega cuando la persona acepta los avisos:
-- una dirección (`endpoint`) y dos claves (`p256dh`, `auth`) con las que el servidor puede enviarle
-- notificaciones. Una persona puede tener varias (celular, compu…).
--
-- Cada persona solo VE las suyas. Las altas y bajas van por funciones (no por escritura directa a la
-- tabla) por un caso concreto: si dos personas usan el mismo dispositivo, el `endpoint` ya existe a nombre
-- de la primera y la segunda no podría tocarlo por RLS; con la función, el dispositivo pasa a quien
-- activó los avisos por último. (El cuerpo técnico podrá ver las de todos cuando se agregue el envío.)

create table public.push_suscripciones (
  id             uuid primary key default gen_random_uuid(),
  perfil_id      uuid not null references public.perfiles (id) on delete cascade,
  endpoint       text not null unique,
  p256dh         text not null,
  auth           text not null,
  user_agent     text,
  creada_en      timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

create index push_suscripciones_perfil_idx on public.push_suscripciones (perfil_id);

alter table public.push_suscripciones enable row level security;

create policy "Cada persona ve sus suscripciones push"
  on public.push_suscripciones for select to authenticated
  using (perfil_id = (select private.perfil_id_actual()));

grant select on public.push_suscripciones to authenticated;

-- Guarda (o actualiza) la suscripción de este dispositivo a nombre de quien está logueado.
create function public.registrar_suscripcion_push(
  p_endpoint   text,
  p_p256dh     text,
  p_auth       text,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil uuid := private.perfil_id_actual();
begin
  if v_perfil is null then
    raise exception 'Hay que iniciar sesión' using errcode = '42501';
  end if;
  if coalesce(p_endpoint, '') = '' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'Suscripción incompleta' using errcode = '22023';
  end if;

  insert into public.push_suscripciones (perfil_id, endpoint, p256dh, auth, user_agent)
  values (v_perfil, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set perfil_id = excluded.perfil_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, actualizada_en = now();
end;
$$;

-- Da de baja la suscripción de este dispositivo (solo si es de quien está logueado).
create function public.quitar_suscripcion_push(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_suscripciones
  where endpoint = p_endpoint and perfil_id = private.perfil_id_actual();
$$;

revoke execute on function public.registrar_suscripcion_push(text, text, text, text) from public, anon;
revoke execute on function public.quitar_suscripcion_push(text) from public, anon;
grant execute on function public.registrar_suscripcion_push(text, text, text, text) to authenticated;
grant execute on function public.quitar_suscripcion_push(text) to authenticated;
