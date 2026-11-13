import { obtenerResumenTorneoHacoaj } from "@/lib/data/analisisTorneo";
import { obtenerJugadoresConHistorial } from "@/lib/data/plantel";
import { createClient } from "@/lib/supabase/server";
import AnalisisPanel from "./AnalisisPanel";

export const metadata = {
  title: "Análisis Plantel 2026",
};

export default async function AnalisisPage() {
  const supabase = await createClient();
  const [{ jugadores, regresionExtra, posiciones }, torneo] = await Promise.all([
    obtenerJugadoresConHistorial(supabase),
    obtenerResumenTorneoHacoaj(supabase),
  ]);
  return (
    <AnalisisPanel
      jugadores={jugadores}
      regresionExtra={regresionExtra}
      posiciones={posiciones}
      torneo={torneo}
    />
  );
}
