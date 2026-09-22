import PantallaPanel from "@/components/PantallaPanel";
import ConfiguracionPanel from "./ConfiguracionPanel";

export const metadata = {
  title: "Configuración",
};

export default function ConfiguracionPage() {
  return (
    <PantallaPanel titulo="Configuración" angosto>
      <ConfiguracionPanel />
    </PantallaPanel>
  );
}
