-- Corrección de `private.exigir_cuerpo_tecnico`: el rol es un enum (no admite compararse con ''), así que la
-- versión anterior fallaba para todos. Sin sesión (rol nulo) también debe rechazar.
create or replace function private.exigir_cuerpo_tecnico()
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_rol public.rol_usuario := private.rol_actual();
begin
  if v_rol is null or v_rol not in ('tecnico', 'administrador') then
    raise exception 'Solo el cuerpo técnico puede enviar notificaciones' using errcode = '42501';
  end if;
end;
$$;
