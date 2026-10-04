import PantallaPanel from "@/components/PantallaPanel";
import Guardia from "@/components/Guardia";
import { obtenerVisitas } from "@/lib/data/analytics";
import { createClient } from "@/lib/supabase/server";
import AnalyticsPanel from "./AnalyticsPanel";

export const metadata = {
  title: "Analytics",
};

export default async function AnalyticsPage() {
  const visitas = await obtenerVisitas(await createClient());

  return (
    <Guardia roles={["administrador"]}>
      <PantallaPanel titulo="Analytics">
        <AnalyticsPanel visitas={visitas} />
      </PantallaPanel>
    </Guardia>
  );
}
