-- Usuario de login de cada perfil (el que la persona escribe al entrar, p. ej. "fsaroka").
-- El email interno de Auth (usuario@hacoaj.test) vive en auth.users, que el panel técnico no
-- puede leer; el panel necesita mostrar el usuario en la ficha y distinguir cuentas especiales.
-- Los perfiles sin login (staff, externos) lo tienen vacío.

alter table public.perfiles add column usuario text;

update public.perfiles p
set usuario = split_part(u.email, '@', 1)
from auth.users u
where u.id = p.auth_user_id;

create unique index perfiles_usuario_idx on public.perfiles (usuario) where usuario is not null;
