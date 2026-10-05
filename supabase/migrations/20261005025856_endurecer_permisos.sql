-- Endurecimiento de permisos (revisión de seguridad previa al lanzamiento). No cambia nada de lo que usa la app.
--
-- 1) Las tablas nacían con TRUNCATE, TRIGGER y REFERENCES para `anon` y `authenticated` (permisos por defecto de
--    Supabase). La API de datos no ofrece TRUNCATE y la app solo usa select/insert/update/delete, pero TRUNCATE
--    ignora las políticas RLS: no tiene por qué existir para nadie que no sea el dueño.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

-- Y que las tablas nuevas tampoco los reciban.
alter default privileges for role postgres in schema public revoke truncate, trigger, references on tables from anon, authenticated;

-- 2) `private.crear_cuenta` (da de alta cuentas de login) y `private.exigir_secreto_tareas` solo las llaman otras
--    funciones SECURITY DEFINER, que corren con los permisos de su dueño: nadie más necesita poder ejecutarlas.
--    (PostgreSQL las deja ejecutables para todos por defecto.)
revoke execute on function private.crear_cuenta(text, text) from public, anon, authenticated;
revoke execute on function private.exigir_secreto_tareas(text) from public, anon, authenticated;
