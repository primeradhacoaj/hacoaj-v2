import PantallaPanel from "@/components/PantallaPanel";
import { obtenerHistorialFuerzaPlantel } from "@/lib/data/plantel";
import TablaHistorialPlantel from "../../_componentes/TablaHistorialPlantel";

export const metadata = {
  title: "Historial de fuerza",
};

const COLUMNAS = [
  { key: "jugador", titulo: "Jugador" },
  { key: "fecha", titulo: "Fecha Test" },
  { key: "peso", titulo: "Peso (kg)", num: true },
  { key: "carga", titulo: "C. Externa (kg)", num: true },
  { key: "vmp", titulo: "VMP (m/s)", num: true, decimales: 2 },
  { key: "rm", titulo: "RM Est. (kg)", num: true },
  { key: "fRelativa", titulo: "F. Relativa", num: true, decimales: 2, hl: true },
  { key: "comentario", titulo: "Comentario" },
];

export default async function FuerzaPlantelPage() {
  const { sentadilla, pecho } = await obtenerHistorialFuerzaPlantel();

  const pestanas = [
    { id: "sentadilla", titulo: "Sentadilla", columnas: COLUMNAS, filas: sentadilla, archivo: "historial_fuerza_sentadilla", hoja: "Sentadilla" },
    { id: "pecho", titulo: "Pecho", columnas: COLUMNAS, filas: pecho, archivo: "historial_fuerza_pecho", hoja: "Pecho" },
  ];

  return (
    <PantallaPanel titulo="Historial de Fuerza">
      <TablaHistorialPlantel
        descripcion="Vista completa tipo planilla de todos los testeos de sentadilla y press de pecho realizados"
        pestanas={pestanas}
      />
    </PantallaPanel>
  );
}
