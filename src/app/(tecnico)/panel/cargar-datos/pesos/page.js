import PantallaPanel from "@/components/PantallaPanel";
import { obtenerJugadoresParaCargar } from "@/lib/data/cargarDatos";
import { createClient } from "@/lib/supabase/server";
import CargarPesos from "./CargarPesos";

export const metadata = {
  title: "Cargar pesos",
};

export default async function CargarPesosPage() {
  const jugadores = await obtenerJugadoresParaCargar(await createClient());
  return (
    <PantallaPanel titulo="Pesos" volverHref="/panel/cargar-datos" volverTexto="Cargar datos" angosto>
      <CargarPesos jugadores={jugadores} />
    </PantallaPanel>
  );
}
