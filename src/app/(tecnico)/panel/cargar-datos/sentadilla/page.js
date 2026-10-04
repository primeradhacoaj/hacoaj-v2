import PantallaPanel from "@/components/PantallaPanel";
import { obtenerJugadoresParaCargar } from "@/lib/data/cargarDatos";
import { createClient } from "@/lib/supabase/server";
import CargarFuerza from "../CargarFuerza";

export const metadata = {
  title: "Cargar fuerza Sentadilla",
};

export default async function CargarFuerzaSentadillaPage() {
  const jugadores = await obtenerJugadoresParaCargar(await createClient());
  return (
    <PantallaPanel titulo="Fuerza Sentadilla" volverHref="/panel/cargar-datos" volverTexto="Cargar datos" angosto>
      <CargarFuerza tipo="sentadilla" jugadores={jugadores} />
    </PantallaPanel>
  );
}
