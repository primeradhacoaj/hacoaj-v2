import {
  obtenerHistorialFuerzaPlantel,
  obtenerHistorialPlieguesPlantel,
  obtenerJugadoresPanel,
} from "@/lib/data/plantel";
import Jugadores from "./Jugadores";

export const metadata = {
  title: "Jugadores",
};

export default async function JugadoresPage() {
  const [{ jugadores, posiciones }, historialFuerza, historialPliegues] = await Promise.all([
    obtenerJugadoresPanel(),
    obtenerHistorialFuerzaPlantel(),
    obtenerHistorialPlieguesPlantel(),
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
