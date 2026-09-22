import { obtenerResumenTorneoHacoaj } from "@/lib/data/analisisTorneo";
import { obtenerJugadoresConHistorial } from "@/lib/data/plantel";
import AnalisisPanel from "./AnalisisPanel";

export const metadata = {
  title: "Análisis Plantel 2026",
};

export default async function AnalisisPage() {
  const [{ jugadores, posiciones }, torneo] = await Promise.all([
    obtenerJugadoresConHistorial(),
    obtenerResumenTorneoHacoaj(),
  ]);
  return <AnalisisPanel jugadores={jugadores} posiciones={posiciones} torneo={torneo} />;
}
