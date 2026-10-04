-- Cargar un partido de Hacoaj (pantalla "Cargar partido" del administrador).
--
-- Un partido son varias filas: el partido, los jugadores que participaron, los goles (con quién
-- asistió y el minuto), los cambios y las tarjetas. Esta función las guarda TODAS en una sola
-- transacción: si algo falla, no queda un partido a medias.
--
-- SECURITY INVOKER (por defecto): corre con los permisos de quien llama, así que las políticas
-- de las tablas siguen aplicando y solo el administrador puede ejecutarla con éxito.
--
-- Recibe un único JSON:
--   { fecha, rival, condicion, goles_hacoaj, goles_rival, formacion, capitan_id,
--     remates_arco_af, remates_af, remates_arco_ec, remates_ec, situaciones_af, situaciones_ec,
--     corners_af, corners_con_af, corners_ec, corners_con_ec, tl_af, tl_ec,   (todas opcionales)
--     jugadores: [{ perfil_id, posicion, titular, minutos }],
--     goles:     [{ perfil_id, asistencia_de_id, minuto }],   (asistencia y minuto opcionales)
--     cambios:   [{ entra_id, sale_id, minuto }],
--     tarjetas:  [{ perfil_id, tipo }] }
--
-- Si el scraper ya tiene el mismo partido (misma fecha, con Hacoaj), se vincula en
-- `partido_torneo_id` para que el detalle muestre también lo del rival. Dos partidos en la misma
-- fecha no se pueden cargar (`fecha` es única): la función falla con el error 23505.
create function public.guardar_partido_hacoaj(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id     uuid;
  v_fecha  date := (p ->> 'fecha')::date;
  v_torneo integer;
begin
  select t.id
    into v_torneo
  from public.torneo_partidos t
  where t.fecha = v_fecha
    and (t.equipo_local ilike '%hacoaj%' or t.equipo_visitante ilike '%hacoaj%')
  order by t.id
  limit 1;

  insert into public.partidos_hacoaj (
    fecha, rival, condicion, goles_hacoaj, goles_rival, formacion, capitan_id,
    remates_arco_af, remates_af, remates_arco_ec, remates_ec,
    situaciones_af, situaciones_ec,
    corners_af, corners_con_af, corners_ec, corners_con_ec,
    tl_af, tl_ec, partido_torneo_id
  )
  values (
    v_fecha,
    p ->> 'rival',
    p ->> 'condicion',
    (p ->> 'goles_hacoaj')::smallint,
    (p ->> 'goles_rival')::smallint,
    nullif(p ->> 'formacion', ''),
    nullif(p ->> 'capitan_id', '')::uuid,
    nullif(p ->> 'remates_arco_af', '')::smallint,
    nullif(p ->> 'remates_af', '')::smallint,
    nullif(p ->> 'remates_arco_ec', '')::smallint,
    nullif(p ->> 'remates_ec', '')::smallint,
    nullif(p ->> 'situaciones_af', '')::smallint,
    nullif(p ->> 'situaciones_ec', '')::smallint,
    nullif(p ->> 'corners_af', '')::smallint,
    nullif(p ->> 'corners_con_af', '')::smallint,
    nullif(p ->> 'corners_ec', '')::smallint,
    nullif(p ->> 'corners_con_ec', '')::smallint,
    nullif(p ->> 'tl_af', '')::smallint,
    nullif(p ->> 'tl_ec', '')::smallint,
    v_torneo
  )
  returning id into v_id;

  insert into public.partidos_hacoaj_jugadores (partido_id, perfil_id, posicion_partido, titular, minutos_jugados)
  select
    v_id,
    (j ->> 'perfil_id')::uuid,
    nullif(j ->> 'posicion', ''),
    coalesce((j ->> 'titular')::boolean, false),
    coalesce((j ->> 'minutos')::smallint, 0)
  from jsonb_array_elements(coalesce(p -> 'jugadores', '[]'::jsonb)) as j;

  insert into public.partidos_hacoaj_goles (partido_id, perfil_id, asistencia_de_id, minuto)
  select
    v_id,
    (g ->> 'perfil_id')::uuid,
    nullif(g ->> 'asistencia_de_id', '')::uuid,
    nullif(g ->> 'minuto', '')::smallint
  from jsonb_array_elements(coalesce(p -> 'goles', '[]'::jsonb)) as g;

  insert into public.partidos_hacoaj_cambios (partido_id, jugador_entra_id, jugador_sale_id, minuto)
  select
    v_id,
    (c ->> 'entra_id')::uuid,
    (c ->> 'sale_id')::uuid,
    nullif(c ->> 'minuto', '')::smallint
  from jsonb_array_elements(coalesce(p -> 'cambios', '[]'::jsonb)) as c;

  insert into public.partidos_hacoaj_tarjetas (partido_id, perfil_id, tipo)
  select
    v_id,
    (t ->> 'perfil_id')::uuid,
    t ->> 'tipo'
  from jsonb_array_elements(coalesce(p -> 'tarjetas', '[]'::jsonb)) as t;

  return v_id;
end;
$$;

revoke execute on function public.guardar_partido_hacoaj(jsonb) from public, anon;
grant execute on function public.guardar_partido_hacoaj(jsonb) to authenticated;
