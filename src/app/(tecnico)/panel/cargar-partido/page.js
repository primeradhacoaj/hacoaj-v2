import Guardia from "@/components/Guardia";
import PantallaPanel from "@/components/PantallaPanel";
import { obtenerOpcionesCargarPartido } from "@/lib/data/partidos";
import { createClient } from "@/lib/supabase/server";
import CargarPartido from "./CargarPartido";

export const metadata = {
  title: "Cargar partido",
};

// Solo el administrador carga partidos (la base además lo exige con RLS).
export default async function CargarPartidoPage() {
  const opciones = await obtenerOpcionesCargarPartido(await createClient());

  return (
    <Guardia roles={["administrador"]}>
      <PantallaPanel titulo="Cargar partido">
        <CargarPartido rivales={opciones.rivales} jugadores={opciones.jugadores} />
      </PantallaPanel>
    </Guardia>
  );
}
