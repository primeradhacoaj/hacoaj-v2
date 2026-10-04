-- Torneo: datos del scraper de soloascenso (todo el campeonato, no solo Hacoaj).
-- En la v1 vivían en un SQLite (`primera_d.db`) y tres JSON (`posiciones`,
-- `goleadores`, `fixture`) que las GitHub Actions del scraper iban actualizando.
--
-- Son una RÉPLICA de una fuente externa: la app solo LEE. Las escribe el proceso
-- de importación con un rol privilegiado, por eso no hay políticas de escritura
-- para `authenticated` (ni siquiera para el administrador).
--
-- Los ids son los del scraper (no se generan acá), así el import se puede repetir
-- sin duplicar. Prefijo `torneo_` para no confundirlos con los equipos del club.

-- ── Equipos y jugadores del campeonato ──────────────────────────────────────
create table public.torneo_equipos (
  id         integer primary key,  -- equipo_id del scraper
  nombre     text not null,
  categoria  text,
  url_slug   text
);

create table public.torneo_jugadores (
  id               integer primary key,  -- jugador_id del scraper
  nombre_completo  text not null,        -- "APELLIDO, NOMBRE"
  fecha_nacimiento date,
  puesto           text,                 -- Arquero, Defensor, Volante, Delantero o Entrenador
  url_slug         text,                 -- no es único en la fuente
  -- Si este jugador del campeonato es alguien del club, acá se vincula con su
  -- perfil (en la v1 se cruzaba por nombre, que es frágil).
  perfil_id        uuid references public.perfiles (id) on delete set null
);

-- Un perfil corresponde como máximo a un jugador del campeonato.
create unique index torneo_jugadores_perfil_idx
  on public.torneo_jugadores (perfil_id) where perfil_id is not null;

create table public.torneo_jugador_equipo (
  id           bigint generated always as identity primary key,
  jugador_id   integer not null references public.torneo_jugadores (id) on delete cascade,
  equipo_id    integer not null references public.torneo_equipos (id) on delete cascade,
  temporada    smallint not null,
  club_nombre  text,
  unique (jugador_id, equipo_id, temporada)
);

-- ── Partidos ────────────────────────────────────────────────────────────────
-- `equipo_local` / `equipo_visitante` guardan el NOMBRE como texto porque en
-- partidos viejos aparecen rivales que ya no están en `torneo_equipos`
-- (ahí los *_id quedan nulos). Los goles son nulos mientras el partido no se jugó.
create table public.torneo_partidos (
  id                   integer primary key,  -- partido_id del scraper
  fecha                date not null,
  hora                 text,
  torneo               text,
  jornada              smallint,
  estadio              text,
  arbitro              text,
  equipo_local         text not null,
  equipo_visitante     text not null,
  equipo_local_id      integer references public.torneo_equipos (id) on delete set null,
  equipo_visitante_id  integer references public.torneo_equipos (id) on delete set null,
  goles_local          smallint,
  goles_visitante      smallint,
  url                  text unique
);

create index torneo_partidos_fecha_idx on public.torneo_partidos (fecha desc);
create index torneo_partidos_local_idx on public.torneo_partidos (equipo_local_id);
create index torneo_partidos_visitante_idx on public.torneo_partidos (equipo_visitante_id);

-- Ahora que existe la tabla, el partido de Hacoaj cargado a mano se puede vincular
-- con el mismo partido del scraper (sin fusionarlos: la fuente de verdad de Hacoaj
-- sigue siendo `partidos_hacoaj`).
-- (La columna se creó como uuid antes de saber que los ids del scraper son enteros;
-- todavía está vacía, así que se cambia el tipo.)
alter table public.partidos_hacoaj
  alter column partido_torneo_id type integer using null;

alter table public.partidos_hacoaj
  add constraint partidos_hacoaj_partido_torneo_fk
  foreign key (partido_torneo_id) references public.torneo_partidos (id) on delete set null;

create index partidos_hacoaj_partido_torneo_idx on public.partidos_hacoaj (partido_torneo_id);

-- ── Qué pasó en cada partido ────────────────────────────────────────────────
-- Un jugador por partido: minutos, goles y tarjetas. `es_ambiguo` marca los casos
-- en que el scraper no pudo asegurar a qué jugador correspondía la aparición.
create table public.torneo_apariciones (
  id                bigint generated always as identity primary key,
  jugador_id        integer not null references public.torneo_jugadores (id) on delete cascade,
  partido_id        integer not null references public.torneo_partidos (id) on delete cascade,
  titular           boolean not null default false,
  minuto_ingreso    smallint,
  minuto_salida     smallint,
  minutos_jugados   smallint,
  goles             smallint not null default 0,
  amarilla          smallint not null default 0,
  roja              smallint not null default 0,
  es_ambiguo        boolean not null default false,
  equipo_en_partido text,
  numero_camiseta   smallint,
  posicion_partido  text,  -- arquero, defensor, mediocampista, delantero o suplente
  unique (jugador_id, partido_id)
);

create index torneo_apariciones_partido_idx on public.torneo_apariciones (partido_id);

-- Goles, cambios y tarjetas guardan el jugador como TEXTO (así lo informa la
-- fuente, a veces ambiguo) y el equipo como abreviatura; no se fuerzan FK a
-- propósito para no rechazar filas del scraper cuyo nombre no calza perfecto.
create table public.torneo_goles (
  id              bigint generated always as identity primary key,
  partido_id      integer not null references public.torneo_partidos (id) on delete cascade,
  jugador_nombre  text,
  equipo_abrev    text,
  minuto          smallint,
  en_contra       boolean not null default false
);

create table public.torneo_cambios (
  id             bigint generated always as identity primary key,
  partido_id     integer not null references public.torneo_partidos (id) on delete cascade,
  equipo_abrev   text,
  jugador_entra  text,
  jugador_sale   text,
  minuto         smallint
);

create table public.torneo_tarjetas (
  id              bigint generated always as identity primary key,
  partido_id      integer not null references public.torneo_partidos (id) on delete cascade,
  jugador_nombre  text,
  equipo_abrev    text,
  tipo            text not null check (tipo in ('amarilla', 'roja')),
  minuto          smallint  -- casi siempre desconocido en las amarillas
);

create index torneo_goles_partido_idx on public.torneo_goles (partido_id);
create index torneo_cambios_partido_idx on public.torneo_cambios (partido_id);
create index torneo_tarjetas_partido_idx on public.torneo_tarjetas (partido_id);

-- ── Posiciones y goleadores (fotos de la tabla, tal como las publica la fuente) ─
create table public.torneo_posiciones (
  id         bigint generated always as identity primary key,
  temporada  smallint not null,
  zona       text not null check (zona in ('A', 'B')),
  posicion   smallint not null,
  equipo     text not null,
  pts        smallint not null,
  j          smallint not null,
  g          smallint not null,
  e          smallint not null,
  p          smallint not null,
  gf         smallint not null,
  gc         smallint not null,
  dif        smallint not null,
  unique (temporada, zona, equipo)
);

create table public.torneo_goleadores (
  id         bigint generated always as identity primary key,
  temporada  smallint not null,
  posicion   smallint not null,
  jugador    text not null,
  equipo     text not null,
  goles      smallint not null,
  unique (temporada, jugador, equipo)
);

-- ── RLS: todo el club lee, nadie escribe desde la app ───────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'torneo_equipos', 'torneo_jugadores', 'torneo_jugador_equipo', 'torneo_partidos',
    'torneo_apariciones', 'torneo_goles', 'torneo_cambios', 'torneo_tarjetas',
    'torneo_posiciones', 'torneo_goleadores'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Todo el club ve el torneo" on public.%I for select to authenticated using (true)', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end;
$$;
