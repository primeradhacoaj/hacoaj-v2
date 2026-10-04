-- Encuestas: wellness y post partido (hojas "Wellness" y "Post partido").
--
-- Diferencia con fuerza/pliegues: acá quien ESCRIBE es el jugador (contesta su
-- propia encuesta); el cuerpo técnico solo lee. Una encuesta enviada no se
-- edita: solo el administrador puede corregir o borrar.
--
-- `perfil_id` tiene como valor por defecto el perfil de quien está logueado,
-- así el jugador no manda su id y no puede contestar a nombre de otro (la
-- política de INSERT además lo verifica).

-- ── wellness ────────────────────────────────────────────────────────────────
create table public.wellness (
  id          uuid primary key default gen_random_uuid(),
  perfil_id   uuid not null default private.perfil_id_actual()
              references public.perfiles (id) on delete cascade,
  fecha       timestamptz not null default now(),
  sueno       smallint not null check (sueno between 1 and 10),
  estres      smallint not null check (estres between 1 and 10),
  fatiga      smallint not null check (fatiga between 1 and 10),
  dolor       smallint not null check (dolor between 1 and 10),
  comentario  text
);

create index wellness_perfil_id_idx on public.wellness (perfil_id, fecha desc);

alter table public.wellness enable row level security;

create policy "Ver wellness propio o, si es cuerpo técnico, todos"
  on public.wellness for select to authenticated
  using (
    perfil_id = (select private.perfil_id_actual())
    or (select private.rol_actual()) in ('tecnico', 'administrador')
  );

create policy "El jugador contesta su propio wellness"
  on public.wellness for insert to authenticated
  with check (
    perfil_id = (select private.perfil_id_actual())
    and (select private.rol_actual()) = 'jugador'
  );

create policy "Solo el administrador corrige wellness"
  on public.wellness for update to authenticated
  using ((select private.rol_actual()) = 'administrador')
  with check ((select private.rol_actual()) = 'administrador');

create policy "Solo el administrador borra wellness"
  on public.wellness for delete to authenticated
  using ((select private.rol_actual()) = 'administrador');

grant select, insert, update, delete on public.wellness to authenticated;

-- ── post_partido ────────────────────────────────────────────────────────────
-- En la planilla repetía los datos comunes en una fila por cada golpe. Acá la
-- encuesta es UNA fila y los golpes/molestias son filas hijas (post_partido_golpes).
create table public.post_partido (
  id              uuid primary key default gen_random_uuid(),
  perfil_id       uuid not null default private.perfil_id_actual()
                  references public.perfiles (id) on delete cascade,
  fecha_partido   date not null,
  fecha_encuesta  date not null default current_date,
  llegada         text not null check (llegada in ('Mal', 'Bien', 'Muy bien')),
  carga_emocional text not null check (carga_emocional in ('Baja', 'Media', 'Alta')),
  carga_fisica    text not null check (carga_fisica in ('Baja', 'Media', 'Alta', 'Muy alta')),
  categoria       text,      -- AIFA, Primera Escobar… (lista abierta: puede ser texto libre)
  minutos         smallint check (minutos between 0 and 150),
  comentario      text,
  creado_en       timestamptz not null default now(),
  unique (perfil_id, fecha_partido, fecha_encuesta)
);

create index post_partido_perfil_id_idx on public.post_partido (perfil_id, fecha_partido desc);

alter table public.post_partido enable row level security;

create policy "Ver post partido propio o, si es cuerpo técnico, todos"
  on public.post_partido for select to authenticated
  using (
    perfil_id = (select private.perfil_id_actual())
    or (select private.rol_actual()) in ('tecnico', 'administrador')
  );

create policy "El jugador contesta su propio post partido"
  on public.post_partido for insert to authenticated
  with check (
    perfil_id = (select private.perfil_id_actual())
    and (select private.rol_actual()) = 'jugador'
  );

create policy "Solo el administrador corrige post partido"
  on public.post_partido for update to authenticated
  using ((select private.rol_actual()) = 'administrador')
  with check ((select private.rol_actual()) = 'administrador');

create policy "Solo el administrador borra post partido"
  on public.post_partido for delete to authenticated
  using ((select private.rol_actual()) = 'administrador');

grant select, insert, update, delete on public.post_partido to authenticated;

-- ── post_partido_golpes ─────────────────────────────────────────────────────
-- Cero o más golpes/molestias por encuesta. Si se borra la encuesta, se borran.
create table public.post_partido_golpes (
  id               uuid primary key default gen_random_uuid(),
  post_partido_id  uuid not null references public.post_partido (id) on delete cascade,
  tipo_golpe       text not null,  -- "Golpe/contusión", "Esguince o dobladura"… o texto libre
  ubicacion_golpe  text,           -- zona del cuerpo (vacía si el tipo es "Otro")
  lado_golpe       text check (lado_golpe in ('Derecho', 'Izquierdo', 'Ambos')),
  comentario_lesion text
);

create index post_partido_golpes_encuesta_idx on public.post_partido_golpes (post_partido_id);

alter table public.post_partido_golpes enable row level security;

-- Los permisos de un golpe son los de su encuesta.
create policy "Ver golpes de encuestas propias o, si es cuerpo técnico, todos"
  on public.post_partido_golpes for select to authenticated
  using (
    exists (
      select 1 from public.post_partido pp
      where pp.id = post_partido_id
        and (pp.perfil_id = (select private.perfil_id_actual())
             or (select private.rol_actual()) in ('tecnico', 'administrador'))
    )
  );

create policy "El jugador agrega golpes a su propia encuesta"
  on public.post_partido_golpes for insert to authenticated
  with check (
    (select private.rol_actual()) = 'jugador'
    and exists (
      select 1 from public.post_partido pp
      where pp.id = post_partido_id
        and pp.perfil_id = (select private.perfil_id_actual())
    )
  );

create policy "Solo el administrador corrige golpes"
  on public.post_partido_golpes for update to authenticated
  using ((select private.rol_actual()) = 'administrador')
  with check ((select private.rol_actual()) = 'administrador');

create policy "Solo el administrador borra golpes"
  on public.post_partido_golpes for delete to authenticated
  using ((select private.rol_actual()) = 'administrador');

grant select, insert, update, delete on public.post_partido_golpes to authenticated;

-- ── guardar_post_partido: encuesta + golpes en una sola transacción ─────────
-- Si fallara la inserción de un golpe, no queda la encuesta a medias.
-- SECURITY INVOKER (por defecto): corre con los permisos de quien llama, así
-- que las políticas de arriba siguen aplicando.
create function public.guardar_post_partido(
  p_fecha_partido date,
  p_llegada       text,
  p_emocional     text,
  p_fisica        text,
  p_categoria     text,
  p_minutos       smallint,
  p_comentario    text,
  p_golpes        jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.post_partido
    (fecha_partido, llegada, carga_emocional, carga_fisica, categoria, minutos, comentario)
  values
    (p_fecha_partido, p_llegada, p_emocional, p_fisica, p_categoria, p_minutos, p_comentario)
  returning id into v_id;

  insert into public.post_partido_golpes
    (post_partido_id, tipo_golpe, ubicacion_golpe, lado_golpe, comentario_lesion)
  select
    v_id,
    g ->> 'tipo_golpe',
    nullif(g ->> 'ubicacion_golpe', ''),
    nullif(g ->> 'lado_golpe', ''),
    nullif(g ->> 'comentario_lesion', '')
  from jsonb_array_elements(coalesce(p_golpes, '[]'::jsonb)) as g;

  return v_id;
end;
$$;

revoke execute on function public.guardar_post_partido(date, text, text, text, text, smallint, text, jsonb)
  from public, anon;
grant execute on function public.guardar_post_partido(date, text, text, text, text, smallint, text, jsonb)
  to authenticated;
