-- Partidos de Hacoaj: los que carga el administrador (hojas "Partidos" y
-- "Partidos-jugador" de la v1), con goles, cambios y tarjetas en tablas propias
-- (en la planilla iban como texto separado por comas dentro de la fila del jugador).
--
-- Esta es la fuente de verdad de los partidos de Hacoaj. Los datos de
-- soloascenso (torneo) quedan aparte y solo se usan como respaldo y para los
-- demás equipos; `partido_torneo_id` queda listo para vincularlos más adelante.
--
-- Permisos: todo el club ve los partidos (el jugador ve las alineaciones
-- completas); solo el administrador carga, corrige y borra.

-- ── Vista del plantel (solo datos no sensibles) ─────────────────────────────
-- El jugador no puede leer perfiles ajenos (tienen fecha de nacimiento y altura),
-- pero para ver una alineación necesita los NOMBRES de sus compañeros. Esta vista
-- expone únicamente id, nombre y posición. Corre con los permisos de su dueño a
-- propósito (es lo que permite saltear la RLS de perfiles); por eso muestra solo
-- esas columnas. Incluye a los inactivos: aparecen en partidos viejos.
create view public.plantel as
  select id, nombre, posicion, pierna_habil, estado
  from public.perfiles
  where rol = 'jugador';

revoke all on public.plantel from public, anon;
grant select on public.plantel to authenticated;

-- ── partidos_hacoaj ─────────────────────────────────────────────────────────
create table public.partidos_hacoaj (
  id               uuid primary key default gen_random_uuid(),
  fecha            date not null unique,  -- la v1 cruzaba las hojas por fecha
  rival            text not null,
  condicion        text not null check (condicion in ('Local', 'Visitante')),
  goles_hacoaj     smallint not null check (goles_hacoaj >= 0),
  goles_rival      smallint not null check (goles_rival >= 0),
  formacion        text,
  capitan_id       uuid references public.perfiles (id) on delete set null,
  -- Estadísticas del equipo: "af" = a favor, "ec" = en contra (opcionales).
  remates_arco_af  smallint, remates_af smallint,
  remates_arco_ec  smallint, remates_ec smallint,
  situaciones_af   smallint, situaciones_ec smallint,
  corners_af       smallint, corners_con_af smallint,
  corners_ec       smallint, corners_con_ec smallint,
  tl_af            smallint, tl_ec smallint,  -- tiros libres
  partido_torneo_id uuid,  -- se vincula (con FK) cuando exista la tabla de partidos del torneo
  creado_en        timestamptz not null default now()
);

-- ── Jugadores de cada partido ───────────────────────────────────────────────
create table public.partidos_hacoaj_jugadores (
  id               uuid primary key default gen_random_uuid(),
  partido_id       uuid not null references public.partidos_hacoaj (id) on delete cascade,
  perfil_id        uuid not null references public.perfiles (id) on delete restrict,
  posicion_partido text,
  titular          boolean not null default false,
  minutos_jugados  smallint not null default 0 check (minutos_jugados between 0 and 150),
  unique (partido_id, perfil_id)
);

-- Goles de Hacoaj. `en_contra`: gol en contra de un jugador de Hacoaj (suma al rival).
create table public.partidos_hacoaj_goles (
  id               uuid primary key default gen_random_uuid(),
  partido_id       uuid not null references public.partidos_hacoaj (id) on delete cascade,
  perfil_id        uuid references public.perfiles (id) on delete set null,
  asistencia_de_id uuid references public.perfiles (id) on delete set null,
  minuto           smallint check (minuto between 0 and 150),
  en_contra        boolean not null default false
);

create table public.partidos_hacoaj_cambios (
  id               uuid primary key default gen_random_uuid(),
  partido_id       uuid not null references public.partidos_hacoaj (id) on delete cascade,
  jugador_entra_id uuid references public.perfiles (id) on delete set null,
  jugador_sale_id  uuid references public.perfiles (id) on delete set null,
  minuto           smallint check (minuto between 0 and 150)
);

create table public.partidos_hacoaj_tarjetas (
  id               uuid primary key default gen_random_uuid(),
  partido_id       uuid not null references public.partidos_hacoaj (id) on delete cascade,
  perfil_id        uuid references public.perfiles (id) on delete set null,
  tipo             text not null check (tipo in ('amarilla', 'roja')),
  minuto           smallint check (minuto between 0 and 150)
);

-- Videos (Google Drive) y links del partido. El video NO vive en la base: se
-- guarda solo el ID del archivo de Drive (lo que ya extraía la v1 del link).
create table public.partidos_hacoaj_multimedia (
  id         uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos_hacoaj (id) on delete cascade,
  tipo       text not null check (tipo in ('video', 'link')),
  titulo     text not null,
  drive_id   text,  -- para tipo = 'video'
  url        text,  -- para tipo = 'link'
  creado_en  timestamptz not null default now(),
  check ((tipo = 'video' and drive_id is not null) or (tipo = 'link' and url is not null))
);

-- Las FK no crean índices solas.
create index pha_jugadores_partido_idx on public.partidos_hacoaj_jugadores (partido_id);
create index pha_jugadores_perfil_idx  on public.partidos_hacoaj_jugadores (perfil_id);
create index pha_goles_partido_idx     on public.partidos_hacoaj_goles (partido_id);
create index pha_cambios_partido_idx   on public.partidos_hacoaj_cambios (partido_id);
create index pha_tarjetas_partido_idx  on public.partidos_hacoaj_tarjetas (partido_id);
create index pha_multimedia_partido_idx on public.partidos_hacoaj_multimedia (partido_id);

-- ── RLS: lectura para todo el club, escritura solo del administrador ───────
do $$
declare
  t text;
begin
  foreach t in array array[
    'partidos_hacoaj', 'partidos_hacoaj_jugadores', 'partidos_hacoaj_goles',
    'partidos_hacoaj_cambios', 'partidos_hacoaj_tarjetas', 'partidos_hacoaj_multimedia'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy "Todo el club ve los partidos" on public.%I for select to authenticated using (true)', t);
    execute format(
      'create policy "Solo el administrador carga partidos" on public.%I for insert to authenticated
         with check ((select private.rol_actual()) = ''administrador'')', t);
    execute format(
      'create policy "Solo el administrador corrige partidos" on public.%I for update to authenticated
         using ((select private.rol_actual()) = ''administrador'')
         with check ((select private.rol_actual()) = ''administrador'')', t);
    execute format(
      'create policy "Solo el administrador borra partidos" on public.%I for delete to authenticated
         using ((select private.rol_actual()) = ''administrador'')', t);

    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end;
$$;
