import PantallaPanel from "@/components/PantallaPanel";
import { obtenerEventosDelMes } from "@/lib/data/calendario";
import { createClient } from "@/lib/supabase/server";
import CalendarioPanel from "./CalendarioPanel";

export const metadata = {
  title: "Calendario",
};

export default async function CalendarioPage() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;
  const eventos = await obtenerEventosDelMes(await createClient(), anio, mes);

  return (
    <PantallaPanel titulo="Calendario">
      <CalendarioPanel anioInicial={anio} mesInicial={mes} eventosIniciales={eventos} />
    </PantallaPanel>
  );
}
