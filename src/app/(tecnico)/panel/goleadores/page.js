import EtiquetaSeccion from "@/components/EtiquetaSeccion";
import PantallaPanel from "@/components/PantallaPanel";
import { obtenerGoleadores } from "@/lib/data/torneo";
import FuentePanel from "../../_componentes/FuentePanel";
import TablaPanel from "../../_componentes/TablaPanel";
import VacioPanel from "../../_componentes/VacioPanel";

export const metadata = {
  title: "Goleadores",
};

const COLUMNAS = [
  { titulo: "#" },
  { titulo: "Jugador", izquierda: true },
  { titulo: "Equipo", izquierda: true },
  { titulo: "Goles", tipo: "goles" },
];

export default async function GoleadoresPanelPage() {
  const goleadores = await obtenerGoleadores();

  return (
    <PantallaPanel titulo="Goleadores">
      {goleadores.length > 0 ? (
        <>
          <EtiquetaSeccion nota={`${goleadores.length} jugadores`}>Ranking</EtiquetaSeccion>
          <TablaPanel
            titulo="Ranking de goleadores"
            columnas={COLUMNAS}
            filas={goleadores.map((g) => ({
              id: `${g.jugador}-${g.equipo}`,
              hacoaj: g.es_hacoaj,
              celdas: [g.pos, g.jugador, g.equipo, g.goles],
            }))}
          />
          <FuentePanel />
        </>
      ) : (
        <VacioPanel mensaje="No se pudo obtener la tabla de goleadores en este momento." />
      )}
    </PantallaPanel>
  );
}
