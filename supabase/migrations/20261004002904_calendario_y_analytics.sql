-- Calendario (eventos propios) y analytics (visitas a las pantallas).

-- ── eventos_calendario ──────────────────────────────────────────────────────
-- Eventos que carga el cuerpo técnico a mano (reunión, entrenamiento, médico…).
-- Los cumpleaños, partidos y testeos del calendario NO se guardan acá: se
-- calculan de las otras tablas. En la v1 esto era un JSON compartido en el
-- servidor; ahora es una tabla compartida entre todos los técnicos.
create table public.eventos_calendario (
  id              uuid primary key default gen_random_uuid(),
  fecha           date not null,
  titulo          text not null check (char_length(titulo) between 1 and 80),
  icono           text not null default 'evento'
                  check (icono in ('reunion', 'entrenamiento', 'medico', 'evento')),
  creado_por_id   uuid default private.perfil_id_actual()
                  references public.perfiles (id) on delete set null,
  creado_en       timestamptz not null default now()
);

create index eventos_calendario_fecha_idx on public.eventos_calendario (fecha);

alter table public.eventos_calendario enable row level security;

create policy "El cuerpo técnico ve los eventos del calendario"
  on public.eventos_calendario for select to authenticated
  using ((select private.rol_actual()) in ('tecnico', 'administrador'));

create policy "El cuerpo técnico crea eventos"
  on public.eventos_calendario for insert to authenticated
  with check ((select private.rol_actual()) in ('tecnico', 'administrador'));

create policy "El cuerpo técnico edita eventos"
  on public.eventos_calendario for update to authenticated
  using ((select private.rol_actual()) in ('tecnico', 'administrador'))
  with check ((select private.rol_actual()) in ('tecnico', 'administrador'));

create policy "El cuerpo técnico borra eventos"
  on public.eventos_calendario for delete to authenticated
  using ((select private.rol_actual()) in ('tecnico', 'administrador'));

grant select, insert, update, delete on public.eventos_calendario to authenticated;

-- ── page_views ──────────────────────────────────────────────────────────────
-- Visitas a las pantallas (reemplaza la tabla `page_views` del SQLite de analytics
-- de la v1). Cada usuario registra SUS visitas; solo el administrador las lee.
-- `perfil_id` y `rol` se completan solos con los de quien está logueado, así no
-- se pueden falsificar desde el navegador.
create table public.page_views (
  id             bigint generated always as identity primary key,
  momento        timestamptz not null default now(),
  perfil_id      uuid default private.perfil_id_actual()
                 references public.perfiles (id) on delete set null,
  rol            text default (private.rol_actual())::text,  -- foto del rol al momento de la visita
  pagina         text not null,
  query          text,
  duracion_seg   integer check (duracion_seg >= 0),
  pagina_previa  text
);

create index page_views_momento_idx on public.page_views (momento desc);

alter table public.page_views enable row level security;

create policy "Cada usuario registra sus propias visitas"
  on public.page_views for insert to authenticated
  with check (perfil_id is not distinct from (select private.perfil_id_actual()));

create policy "Solo el administrador ve las visitas"
  on public.page_views for select to authenticated
  using ((select private.rol_actual()) = 'administrador');

create policy "Solo el administrador borra visitas"
  on public.page_views for delete to authenticated
  using ((select private.rol_actual()) = 'administrador');

grant select, insert, delete on public.page_views to authenticated;
