import PantallaTorneo from "@/components/PantallaTorneo";
import Jugadores from "./Jugadores";

export const metadata = {
  title: "Jugadores",
};

export default function JugadoresPage() {
  return (
    <PantallaTorneo titulo="Jugadores" subtitulo="Rankings y estadísticas individuales">
      <Jugadores />
    </PantallaTorneo>
  );
}
