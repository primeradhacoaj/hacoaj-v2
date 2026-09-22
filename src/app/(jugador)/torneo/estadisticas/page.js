import PantallaTorneo from "@/components/PantallaTorneo";
import PerfilSesion from "@/components/PerfilSesion";
import MisEstadisticas from "./MisEstadisticas";

export const metadata = {
  title: "Mis estadísticas",
};

export default function EstadisticasPage() {
  return (
    <PantallaTorneo
      titulo="Mis estadísticas"
      subtitulo="Tu rendimiento en el torneo"
      perfil={<PerfilSesion pildora="Estadísticas individuales" />}
      pieTexto="Volver al torneo"
      angosto
    >
      <MisEstadisticas />
    </PantallaTorneo>
  );
}
