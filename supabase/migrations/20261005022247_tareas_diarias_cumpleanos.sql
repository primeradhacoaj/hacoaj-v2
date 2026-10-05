-- Tareas automáticas diarias (por ahora, el aviso de cumpleaños; en la v1 era `cumples.yml` + `/api/check-cumples`).
--
-- Las dispara el cron de Vercel, que no tiene sesión de ninguna persona. En vez de darle una clave de
-- administrador de la base, las funciones de acá piden un SECRETO (`CRON_SECRET`, que solo conocen Vercel y
-- esta base): en `private.secretos_tareas` se guarda únicamente su huella (sha256), nunca el secreto.
-- Sin el secreto correcto, las funciones no devuelven nada.

create table private.secretos_tareas (
  nombre text primary key,
  huella text not null
);

-- Qué tarea ya corrió cada día: evita que el mismo aviso salga dos veces si el cron se dispara de nuevo.
create table private.tareas_diarias (
  tarea text not null,
  fecha  date not null,
  hora   time not null default (now() at time zone 'America/Argentina/Buenos_Aires')::time,
  primary key (tarea, fecha)
);

create function private.exigir_secreto_tareas(p_secreto text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(p_secreto, '') = ''
     or not exists (
       select 1 from private.secretos_tareas
       where nombre = 'cron' and huella = encode(sha256(convert_to(p_secreto, 'UTF8')), 'hex')
     ) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
end;
$$;

-- Cumpleaños de hoy (día y mes, hora de Argentina) entre las personas ACTIVAS, y los dispositivos de todas las
-- personas activas, que son quienes reciben el aviso (igual que en la v1). `ya_hecho` = la tarea ya corrió hoy.
-- El año 1900 es "no se sabe": el día y el mes igual valen.
create function public.tareas_cumples_pendientes(p_secreto text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  perform private.exigir_secreto_tareas(p_secreto);
  return jsonb_build_object(
    'fecha', v_hoy,
    'ya_hecho', exists (select 1 from private.tareas_diarias where tarea = 'cumples' and fecha = v_hoy),
    'cumpleaneros', coalesce((
      select jsonb_agg(p.nombre order by p.nombre)
      from public.perfiles p
      where p.estado = 'activo'
        and p.fecha_nacimiento is not null
        and extract(month from p.fecha_nacimiento) = extract(month from v_hoy)
        and extract(day from p.fecha_nacimiento) = extract(day from v_hoy)
    ), '[]'::jsonb),
    'destinos', coalesce((
      select jsonb_agg(jsonb_build_object('perfil_id', s.perfil_id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
      from public.push_suscripciones s
      join public.perfiles p on p.id = s.perfil_id
      where p.estado = 'activo'
    ), '[]'::jsonb)
  );
end;
$$;

create function public.tareas_marcar_hecha(p_secreto text, p_tarea text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.exigir_secreto_tareas(p_secreto);
  insert into private.tareas_diarias (tarea, fecha)
  values (p_tarea, (now() at time zone 'America/Argentina/Buenos_Aires')::date)
  on conflict do nothing;
end;
$$;

create function public.tareas_quitar_vencidas(p_secreto text, p_endpoints text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_borradas integer;
begin
  perform private.exigir_secreto_tareas(p_secreto);
  delete from public.push_suscripciones where endpoint = any (p_endpoints);
  get diagnostics v_borradas = row_count;
  return v_borradas;
end;
$$;

-- Se llaman sin sesión (con la clave pública y el secreto), por eso van abiertas a `anon`: la protección es el secreto.
revoke execute on function public.tareas_cumples_pendientes(text) from public;
revoke execute on function public.tareas_marcar_hecha(text, text) from public;
revoke execute on function public.tareas_quitar_vencidas(text, text[]) from public;
grant execute on function public.tareas_cumples_pendientes(text) to anon, authenticated;
grant execute on function public.tareas_marcar_hecha(text, text) to anon, authenticated;
grant execute on function public.tareas_quitar_vencidas(text, text[]) to anon, authenticated;
