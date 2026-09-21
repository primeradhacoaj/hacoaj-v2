import { aNumero, fechaLegible } from "@/lib/fuerza";
import { estadoPlieguesTabla } from "@/lib/pliegues";

// Exporta el historial de composición corporal a un archivo Excel con 2 hojas
// (datos y referencia de estados), igual que la v1. SheetJS se descarga recién
// cuando el jugador toca "Exportar".
export async function exportarHistorialPliegues({ pliegues, nombre }) {
  if (pliegues.length === 0) return;

  const XLSX = await import("xlsx");

  // El campo de la sumatoria puede venir como "sumatoria 6 pl" o "Σ 6 pl"
  const campo = "sumatoria 6 pl" in pliegues[0] ? "sumatoria 6 pl" : "Σ 6 pl";

  const filas = pliegues.map((p) => ({
    Fecha: fechaLegible(p["Fecha pliegue"]) || "--",
    "Peso (kg)": aNumero(p.Peso),
    "Sumatoria 6 pliegues (mm)": aNumero(p[campo]),
    Estado: estadoPlieguesTabla(p[campo]).texto,
  }));

  const hojaDatos = XLSX.utils.json_to_sheet(filas);
  hojaDatos["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 12 }];

  // Hoja de referencia (texto copiado de la v1)
  const referencia = [
    ["Cálculo del estado según sumatoria de 6 pliegues"],
    [""],
    ["Estado", "Condición", "Descripción"],
    ["Bueno", "Σ 6pl < 50 mm", "Composición corporal dentro de los valores esperados"],
    [
      "Regular",
      "50 mm ≤ Σ 6pl ≤ 60 mm",
      "Valores levemente elevados, puede requerir seguimiento",
    ],
    ["Alto", "Σ 6pl > 60 mm", "Valores elevados, requiere atención"],
    [""],
    ["Nota: La sumatoria de 6 pliegues incluye los pliegues"],
    ["cutáneos medidos con plicómetro. Un valor menor"],
    ["indica menor porcentaje de grasa corporal."],
  ];
  const hojaReferencia = XLSX.utils.aoa_to_sheet(referencia);
  hojaReferencia["!cols"] = [{ wch: 12 }, { wch: 24 }, { wch: 55 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hojaDatos, "Composición corporal");
  XLSX.utils.book_append_sheet(libro, hojaReferencia, "Referencia estados");

  const nombreArchivo = nombre.replace(/\s+/g, "_").toLowerCase();
  XLSX.writeFile(libro, `composicion_corporal_${nombreArchivo}.xlsx`);
}
