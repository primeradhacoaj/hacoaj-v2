-- Corrección: la política de INSERT de page_views solo verificaba `perfil_id`,
-- así que un jugador podía registrar una visita con `rol = 'administrador'` y
-- falsear las estadísticas. Ahora también se verifica que el rol coincida con el
-- del usuario logueado (el valor por defecto ya lo completa solo).

drop policy "Cada usuario registra sus propias visitas" on public.page_views;

create policy "Cada usuario registra sus propias visitas"
  on public.page_views for insert to authenticated
  with check (
    perfil_id is not distinct from (select private.perfil_id_actual())
    and rol is not distinct from (select private.rol_actual())::text
  );
