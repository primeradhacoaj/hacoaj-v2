import PantallaPanel from "@/components/PantallaPanel";
import { obtenerPostPartidoPlantel } from "@/lib/data/encuestasPlantel";
import { createClient } from "@/lib/supabase/server";
import PostPartido from "./PostPartido";

export const metadata = {
  title: "Respuestas Post Partido",
};

export default async function PostPartidoPage() {
  const respuestas = await obtenerPostPartidoPlantel(await createClient());
  return (
    <PantallaPanel
      titulo="Respuestas Post Partido"
      volverHref="/panel/encuestas"
      volverTexto="Encuestas"
    >
      <PostPartido respuestas={respuestas} />
    </PantallaPanel>
  );
}
