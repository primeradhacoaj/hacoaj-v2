import PantallaTorneo from "@/components/PantallaTorneo";
import Equipos from "./Equipos";

export const metadata = {
  title: "Equipos",
};

export default function EquiposPage() {
  return (
    <PantallaTorneo titulo="Equipos" subtitulo="Estadísticas y partidos por equipo">
      <Equipos />
    </PantallaTorneo>
  );
}
