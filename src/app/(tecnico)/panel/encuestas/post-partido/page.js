import { obtenerPostPartidoPlantel } from "@/lib/data/encuestasPlantel";
import { createClient } from "@/lib/supabase/server";
import MarcoEncuesta from "../_componentes/MarcoEncuesta";
import PostPartido from "./PostPartido";

export const metadata = {
  title: "Respuestas Post Partido",
};

export default async function PostPartidoPage() {
  const respuestas = await obtenerPostPartidoPlantel(await createClient());
  return (
    <MarcoEncuesta
      titulo="Respuestas Post Partido"
      descripcion="Información cargada por los jugadores después de cada partido"
    >
      <PostPartido respuestas={respuestas} />
    </MarcoEncuesta>
  );
}
