import Guardia from "@/components/Guardia";
import PantallaPanel from "@/components/PantallaPanel";
import { mercadoPagoConfigurado } from "@/lib/mercadoPago";
import { obtenerCobros } from "@/lib/data/cobros";
import { createClient } from "@/lib/supabase/server";
import CobrosPanel from "./CobrosPanel";

export const metadata = {
  title: "Cobros",
};

export default async function CobrosPage() {
  const { conceptos, pedidos, jugadores } = await obtenerCobros(await createClient());

  return (
    <Guardia roles={["administrador"]}>
      <PantallaPanel titulo="Cobros">
        <CobrosPanel
          conceptos={conceptos}
          pedidos={pedidos}
          jugadores={jugadores}
          configurado={mercadoPagoConfigurado()}
        />
      </PantallaPanel>
    </Guardia>
  );
}
