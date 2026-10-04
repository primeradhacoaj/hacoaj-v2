-- Scraper de soloascenso.com.ar → Supabase.
--
-- En la v1 el scraper (GitHub Actions) escribía archivos que se commiteaban al repo. Ahora escribe directo
-- en las tablas `torneo_*`. Para eso usa un USUARIO DE BASE DE DATOS PROPIO (`scraper`) con permisos
-- mínimos, en vez de la clave de administrador de Supabase (que puede todo): solo toca las tablas del
-- torneo, su propio estado y el vínculo `partido_torneo_id` de los partidos de Hacoaj. No puede leer
-- perfiles, encuestas, datos físicos ni cuentas.
--
-- La contraseña NO está en este archivo: se le pone aparte (ALTER ROLE ... PASSWORD) y se guarda como
-- secreto de GitHub. Hasta entonces el usuario existe pero no puede iniciar sesión.

create role scraper login noinherit connection limit 3;
alter role scraper set statement_timeout = '5min';

grant usage on schema public to scraper;

-- ── Tablas del torneo: lee y escribe todo ───────────────────────────────────
-- `torneo_jugadores` es la excepción: nunca toca `perfil_id` (el vínculo con las personas de la app),
-- solo los datos que vienen de soloascenso.
grant select, insert, update, delete on
  public.torneo_equipos, public.torneo_jugador_equipo, public.torneo_partidos, public.torneo_apariciones,
  public.torneo_goles, public.torneo_cambios, public.torneo_tarjetas, public.torneo_posiciones,
  public.torneo_goleadores
  to scraper;
grant select, delete on public.torneo_jugadores to scraper;
grant insert (id, nombre_completo, fecha_nacimiento, puesto, url_slug) on public.torneo_jugadores to scraper;
grant update (nombre_completo, fecha_nacimiento, puesto, url_slug) on public.torneo_jugadores to scraper;
grant usage, select on all sequences in schema public to scraper;

do $$
declare
  t text;
begin
  foreach t in array array[
    'torneo_equipos', 'torneo_jugadores', 'torneo_jugador_equipo', 'torneo_partidos', 'torneo_apariciones',
    'torneo_goles', 'torneo_cambios', 'torneo_tarjetas', 'torneo_posiciones', 'torneo_goleadores'
  ]
  loop
    execute format(
      'create policy "El scraper gestiona %1$s" on public.%1$I for all to scraper using (true) with check (true)', t);
  end loop;
end;
$$;

-- ── Vincular los partidos de Hacoaj cargados a mano con los del scraper ─────
-- Solo puede leer esa tabla y cambiar la columna `partido_torneo_id`.
grant select on public.partidos_hacoaj to scraper;
grant update (partido_torneo_id) on public.partidos_hacoaj to scraper;
create policy "El scraper ve los partidos de Hacoaj" on public.partidos_hacoaj for select to scraper using (true);
create policy "El scraper vincula los partidos de Hacoaj" on public.partidos_hacoaj
  for update to scraper using (true) with check (true);

-- ── Próximos partidos del torneo ────────────────────────────────────────────
-- Los partidos que todavía no se jugaron no tienen síntesis (ni id) en soloascenso, así que no pueden
-- ir en `torneo_partidos`. Se guardan acá, tal como los publica el fixture, y se reemplazan en cada
-- corrida del scraper. Lo ve todo el club; solo escribe el scraper.
create table public.torneo_proximos (
  id          bigint generated always as identity primary key,
  temporada   smallint not null,
  jornada     smallint not null,
  fecha       date not null,
  hora        text,
  equipo_local      text not null,
  equipo_visitante  text not null,
  arbitro     text
);

create index torneo_proximos_fecha_idx on public.torneo_proximos (fecha);

alter table public.torneo_proximos enable row level security;
create policy "Todo el club ve los próximos partidos" on public.torneo_proximos for select to authenticated using (true);
create policy "El scraper gestiona torneo_proximos" on public.torneo_proximos for all to scraper using (true) with check (true);
grant select on public.torneo_proximos to authenticated;
grant select, insert, update, delete on public.torneo_proximos to scraper;

-- ── Estado del scraper (lo que ya fue scrapeado) ────────────────────────────
-- Equivale a la carpeta `checkpoints/` de la v1: permite que cada corrida diaria solo baje lo nuevo.
-- Nadie más que el scraper la ve (ni siquiera el administrador desde la app).
create table public.scraper_estado (
  nombre         text primary key,
  datos          jsonb not null,
  actualizado_en timestamptz not null default now()
);

alter table public.scraper_estado enable row level security;
create policy "Solo el scraper usa su estado" on public.scraper_estado for all to scraper using (true) with check (true);
grant select, insert, update, delete on public.scraper_estado to scraper;
