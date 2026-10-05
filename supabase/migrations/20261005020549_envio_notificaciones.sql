-- Envío de notificaciones push: lo que el servidor necesita saber de la base para mandarlas.
--
-- Las direcciones y claves de cada dispositivo (`push_suscripciones`) son lo que permite enviar un aviso, así que
-- por RLS cada persona solo ve las suyas. Para que el cuerpo técnico pueda enviar avisos SIN abrirle esa tabla,
-- el envío pasa por estas funciones: cada una verifica adentro que quien llama sea técnico o administrador
-- (mismo mecanismo que las funciones de gestión de jugadores; no hace falta ninguna clave de administrador).

create function private.exigir_cuerpo_tecnico()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if coalesce(private.rol_actual(), '') not in ('tecnico', 'administrador') then
    raise exception 'Solo el cuerpo técnico puede enviar notificaciones' using errcode = '42501';
  end if;
end;
$$;

-- Dispositivos a los que se puede enviar un aviso. Con `p_perfil_ids` nulo: todos los jugadores ACTIVOS
-- (los inactivos no usan la app). Con una lista: solo esas personas.
create function public.push_destinatarios(p_perfil_ids uuid[] default null)
returns table (perfil_id uuid, endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.exigir_cuerpo_tecnico();
  return query
    select s.perfil_id, s.endpoint, s.p256dh, s.auth
    from public.push_suscripciones s
    join public.perfiles p on p.id = s.perfil_id
    where case
            when p_perfil_ids is null then p.rol = 'jugador' and p.estado = 'activo'
            else s.perfil_id = any (p_perfil_ids)
          end;
end;
$$;

-- Jugadores activos con cuántos dispositivos tienen suscriptos (para elegir destinatarios y ver el total).
create function public.push_resumen_jugadores()
returns table (perfil_id uuid, nombre text, usuario text, dispositivos integer, desde timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.exigir_cuerpo_tecnico();
  return query
    select p.id, p.nombre, p.usuario, count(s.id)::integer, min(s.creada_en)
    from public.perfiles p
    left join public.push_suscripciones s on s.perfil_id = p.id
    where p.rol = 'jugador' and p.estado = 'activo' and p.auth_user_id is not null
    group by p.id, p.nombre, p.usuario
    order by p.nombre;
end;
$$;

-- El servicio de push avisa (404/410) cuando un dispositivo ya no existe (app desinstalada, permiso retirado):
-- después de cada envío se borran esas suscripciones para no seguir intentando.
create function public.push_quitar_vencidas(p_endpoints text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_borradas integer;
begin
  perform private.exigir_cuerpo_tecnico();
  delete from public.push_suscripciones where endpoint = any (p_endpoints);
  get diagnostics v_borradas = row_count;
  return v_borradas;
end;
$$;

revoke execute on function public.push_destinatarios(uuid[]) from public, anon;
revoke execute on function public.push_resumen_jugadores() from public, anon;
revoke execute on function public.push_quitar_vencidas(text[]) from public, anon;
grant execute on function public.push_destinatarios(uuid[]) to authenticated;
grant execute on function public.push_resumen_jugadores() to authenticated;
grant execute on function public.push_quitar_vencidas(text[]) to authenticated;
