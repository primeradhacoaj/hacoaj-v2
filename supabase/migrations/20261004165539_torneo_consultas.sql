-- Consultas agregadas del torneo. En la v1 eran SELECT con GROUP BY sobre el SQLite del
-- scraper (/api/torneo/equipo/.../plantel, /stats y /rankings). Traer las ~8.700 apariciones
-- al navegador para sumarlas allá sería lento, así que se calculan en la base y a la app
-- solo llega el resultado.
--
-- Son SECURITY INVOKER: corren con los permisos de quien llama, o sea que valen las
-- políticas de las tablas (todo el club lee el torneo). Se quita el permiso de ejecución
-- a `anon` y a `public`: sin sesión no se pueden llamar.

-- ── Plantel de un equipo con lo que jugó cada uno ───────────────────────────
create function public.torneo_plantel(p_equipo_id integer)
returns table (
  jugador_id integer, nombre_completo text, fecha_nacimiento date, puesto text,
  partidos bigint, titular bigint, minutos bigint, goles bigint, amarillas bigint, rojas bigint
)
language sql stable security invoker set search_path = ''
as $$
  select j.id, j.nombre_completo, j.fecha_nacimiento, j.puesto,
         count(a.id),
         coalesce(sum(a.titular::int), 0),
         coalesce(sum(a.minutos_jugados), 0),
         coalesce(sum(a.goles), 0),
         coalesce(sum(a.amarilla), 0),
         coalesce(sum(a.roja), 0)
  from public.torneo_jugadores j
  left join public.torneo_apariciones a on a.jugador_id = j.id
  where exists (
    select 1 from public.torneo_jugador_equipo je
    where je.jugador_id = j.id and je.equipo_id = p_equipo_id
  )
  group by j.id
  order by case j.puesto
             when 'Arquero' then 1 when 'Defensor' then 2
             when 'Volante' then 3 when 'Delantero' then 4 else 5
           end,
           j.nombre_completo
$$;

-- ── Estadísticas de un equipo en una temporada ("2026", "2025"… o "todos") ──
-- Solo cuentan partidos con resultado. Las tarjetas son las de los jugadores del plantel
-- actual en esa temporada (así lo hacía la v1).
create function public.torneo_stats_equipo(p_equipo_id integer, p_temporada text default '2026')
returns table (
  nombre text, pj bigint, pg bigint, pe bigint, pp bigint, gf bigint, gc bigint,
  amarillas bigint, rojas bigint
)
language sql stable security invoker set search_path = ''
as $$
  with eq as (
    select e.nombre from public.torneo_equipos e where e.id = p_equipo_id
  ),
  mios as (
    select case when p.equipo_local = eq.nombre then p.goles_local else p.goles_visitante end as a,
           case when p.equipo_local = eq.nombre then p.goles_visitante else p.goles_local end as b
    from public.torneo_partidos p
    cross join eq
    where (p.equipo_local = eq.nombre or p.equipo_visitante = eq.nombre)
      and p.goles_local is not null and p.goles_visitante is not null
      and (p_temporada = 'todos' or extract(year from p.fecha)::int = p_temporada::int)
  ),
  tarjetas as (
    select coalesce(sum(a.amarilla), 0) as amarillas, coalesce(sum(a.roja), 0) as rojas
    from public.torneo_apariciones a
    join public.torneo_partidos p on p.id = a.partido_id
    where a.jugador_id in (
            select je.jugador_id from public.torneo_jugador_equipo je where je.equipo_id = p_equipo_id)
      and (p_temporada = 'todos' or extract(year from p.fecha)::int = p_temporada::int)
  )
  select eq.nombre,
         count(m.a),
         count(m.a) filter (where m.a > m.b),
         count(m.a) filter (where m.a = m.b),
         count(m.a) filter (where m.a < m.b),
         coalesce(sum(m.a), 0),
         coalesce(sum(m.b), 0),
         t.amarillas,
         t.rojas
  from eq
  left join mios m on true
  cross join tarjetas t
  group by eq.nombre, t.amarillas, t.rojas
$$;

-- ── Ranking de jugadores ────────────────────────────────────────────────────
-- p_equipo: id del equipo o 'todos'. p_temporadas: años ('2026') o 'todos'.
-- De más a menos goles y, si empatan, por minutos.
create function public.torneo_rankings(p_equipo text default 'todos', p_temporadas text[] default array['2026'])
returns table (
  jugador_id integer, nombre_completo text, puesto text, equipo text, equipo_id integer,
  partidos bigint, titular bigint, minutos bigint, goles bigint, amarillas bigint, rojas bigint
)
language sql stable security invoker set search_path = ''
as $$
  select j.id, j.nombre_completo, j.puesto, e.nombre, e.id,
         count(*),
         coalesce(sum(a.titular::int), 0),
         coalesce(sum(a.minutos_jugados), 0),
         coalesce(sum(a.goles), 0),
         coalesce(sum(a.amarilla), 0),
         coalesce(sum(a.roja), 0)
  from public.torneo_apariciones a
  join public.torneo_jugadores j on j.id = a.jugador_id
  join public.torneo_jugador_equipo je on je.jugador_id = j.id
  join public.torneo_equipos e on e.id = je.equipo_id
  join public.torneo_partidos p on p.id = a.partido_id
  where ('todos' = any (p_temporadas) or extract(year from p.fecha)::text = any (p_temporadas))
    and (p_equipo = 'todos' or je.equipo_id = p_equipo::int)
  group by j.id, e.id
  order by 9 desc, 8 desc, j.id
$$;

revoke execute on function public.torneo_plantel(integer) from public, anon;
revoke execute on function public.torneo_stats_equipo(integer, text) from public, anon;
revoke execute on function public.torneo_rankings(text, text[]) from public, anon;
grant execute on function public.torneo_plantel(integer) to authenticated;
grant execute on function public.torneo_stats_equipo(integer, text) to authenticated;
grant execute on function public.torneo_rankings(text, text[]) to authenticated;
