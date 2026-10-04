-- "Cargar partido": poder elegir a CUALQUIER jugador del plantel de Hacoaj en soloascenso, aunque
-- todavía no tenga perfil en la app.
--
-- Los partidos guardan al jugador por su perfil (`perfil_id`). De los 53 del plantel de Hacoaj en
-- el scraper, algunos no tienen perfil (nunca entraron a la app). Para no llenar la lista de
-- Jugadores con gente que nunca jugó, el perfil NO se crea de antemano: la pantalla ofrece a esos
-- jugadores con el id "t:<id del jugador del torneo>" y esta función les crea el perfil recién
-- cuando se los usa en un partido que se guarda (jugador, inactivo, sin login), y lo vincula con
-- su jugador del torneo para que no se repita.

-- Devuelve el perfil del jugador del torneo, creándolo si hace falta. SECURITY DEFINER porque
-- escribe en `torneo_jugadores` (que la app no puede modificar) y en `perfiles`: por eso se
-- verifica adentro que quien llama sea el administrador.
create function private.perfil_de_jugador_torneo(p_jugador_id integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jugador public.torneo_jugadores%rowtype;
  v_perfil  uuid;
begin
  if private.rol_actual() is distinct from 'administrador' then
    raise exception 'Solo el administrador puede hacer esto' using errcode = '42501';
  end if;

  select * into v_jugador from public.torneo_jugadores where id = p_jugador_id;
  if not found then
    raise exception 'No existe el jugador % del torneo', p_jugador_id using errcode = '23503';
  end if;
  if v_jugador.perfil_id is not null then
    return v_jugador.perfil_id;
  end if;

  -- "APELLIDO, NOMBRE" -> "Nombre Apellido"
  insert into public.perfiles (nombre, rol, estado, fecha_nacimiento)
  values (
    initcap(lower(trim(split_part(v_jugador.nombre_completo, ',', 2))))
      || ' ' || initcap(lower(trim(split_part(v_jugador.nombre_completo, ',', 1)))),
    'jugador',
    'inactivo',
    v_jugador.fecha_nacimiento
  )
  returning id into v_perfil;

  update public.torneo_jugadores set perfil_id = v_perfil where id = p_jugador_id;
  return v_perfil;
end;
$$;

revoke execute on function private.perfil_de_jugador_torneo(integer) from public, anon;
grant execute on function private.perfil_de_jugador_torneo(integer) to authenticated;

-- Id de un jugador tal como lo manda la pantalla: un uuid (perfil existente) o "t:123".
create function private.resolver_jugador(p_id text)
returns uuid
language sql
set search_path = ''
as $$
  select case
    when p_id is null or p_id = '' then null
    when p_id like 't:%' then private.perfil_de_jugador_torneo(substr(p_id, 3)::integer)
    else p_id::uuid
  end;
$$;

revoke execute on function private.resolver_jugador(text) from public, anon;
grant execute on function private.resolver_jugador(text) to authenticated;

-- La misma función de guardado de antes, pero pasando cada id de jugador por `resolver_jugador`.
create or replace function public.guardar_partido_hacoaj(p jsonb)
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
    private.resolver_jugador(p ->> 'capitan_id'),
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
    private.resolver_jugador(j ->> 'perfil_id'),
    nullif(j ->> 'posicion', ''),
    coalesce((j ->> 'titular')::boolean, false),
    coalesce((j ->> 'minutos')::smallint, 0)
  from jsonb_array_elements(coalesce(p -> 'jugadores', '[]'::jsonb)) as j;

  insert into public.partidos_hacoaj_goles (partido_id, perfil_id, asistencia_de_id, minuto)
  select
    v_id,
    private.resolver_jugador(g ->> 'perfil_id'),
    private.resolver_jugador(g ->> 'asistencia_de_id'),
    nullif(g ->> 'minuto', '')::smallint
  from jsonb_array_elements(coalesce(p -> 'goles', '[]'::jsonb)) as g;

  insert into public.partidos_hacoaj_cambios (partido_id, jugador_entra_id, jugador_sale_id, minuto)
  select
    v_id,
    private.resolver_jugador(c ->> 'entra_id'),
    private.resolver_jugador(c ->> 'sale_id'),
    nullif(c ->> 'minuto', '')::smallint
  from jsonb_array_elements(coalesce(p -> 'cambios', '[]'::jsonb)) as c;

  insert into public.partidos_hacoaj_tarjetas (partido_id, perfil_id, tipo)
  select
    v_id,
    private.resolver_jugador(t ->> 'perfil_id'),
    t ->> 'tipo'
  from jsonb_array_elements(coalesce(p -> 'tarjetas', '[]'::jsonb)) as t;

  return v_id;
end;
$$;
