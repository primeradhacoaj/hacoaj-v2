import PantallaTorneo from "@/components/PantallaTorneo";
import Planteles from "./Planteles";

export const metadata = {
  title: "Planteles",
};

export default function PlantelesPage() {
  return (
    <PantallaTorneo titulo="Planteles" subtitulo="Todos los equipos de la categoría">
      <Planteles />
    </PantallaTorneo>
  );
}
