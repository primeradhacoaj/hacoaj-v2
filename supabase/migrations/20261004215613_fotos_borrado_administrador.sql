-- Para reemplazar o borrar una foto, el administrador tiene que poder "ver" el archivo: en Postgres
-- un DELETE (o UPDATE) con WHERE necesita también una política de lectura, y sin ella borrar no
-- encuentra nada (la Storage API contesta "ok" pero no borra). Ver el contenido de las fotos sigue
-- siendo público por URL (el bucket es público); esto solo le permite al administrador listarlas y
-- gestionarlas.
create policy "Solo el administrador ve los archivos de fotos de perfil"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatares' and (select private.rol_actual()) = 'administrador');
