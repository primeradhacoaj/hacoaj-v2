import PantallaPanel from "@/components/PantallaPanel";
import { obtenerResumenPush } from "@/lib/data/notificaciones";
import { createClient } from "@/lib/supabase/server";
import EnviarNotificacion from "./EnviarNotificacion";

export const metadata = {
  title: "Enviar notificación",
};

export default async function NotificacionesPage() {
  const jugadores = await obtenerResumenPush(await createClient());

  return (
    <PantallaPanel titulo="Enviar notificación" volverHref="/panel/configuracion" volverTexto="Configuración" angosto>
      <EnviarNotificacion jugadores={jugadores} />
    </PantallaPanel>
  );
}
