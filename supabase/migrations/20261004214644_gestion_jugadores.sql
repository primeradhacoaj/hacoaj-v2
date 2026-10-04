-- Agregar, editar y eliminar jugadores (pantalla Jugadores del administrador), incluido dar acceso
-- (crear el login), cambiar el usuario y restablecer la contraseña.
--
-- Las cuentas de login viven en `auth.users`, que la app no puede tocar. En vez de guardar una clave de
-- administrador de Supabase en el servidor, estas operaciones las hacen funciones de la base con
-- SECURITY DEFINER que verifican adentro que quien llama sea el administrador (es el mismo mecanismo
-- con el que se migraron las 39 cuentas de la v1). La contraseña se cifra con bcrypt en la base y nunca
-- se guarda ni se devuelve en texto plano.
--
-- Errores propios (con mensaje en español para mostrar):
--   42501 sin permiso · 22023 dato inválido · 23505 ya existe · 23503 no se puede por datos relacionados

-- ── Auxiliares (schema private, no expuesto por la Data API) ────────────────

create function private.exigir_administrador()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if private.rol_actual() is distinct from 'administrador' then
    raise exception 'Solo el administrador puede hacer esto' using errcode = '42501';
  end if;
end;
$$;

-- Usuario de login normalizado: minúsculas, 3 a 30 caracteres (letras, números, punto, guion).
create function private.validar_usuario(p_usuario text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := lower(trim(coalesce(p_usuario, '')));
begin
  if v !~ '^[a-z0-9._-]{3,30}$' then
    raise exception 'El usuario tiene que tener de 3 a 30 caracteres: letras, números, punto o guion' using errcode = '22023';
  end if;
  return v;
end;
$$;

create function private.validar_contrasena(p_contrasena text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_contrasena is null or char_length(p_contrasena) < 6 then
    raise exception 'La contraseña tiene que tener al menos 6 caracteres' using errcode = '22023';
  end if;
  if octet_length(p_contrasena) > 72 then
    raise exception 'La contraseña es demasiado larga' using errcode = '22023';
  end if;
end;
$$;

-- ¿El usuario ya lo usa otra cuenta? (`p_excepto`: el perfil que se está editando)
create function private.usuario_en_uso(p_usuario text, p_excepto uuid default null)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from public.perfiles where usuario = p_usuario and id is distinct from p_excepto)
      or exists (
        select 1 from auth.users u
        where u.email = p_usuario || '@hacoaj.test'
          and u.id is distinct from (select auth_user_id from public.perfiles where id = p_excepto)
      );
$$;

-- Crea la cuenta de login (usuario + contraseña) y devuelve su id.
create function private.crear_cuenta(p_usuario text, p_contrasena text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_usuario text := private.validar_usuario(p_usuario);
  v_id      uuid := gen_random_uuid();
  v_email   text := v_usuario || '@hacoaj.test';
begin
  perform private.validar_contrasena(p_contrasena);
  if private.usuario_en_uso(v_usuario) then
    raise exception 'El usuario «%» ya está en uso', v_usuario using errcode = '23505';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token,
    is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_contrasena, extensions.gen_salt('bf', 10)), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb, now(), now(),
    '', '', '', '', '', '', '', '', false, false
  );

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (
    v_id, v_id, v_id::text, 'email',
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', false, 'phone_verified', false),
    now(), now(), now()
  );

  return v_id;
end;
$$;

-- ── Agregar jugador ─────────────────────────────────────────────────────────
-- p: { nombre, rol, estado, posicion, pierna_habil, fecha_nacimiento, altura, usuario, contrasena }
-- Staff no tiene login. Técnico y administrador necesitan usuario y contraseña. Un jugador puede
-- tener login o no (si no, solo existe para cargarle datos y después se le puede dar acceso).
create function public.agregar_jugador(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre  text := regexp_replace(trim(coalesce(p ->> 'nombre', '')), '\s+', ' ', 'g');
  v_rol     public.rol_usuario := coalesce(nullif(p ->> 'rol', ''), 'jugador')::public.rol_usuario;
  v_estado  public.estado_perfil := coalesce(nullif(p ->> 'estado', ''), 'activo')::public.estado_perfil;
  v_usuario text := trim(coalesce(p ->> 'usuario', ''));
  v_clave   text := coalesce(p ->> 'contrasena', '');
  v_auth    uuid;
  v_id      uuid;
begin
  perform private.exigir_administrador();

  if v_nombre = '' then
    raise exception 'El nombre es obligatorio' using errcode = '22023';
  end if;
  if exists (select 1 from public.perfiles where private.nombre_normalizado(nombre) = private.nombre_normalizado(v_nombre)) then
    raise exception 'Ya existe una persona llamada «%». Buscala en la lista y usá Editar para darle acceso', v_nombre
      using errcode = '23505';
  end if;

  if v_rol = 'staff' then
    v_usuario := '';
    v_clave := '';
  elsif v_rol in ('tecnico', 'administrador') and (v_usuario = '' or v_clave = '') then
    raise exception 'Un técnico o administrador necesita usuario y contraseña' using errcode = '22023';
  elsif (v_usuario = '') <> (v_clave = '') then
    raise exception 'Para dar acceso hacen falta usuario y contraseña' using errcode = '22023';
  end if;

  if v_usuario <> '' then
    v_auth := private.crear_cuenta(v_usuario, v_clave);
    v_usuario := private.validar_usuario(v_usuario);
  else
    v_usuario := null;
  end if;

  insert into public.perfiles (auth_user_id, usuario, nombre, rol, estado, posicion, pierna_habil, fecha_nacimiento, altura)
  values (
    v_auth, v_usuario, v_nombre, v_rol, v_estado,
    nullif(trim(coalesce(p ->> 'posicion', '')), ''),
    nullif(trim(coalesce(p ->> 'pierna_habil', '')), ''),
    nullif(p ->> 'fecha_nacimiento', '')::date,
    nullif(p ->> 'altura', '')::numeric
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ── Editar jugador ──────────────────────────────────────────────────────────
-- p trae SOLO lo que cambió: nombre, rol, estado, posicion, pierna_habil, fecha_nacimiento, altura,
-- usuario, contrasena. (Texto vacío en un dato opcional lo borra.)
--  · Con login: `usuario` lo renombra y `contrasena` la restablece (se cierran sus sesiones abiertas).
--  · Sin login: `usuario` + `contrasena` juntos le dan acceso.
-- Nadie puede cambiarse a sí mismo el rol ni el estado (no quedarse sin administrador).
create function public.editar_jugador(p_perfil uuid, p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v         public.perfiles%rowtype;
  v_nombre  text;
  v_rol     public.rol_usuario;
  v_estado  public.estado_perfil;
  v_usuario text := trim(coalesce(p ->> 'usuario', ''));
  v_clave   text := coalesce(p ->> 'contrasena', '');
  v_auth    uuid;
  v_nuevo_usuario text;
begin
  perform private.exigir_administrador();

  select * into v from public.perfiles where id = p_perfil for update;
  if not found then
    raise exception 'No se encontró al jugador' using errcode = '22023';
  end if;

  v_nombre := case when p ? 'nombre' then regexp_replace(trim(coalesce(p ->> 'nombre', '')), '\s+', ' ', 'g') else v.nombre end;
  v_rol    := case when p ? 'rol' then (p ->> 'rol')::public.rol_usuario else v.rol end;
  v_estado := case when p ? 'estado' then (p ->> 'estado')::public.estado_perfil else v.estado end;

  if v_nombre = '' then
    raise exception 'El nombre es obligatorio' using errcode = '22023';
  end if;
  if v_nombre is distinct from v.nombre and exists (
       select 1 from public.perfiles
       where id <> p_perfil and private.nombre_normalizado(nombre) = private.nombre_normalizado(v_nombre)) then
    raise exception 'Ya existe una persona llamada «%»', v_nombre using errcode = '23505';
  end if;

  if v.auth_user_id is not null and v.auth_user_id = (select auth.uid())
     and (v_rol is distinct from v.rol or v_estado is distinct from v.estado) then
    raise exception 'No podés cambiar tu propio rol ni tu estado' using errcode = '22023';
  end if;

  v_auth := v.auth_user_id;
  v_nuevo_usuario := v.usuario;

  if v_rol = 'staff' and (v_auth is not null or v_usuario <> '' or v_clave <> '') then
    raise exception 'El staff no tiene acceso a la app' using errcode = '22023';
  end if;

  if v_auth is not null then
    -- Renombrar el usuario
    if v_usuario <> '' and v_usuario is distinct from v.usuario then
      v_nuevo_usuario := private.validar_usuario(v_usuario);
      if private.usuario_en_uso(v_nuevo_usuario, p_perfil) then
        raise exception 'El usuario «%» ya está en uso', v_nuevo_usuario using errcode = '23505';
      end if;
      update auth.users set email = v_nuevo_usuario || '@hacoaj.test', updated_at = now() where id = v_auth;
      update auth.identities
         set identity_data = identity_data || jsonb_build_object('email', v_nuevo_usuario || '@hacoaj.test'),
             updated_at = now()
       where user_id = v_auth;
    end if;
    -- Restablecer la contraseña
    if v_clave <> '' then
      perform private.validar_contrasena(v_clave);
      update auth.users
         set encrypted_password = extensions.crypt(v_clave, extensions.gen_salt('bf', 10)), updated_at = now()
       where id = v_auth;
      delete from auth.sessions where user_id = v_auth;
    end if;
  elsif v_usuario <> '' or v_clave <> '' then
    -- Dar acceso a quien todavía no tiene login
    if v_usuario = '' or v_clave = '' then
      raise exception 'Para dar acceso hacen falta usuario y contraseña' using errcode = '22023';
    end if;
    v_auth := private.crear_cuenta(v_usuario, v_clave);
    v_nuevo_usuario := private.validar_usuario(v_usuario);
  end if;

  update public.perfiles set
    nombre = v_nombre,
    rol = v_rol,
    estado = v_estado,
    auth_user_id = v_auth,
    usuario = v_nuevo_usuario,
    posicion = case when p ? 'posicion' then nullif(trim(coalesce(p ->> 'posicion', '')), '') else posicion end,
    pierna_habil = case when p ? 'pierna_habil' then nullif(trim(coalesce(p ->> 'pierna_habil', '')), '') else pierna_habil end,
    fecha_nacimiento = case when p ? 'fecha_nacimiento' then nullif(p ->> 'fecha_nacimiento', '')::date else fecha_nacimiento end,
    altura = case when p ? 'altura' then nullif(p ->> 'altura', '')::numeric else altura end
  where id = p_perfil;
end;
$$;

-- ── Eliminar jugador ────────────────────────────────────────────────────────
-- Borra a la persona Y todo lo que tiene asociado (tests de fuerza, pliegues, pesos y encuestas), y su
-- cuenta de login. No se puede si jugó partidos de Hacoaj: en ese caso hay que pasarlo a Inactivo.
create function public.eliminar_jugador(p_perfil uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v         public.perfiles%rowtype;
  v_partidos integer;
begin
  perform private.exigir_administrador();

  select * into v from public.perfiles where id = p_perfil for update;
  if not found then
    raise exception 'No se encontró al jugador' using errcode = '22023';
  end if;
  if v.auth_user_id is not null and v.auth_user_id = (select auth.uid()) then
    raise exception 'No podés eliminarte a vos mismo' using errcode = '22023';
  end if;

  select count(*) into v_partidos from public.partidos_hacoaj_jugadores where perfil_id = p_perfil;
  if v_partidos > 0 then
    raise exception 'No se puede eliminar: figura en % partido(s) de Hacoaj. Pasalo a Inactivo desde Editar', v_partidos
      using errcode = '23503';
  end if;

  delete from public.perfiles where id = p_perfil;
  if v.auth_user_id is not null then
    delete from auth.users where id = v.auth_user_id;
  end if;
end;
$$;

revoke execute on function public.agregar_jugador(jsonb) from public, anon;
revoke execute on function public.editar_jugador(uuid, jsonb) from public, anon;
revoke execute on function public.eliminar_jugador(uuid) from public, anon;
grant execute on function public.agregar_jugador(jsonb) to authenticated;
grant execute on function public.editar_jugador(uuid, jsonb) to authenticated;
grant execute on function public.eliminar_jugador(uuid) to authenticated;
