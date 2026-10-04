import FuenteDatos from "@/components/FuenteDatos";
import PanelVacio from "@/components/PanelVacio";
import PantallaTorneo from "@/components/PantallaTorneo";
import SectionLabel from "@/components/SectionLabel";
import TablaTorneo from "@/components/TablaTorneo";
import { obtenerGoleadores } from "@/lib/data/torneo";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Goleadores",
};

const COLUMNAS = [
  { titulo: "#", tipo: "pos" },
  { titulo: "Jugador", tipo: "texto" },
  { titulo: "Equipo", tipo: "secundario" },
  { titulo: "Goles", tipo: "goles" },
];

// Pantalla de solo lectura: se arma en el servidor con los datos ya cargados.
export default async function GoleadoresPage() {
  const goleadores = await obtenerGoleadores(await createClient());

  return (
    <PantallaTorneo titulo="Goleadores">
      {goleadores.length > 0 ? (
        <>
          <SectionLabel nota={`${goleadores.length} jugadores`}>Ranking</SectionLabel>
          <TablaTorneo
            titulo="Ranking de goleadores"
            columnas={COLUMNAS}
            plantilla="28px 1fr 1fr 40px"
            plantillaChica="24px 1fr 1fr 36px"
            fuenteChica={11}
            filas={goleadores.map((g) => ({
              id: `${g.jugador}-${g.equipo}`,
              hacoaj: g.es_hacoaj,
              celdas: [g.pos, g.jugador, g.equipo, g.goles],
            }))}
          />
          <FuenteDatos />
        </>
      ) : (
        <PanelVacio
          icono="goleadores"
          mensaje="No se pudo obtener la tabla de goleadores en este momento."
        />
      )}
    </PantallaTorneo>
  );
}
