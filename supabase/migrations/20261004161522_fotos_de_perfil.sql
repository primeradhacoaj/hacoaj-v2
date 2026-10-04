-- Fotos de perfil. En la v1 eran archivos `static/fotos/{usuario}.png` (la columna
-- "Foto" de la hoja estaba muerta). Ahora van a un bucket de Supabase Storage y
-- la base solo guarda la ruta del archivo.
--
-- El bucket es público para poder usar la URL directa en un <img>, pero el archivo
-- se guarda con un nombre aleatorio (no con el id ni el usuario) para que la URL no
-- se pueda adivinar: es más reservado que la v1, donde bastaba conocer el usuario.
-- Cambiar una foto crea un archivo nuevo, así que tampoco hay caché vieja.

alter table public.perfiles add column foto_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Leer es público (por ser un bucket público). Subir, reemplazar o borrar: solo el administrador.
create policy "Solo el administrador sube fotos de perfil"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (select private.rol_actual()) = 'administrador');

create policy "Solo el administrador reemplaza fotos de perfil"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatares' and (select private.rol_actual()) = 'administrador')
  with check (bucket_id = 'avatares' and (select private.rol_actual()) = 'administrador');

create policy "Solo el administrador borra fotos de perfil"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (select private.rol_actual()) = 'administrador');

-- La vista del plantel (nombres para las alineaciones) también expone la foto.
create or replace view public.plantel as
  select id, nombre, posicion, pierna_habil, estado, foto_path
  from public.perfiles
  where rol = 'jugador';
