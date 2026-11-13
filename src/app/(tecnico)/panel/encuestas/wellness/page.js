import { obtenerWellnessPlantel } from "@/lib/data/encuestasPlantel";
import { createClient } from "@/lib/supabase/server";
import MarcoEncuesta from "../_componentes/MarcoEncuesta";
import Wellness from "./Wellness";

export const metadata = {
  title: "Respuestas Wellness",
};

export default async function WellnessPage() {
  const respuestas = await obtenerWellnessPlantel(await createClient());
  return (
    <MarcoEncuesta
      titulo="Respuestas Wellness"
      descripcion="Sueño, estrés, fatiga y dolor muscular cargados por los jugadores"
    >
      <Wellness respuestas={respuestas} />
    </MarcoEncuesta>
  );
}
