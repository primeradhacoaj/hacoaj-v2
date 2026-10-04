-- Pantalla "Cargar datos" del cuerpo técnico (fuerza y pesos), incluida la posibilidad de crear
-- un jugador NO activo y sin login para cargarle información.

-- ── 1. Un mismo nombre no se puede repetir ──────────────────────────────────
-- Para que nadie cree dos veces a la misma persona (y su historial quede partido en dos), el
-- nombre es único sin importar mayúsculas, tildes ni espacios de más: "José  Pérez" = "jose perez".
-- Hoy no hay ningún nombre repetido, así que el índice se crea sin problemas.
create function private.nombre_normalizado(p_nombre text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(translate(
    regexp_replace(trim(p_nombre), '\s+', ' ', 'g'),
    'áéíóúüñÁÉÍÓÚÜÑ',
    'aeiouunaeiouun'
  ));
$$;

create unique index perfiles_nombre_normalizado_idx
  on public.perfiles (private.nombre_normalizado(nombre));

-- ── 2. El cuerpo técnico puede crear jugadores inactivos sin login ──────────
-- Solo el administrador crea perfiles de cualquier tipo. Esta política deja al técnico crear
-- ÚNICAMENTE un jugador, inactivo y sin usuario ni login (para cargarle fuerza o peso a alguien
-- que no está en la base). No le da ningún otro poder sobre los perfiles.
create policy "El cuerpo técnico crea jugadores inactivos sin login"
  on public.perfiles for insert to authenticated
  with check (
    (select private.rol_actual()) = 'tecnico'
    and rol = 'jugador'
    and estado = 'inactivo'
    and auth_user_id is null
    and usuario is null
  );

-- Al crear el perfil de un jugador del torneo (pantalla "Cargar partido"), si ya existe una
-- persona con ese nombre sin vincular, se reutiliza en vez de crear otra.
create or replace function private.perfil_de_jugador_torneo(p_jugador_id integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jugador public.torneo_jugadores%rowtype;
  v_nombre  text;
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
  v_nombre := initcap(lower(trim(split_part(v_jugador.nombre_completo, ',', 2))))
              || ' ' || initcap(lower(trim(split_part(v_jugador.nombre_completo, ',', 1))));

  select p.id
    into v_perfil
  from public.perfiles p
  where private.nombre_normalizado(p.nombre) = private.nombre_normalizado(v_nombre)
    and p.rol = 'jugador'
    and not exists (select 1 from public.torneo_jugadores t where t.perfil_id = p.id)
  limit 1;

  if v_perfil is null then
    insert into public.perfiles (nombre, rol, estado, fecha_nacimiento)
    values (v_nombre, 'jugador', 'inactivo', v_jugador.fecha_nacimiento)
    returning id into v_perfil;
  end if;

  update public.torneo_jugadores set perfil_id = v_perfil where id = p_jugador_id;
  return v_perfil;
end;
$$;

-- ── 3. Guardar varios tests de fuerza de una sola vez ───────────────────────
-- Recibe el tipo ('pecho' o 'sentadilla') y una lista de registros:
--   { perfil_id, peso, fecha_peso, peso_nuevo, vmp, carga, rm, frel, fecha_test, comentario }
-- Si `peso_nuevo` es verdadero, el peso también se guarda como pesaje. Todo en una transacción.
-- Un jugador tiene un solo test por tipo y día: si se carga otro el mismo día, REEMPLAZA al
-- anterior (la v1 los apilaba como filas repetidas). Lo mismo para el pesaje del día.
-- SECURITY INVOKER: valen las políticas de las tablas (solo cuerpo técnico y administrador).
create function public.guardar_tests_fuerza(p_tipo text, p_registros jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  r jsonb;
  n integer := 0;
begin
  for r in select * from jsonb_array_elements(coalesce(p_registros, '[]'::jsonb))
  loop
    if coalesce((r ->> 'peso_nuevo')::boolean, false) and nullif(r ->> 'peso', '') is not null then
      insert into public.pesos (perfil_id, fecha, peso)
      values ((r ->> 'perfil_id')::uuid, (r ->> 'fecha_peso')::date, (r ->> 'peso')::numeric)
      on conflict (perfil_id, fecha) do update set peso = excluded.peso;
    end if;

    insert into public.fuerza_tests
      (perfil_id, tipo, fecha_test, peso, carga_externa, vmp, rm_estimado, f_relativa, fecha_peso, comentario)
    values (
      (r ->> 'perfil_id')::uuid,
      p_tipo::public.tipo_fuerza,
      (r ->> 'fecha_test')::date,
      nullif(r ->> 'peso', '')::numeric,
      nullif(r ->> 'carga', '')::numeric,
      nullif(r ->> 'vmp', '')::numeric,
      nullif(r ->> 'rm', '')::numeric,
      nullif(r ->> 'frel', '')::numeric,
      nullif(r ->> 'fecha_peso', '')::date,
      nullif(r ->> 'comentario', '')
    )
    on conflict (perfil_id, tipo, fecha_test) do update set
      peso = excluded.peso,
      carga_externa = excluded.carga_externa,
      vmp = excluded.vmp,
      rm_estimado = excluded.rm_estimado,
      f_relativa = excluded.f_relativa,
      fecha_peso = excluded.fecha_peso,
      comentario = excluded.comentario;

    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke execute on function public.guardar_tests_fuerza(text, jsonb) from public, anon;
grant execute on function public.guardar_tests_fuerza(text, jsonb) to authenticated;
