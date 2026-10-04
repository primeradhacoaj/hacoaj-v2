import PantallaPanel from "@/components/PantallaPanel";
import { obtenerWellnessPlantel } from "@/lib/data/encuestasPlantel";
import { createClient } from "@/lib/supabase/server";
import Wellness from "./Wellness";

export const metadata = {
  title: "Respuestas Wellness",
};

export default async function WellnessPage() {
  const respuestas = await obtenerWellnessPlantel(await createClient());
  return (
    <PantallaPanel
      titulo="Respuestas Wellness"
      volverHref="/panel/encuestas"
      volverTexto="Encuestas"
    >
      <Wellness respuestas={respuestas} />
    </PantallaPanel>
  );
}
