import PantallaPanel from "@/components/PantallaPanel";
import { obtenerJugadoresParaCargar } from "@/lib/data/cargarDatos";
import { createClient } from "@/lib/supabase/server";
import CargarFuerza from "../CargarFuerza";

export const metadata = {
  title: "Cargar fuerza Pecho",
};

export default async function CargarFuerzaPechoPage() {
  const jugadores = await obtenerJugadoresParaCargar(await createClient());
  return (
    <PantallaPanel titulo="Fuerza Pecho" volverHref="/panel/cargar-datos" volverTexto="Cargar datos" angosto>
      <CargarFuerza tipo="pecho" jugadores={jugadores} />
    </PantallaPanel>
  );
}
