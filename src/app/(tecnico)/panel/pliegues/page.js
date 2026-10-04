import PantallaPanel from "@/components/PantallaPanel";
import { obtenerHistorialPlieguesPlantel } from "@/lib/data/plantel";
import { createClient } from "@/lib/supabase/server";
import TablaHistorialPlantel from "../../_componentes/TablaHistorialPlantel";

export const metadata = {
  title: "Historial de pliegues",
};

const COLUMNAS_PLIEGUES = [
  { key: "jugador", titulo: "Jugador" },
  { key: "fecha", titulo: "Fecha" },
  { key: "peso", titulo: "Peso (kg)", num: true },
  { key: "talla", titulo: "Talla (cm)", num: true, decimales: 1 },
  { key: "imc", titulo: "IMC", num: true },
  { key: "plTricipital", titulo: "Pl. Tricipital", num: true },
  { key: "plSubescapular", titulo: "Pl. Subescap.", num: true },
  { key: "plSupraespinal", titulo: "Pl. Supraes.", num: true },
  { key: "plAbdominal", titulo: "Pl. Abdominal", num: true },
  { key: "plMuslo", titulo: "Pl. Muslo", num: true },
  { key: "plPantorrilla", titulo: "Pl. Pantor.", num: true },
  { key: "sumatoria6", titulo: "Σ6 Pliegues", num: true, hl: true },
  { key: "pesoIdeal", titulo: "Peso Ideal", num: true },
  { key: "comentario", titulo: "Comentario" },
];

const COLUMNAS_PESOS = [
  { key: "jugador", titulo: "Jugador" },
  { key: "fecha", titulo: "Fecha" },
  { key: "peso", titulo: "Peso (kg)", num: true, hl: true },
];

export default async function PliequesPlantelPage() {
  const { pliegues, pesos } = await obtenerHistorialPlieguesPlantel(await createClient());

  const pestanas = [
    { id: "pliegues", titulo: "Pliegues", columnas: COLUMNAS_PLIEGUES, filas: pliegues, archivo: "historial_pliegues", hoja: "Pliegues" },
    { id: "pesos", titulo: "Pesajes", columnas: COLUMNAS_PESOS, filas: pesos, archivo: "historial_pesos", hoja: "Pesajes" },
  ];

  return (
    <PantallaPanel titulo="Historial de Pliegues y Peso">
      <TablaHistorialPlantel
        descripcion="Vista completa tipo planilla de todas las mediciones de pliegues y pesajes realizadas"
        pestanas={pestanas}
      />
    </PantallaPanel>
  );
}
