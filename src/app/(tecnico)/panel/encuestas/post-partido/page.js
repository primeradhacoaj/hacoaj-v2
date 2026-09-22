import PantallaPanel from "@/components/PantallaPanel";
import { obtenerPostPartidoPlantel } from "@/lib/data/encuestasPlantel";
import PostPartido from "./PostPartido";

export const metadata = {
  title: "Respuestas Post Partido",
};

export default async function PostPartidoPage() {
  const respuestas = await obtenerPostPartidoPlantel();
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
