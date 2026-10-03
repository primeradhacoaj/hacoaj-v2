-- Primera migración: identidad (perfiles), tests de fuerza y sus políticas RLS.
-- Es la "rebanada vertical" para probar Auth + RLS por rol de punta a punta
-- antes de migrar el resto de las tablas.

-- ── Tipos ───────────────────────────────────────────────────────────────────
create type public.rol_usuario as enum ('jugador', 'tecnico', 'administrador', 'staff');
create type public.estado_perfil as enum ('activo', 'inactivo');
create type public.tipo_fuerza as enum ('pecho', 'sentadilla');

-- ── perfiles ────────────────────────────────────────────────────────────────
-- Reemplaza la hoja "Usuarios". Un perfil puede NO tener cuenta de login
-- (auth_user_id null): es el caso del rol "staff", que solo existe para listar
-- a la persona (por ejemplo, su cumpleaños en el calendario).
create table public.perfiles (
  id               uuid primary key default gen_random_uuid(),
  auth_user_id     uuid unique references auth.users (id) on delete set null,
  nombre           text not null,
  rol              public.rol_usuario not null default 'jugador',
  posicion         text,
  pierna_habil     text,
  fecha_nacimiento date,
  altura           numeric(5, 1),  -- en cm; la mantiene al día un trigger desde pliegues (más adelante)
  estado           public.estado_perfil not null default 'activo',  -- soft delete: no se borra, se marca inactivo
  creado_en        timestamptz not null default now()
);

alter table public.perfiles enable row level security;

-- ── Funciones auxiliares para las políticas ─────────────────────────────────
-- Viven en un schema "private" que la Data API no expone. Son SECURITY DEFINER
-- para leer perfiles sin disparar de nuevo las políticas de perfiles (evita
-- la recursión infinita al preguntar "¿qué rol tengo?" desde una política).
create schema if not exists private;
grant usage on schema private to authenticated;

create function private.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select p.rol
  from public.perfiles p
  where p.auth_user_id = (select auth.uid())
  limit 1;
$$;

create function private.perfil_id_actual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.perfiles p
  where p.auth_user_id = (select auth.uid())
  limit 1;
$$;

revoke execute on function private.rol_actual() from public, anon;
revoke execute on function private.perfil_id_actual() from public, anon;
grant execute on function private.rol_actual() to authenticated;
grant execute on function private.perfil_id_actual() to authenticated;

-- ── Políticas de perfiles ───────────────────────────────────────────────────
-- Cada uno ve su propio perfil; técnico y administrador ven todos.
-- (Más adelante, cuando el jugador necesite ver a sus compañeros en las
-- alineaciones, se agrega una política o una vista con solo el nombre.)
create policy "Ver perfil propio o, si es cuerpo técnico, todos"
  on public.perfiles
  for select
  to authenticated
  using (
    auth_user_id = (select auth.uid())
    or (select private.rol_actual()) in ('tecnico', 'administrador')
  );

create policy "Solo el administrador crea perfiles"
  on public.perfiles
  for insert
  to authenticated
  with check ((select private.rol_actual()) = 'administrador');

create policy "Solo el administrador edita perfiles"
  on public.perfiles
  for update
  to authenticated
  using ((select private.rol_actual()) = 'administrador')
  with check ((select private.rol_actual()) = 'administrador');

create policy "Solo el administrador borra perfiles"
  on public.perfiles
  for delete
  to authenticated
  using ((select private.rol_actual()) = 'administrador');

-- La Data API no expone tablas nuevas por defecto: se da acceso explícito.
-- Los GRANT dan permiso de operar sobre la tabla; las políticas RLS deciden
-- sobre qué filas. Sin GRANT, supabase-js devuelve "permission denied".
grant select, insert, update, delete on public.perfiles to authenticated;

-- ── fuerza_tests ────────────────────────────────────────────────────────────
-- Une las hojas "Fuerza Pecho" y "Fuerza Sentadilla" (misma estructura) en una
-- sola tabla con la columna `tipo`.
create table public.fuerza_tests (
  id             uuid primary key default gen_random_uuid(),
  perfil_id      uuid not null references public.perfiles (id) on delete cascade,
  tipo           public.tipo_fuerza not null,
  fecha_test     date not null,
  peso           numeric(5, 2),
  carga_externa  numeric(6, 2),
  vmp            numeric(4, 2),
  rm_estimado    numeric(6, 2),
  f_relativa     numeric(4, 2),
  fecha_peso     date,
  comentario     text,
  creado_en      timestamptz not null default now(),
  unique (perfil_id, tipo, fecha_test)
);

-- La FK no crea índice por sí sola, y casi todas las consultas filtran por jugador.
create index fuerza_tests_perfil_id_idx on public.fuerza_tests (perfil_id);

alter table public.fuerza_tests enable row level security;

create policy "Ver tests de fuerza propios o, si es cuerpo técnico, todos"
  on public.fuerza_tests
  for select
  to authenticated
  using (
    perfil_id = (select private.perfil_id_actual())
    or (select private.rol_actual()) in ('tecnico', 'administrador')
  );

create policy "El cuerpo técnico carga tests de fuerza"
  on public.fuerza_tests
  for insert
  to authenticated
  with check ((select private.rol_actual()) in ('tecnico', 'administrador'));

create policy "El cuerpo técnico edita tests de fuerza"
  on public.fuerza_tests
  for update
  to authenticated
  using ((select private.rol_actual()) in ('tecnico', 'administrador'))
  with check ((select private.rol_actual()) in ('tecnico', 'administrador'));

create policy "El cuerpo técnico borra tests de fuerza"
  on public.fuerza_tests
  for delete
  to authenticated
  using ((select private.rol_actual()) in ('tecnico', 'administrador'));

grant select, insert, update, delete on public.fuerza_tests to authenticated;
