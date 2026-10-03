-- Métricas físicas, parte 2: pliegues y pesos (hojas "Pliegues" y "Peso").
-- Mismo esquema de permisos que fuerza_tests: cada jugador ve lo suyo; el
-- cuerpo técnico (técnico y administrador) ve y carga todo.

-- ── pliegues ────────────────────────────────────────────────────────────────
create table public.pliegues (
  id               uuid primary key default gen_random_uuid(),
  perfil_id        uuid not null references public.perfiles (id) on delete cascade,
  fecha            date not null,
  peso             numeric(5, 2),
  talla            numeric(5, 1),  -- en cm (se mide una vez por año)
  -- IMC siempre consistente con peso y talla: lo calcula Postgres, nadie lo carga.
  imc              numeric(4, 1) generated always as (
                     case when talla > 0 and peso is not null
                          then round(peso / ((talla / 100) * (talla / 100)), 1)
                     end
                   ) stored,
  pl_tricipital    numeric(4, 1),
  pl_subescapular  numeric(4, 1),
  pl_supraespinal  numeric(4, 1),
  pl_abdominal     numeric(4, 1),
  pl_muslo         numeric(4, 1),
  pl_pantorrilla   numeric(4, 1),
  sumatoria_6      numeric(5, 1),  -- se guarda como viene de la planilla
  peso_ideal       numeric(5, 1),
  comentario       text,
  creado_en        timestamptz not null default now(),
  unique (perfil_id, fecha)
);

create index pliegues_perfil_id_idx on public.pliegues (perfil_id);

alter table public.pliegues enable row level security;

create policy "Ver pliegues propios o, si es cuerpo técnico, todos"
  on public.pliegues for select to authenticated
  using (
    perfil_id = (select private.perfil_id_actual())
    or (select private.rol_actual()) in ('tecnico', 'administrador')
  );

create policy "El cuerpo técnico carga pliegues"
  on public.pliegues for insert to authenticated
  with check ((select private.rol_actual()) in ('tecnico', 'administrador'));

create policy "El cuerpo técnico edita pliegues"
  on public.pliegues for update to authenticated
  using ((select private.rol_actual()) in ('tecnico', 'administrador'))
  with check ((select private.rol_actual()) in ('tecnico', 'administrador'));

create policy "El cuerpo técnico borra pliegues"
  on public.pliegues for delete to authenticated
  using ((select private.rol_actual()) in ('tecnico', 'administrador'));

grant select, insert, update, delete on public.pliegues to authenticated;

-- ── Trigger: la talla más reciente actualiza la altura del perfil ───────────
-- La altura se mide una vez por año, junto con los pliegues. Cuando se carga
-- (o corrige) una talla, si es la más reciente de ese jugador, pasa a ser
-- `perfiles.altura`. SECURITY DEFINER: lo dispara el técnico, que no tiene
-- permiso de editar perfiles.
create function private.sincronizar_altura()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.talla is not null
     and not exists (
       select 1
       from public.pliegues p
       where p.perfil_id = new.perfil_id
         and p.talla is not null
         and p.fecha > new.fecha
     )
  then
    update public.perfiles set altura = new.talla where id = new.perfil_id;
  end if;
  return new;
end;
$$;

create trigger pliegues_sincroniza_altura
  after insert or update of talla, fecha on public.pliegues
  for each row execute function private.sincronizar_altura();

-- ── pesos ───────────────────────────────────────────────────────────────────
-- Historial de pesajes (hoja "Peso"). Un pesaje por jugador y día.
create table public.pesos (
  id         uuid primary key default gen_random_uuid(),
  perfil_id  uuid not null references public.perfiles (id) on delete cascade,
  fecha      date not null,
  peso       numeric(5, 2) not null,
  creado_en  timestamptz not null default now(),
  unique (perfil_id, fecha)
);

create index pesos_perfil_id_idx on public.pesos (perfil_id);

alter table public.pesos enable row level security;

create policy "Ver pesos propios o, si es cuerpo técnico, todos"
  on public.pesos for select to authenticated
  using (
    perfil_id = (select private.perfil_id_actual())
    or (select private.rol_actual()) in ('tecnico', 'administrador')
  );

create policy "El cuerpo técnico carga pesos"
  on public.pesos for insert to authenticated
  with check ((select private.rol_actual()) in ('tecnico', 'administrador'));

create policy "El cuerpo técnico edita pesos"
  on public.pesos for update to authenticated
  using ((select private.rol_actual()) in ('tecnico', 'administrador'))
  with check ((select private.rol_actual()) in ('tecnico', 'administrador'));

create policy "El cuerpo técnico borra pesos"
  on public.pesos for delete to authenticated
  using ((select private.rol_actual()) in ('tecnico', 'administrador'));

grant select, insert, update, delete on public.pesos to authenticated;
