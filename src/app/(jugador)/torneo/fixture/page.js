import PanelVacio from "@/components/PanelVacio";
import PantallaTorneo from "@/components/PantallaTorneo";
import { obtenerFixture } from "@/lib/data/torneo";
import { createClient } from "@/lib/supabase/server";
import Fixture from "./Fixture";

export const metadata = {
  title: "Fixture",
};

export default async function FixturePage() {
  const { fechas, equipos, equipo_zona: equipoZona } = await obtenerFixture(await createClient());

  return (
    <PantallaTorneo titulo="Fixture">
      {fechas.length > 0 ? (
        <Fixture fechas={fechas} equipos={equipos} equipoZona={equipoZona} />
      ) : (
        <PanelVacio icono="fixture" mensaje="No se pudo obtener el fixture en este momento." />
      )}
    </PantallaTorneo>
  );
}
