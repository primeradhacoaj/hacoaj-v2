import PantallaPanel from "@/components/PantallaPanel";
import { obtenerFixture } from "@/lib/data/torneo";
import VacioPanel from "../../_componentes/VacioPanel";
import FixturePanel from "./FixturePanel";

export const metadata = {
  title: "Fixture",
};

export default async function FixturePanelPage() {
  const { fechas, equipos, equipo_zona: equipoZona } = await obtenerFixture();

  return (
    <PantallaPanel titulo="Fixture">
      {fechas.length > 0 ? (
        <FixturePanel fechas={fechas} equipos={equipos} equipoZona={equipoZona} />
      ) : (
        <VacioPanel mensaje="No se pudo obtener el fixture en este momento." />
      )}
    </PantallaPanel>
  );
}
