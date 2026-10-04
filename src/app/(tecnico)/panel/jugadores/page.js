import {
  obtenerHistorialFuerzaPlantel,
  obtenerHistorialPlieguesPlantel,
  obtenerJugadoresPanel,
} from "@/lib/data/plantel";
import { createClient } from "@/lib/supabase/server";
import Jugadores from "./Jugadores";

export const metadata = {
  title: "Jugadores",
};

export default async function JugadoresPage() {
  const supabase = await createClient();
  const [{ jugadores, posiciones }, historialFuerza, historialPliegues] = await Promise.all([
    obtenerJugadoresPanel(supabase),
    obtenerHistorialFuerzaPlantel(supabase),
    obtenerHistorialPlieguesPlantel(supabase),
  ]);

  return (
    <Jugadores
      jugadores={jugadores}
      posiciones={posiciones}
      historialFuerza={historialFuerza}
      historialPliegues={historialPliegues}
    />
  );
}
