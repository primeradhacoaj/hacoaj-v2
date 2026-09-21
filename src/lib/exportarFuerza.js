import { aNumero, fechaLegible } from "@/lib/fuerza";

// Exporta el historial de fuerza a un archivo Excel con 3 hojas (pecho,
// sentadilla y referencia metodológica), igual que la v1.
//
// SheetJS (la librería que arma el Excel) pesa bastante, así que se descarga
// recién cuando el jugador toca "Exportar".
export async function exportarHistorialFuerza({ pecho, sentadilla, nombre }) {
  if (pecho.length === 0 && sentadilla.length === 0) return;

  const XLSX = await import("xlsx");
  const libro = XLSX.utils.book_new();

  const filas = (registros, campos) =>
    registros.map((r) => ({
      Fecha: fechaLegible(r[campos.fecha]) || "—",
      "Peso (kg)": aNumero(r.Peso),
      "Fecha peso": fechaLegible(r["Fecha peso"]) || "—",
      "Carga externa (kg)": aNumero(r[campos.carga]),
      "VMP (m/s)": aNumero(r[campos.vmp]),
      "RM Estimado (kg)": aNumero(r[campos.rm]),
      "F. Relativa": aNumero(r[campos.relativa]),
    }));

  const anchos = [
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 18 },
    { wch: 12 },
  ];

  const hojaPecho = XLSX.utils.json_to_sheet(
    filas(pecho, {
      fecha: "Fecha Pecho",
      carga: "C EXTERNA PECHO",
      vmp: "VMP PECHO",
      rm: "RM ESTIMADO PECHO",
      relativa: "F RELATIVA (1,3) PECHO",
    }),
  );
  hojaPecho["!cols"] = anchos;
  XLSX.utils.book_append_sheet(libro, hojaPecho, "Historial Pecho");

  const hojaSentadilla = XLSX.utils.json_to_sheet(
    filas(sentadilla, {
      fecha: "Fecha Sent",
      carga: "C EXTERNA SENT",
      vmp: "VMP SENTADILLA",
      rm: "RM ESTIMADO SENT",
      relativa: "F RELATIVA (1,8/2) SENT",
    }),
  );
  hojaSentadilla["!cols"] = anchos;
  XLSX.utils.book_append_sheet(libro, hojaSentadilla, "Historial Sentadilla");

  // Hoja de referencia metodológica (texto copiado de la v1)
  const referencia = [
    ["Referencia metodológica — Evaluación de fuerza"],
    [""],
    ["Concepto", "Descripción"],
    [
      "VMP (Velocidad Media Propulsiva)",
      "Velocidad a la que se desplaza la carga durante la fase propulsiva del movimiento. Se mide con un encoder lineal (ej: Valkyria Trainer). A menor VMP, mayor porcentaje del 1RM representa esa carga.",
    ],
    [""],
    [
      "RM Estimado (Repetición Máxima)",
      "Peso máximo que el jugador podría levantar una sola vez. Se estima a partir de la VMP registrada y la carga externa utilizada, sin necesidad de realizar un test máximo real (menor riesgo de lesión).",
    ],
    [""],
    [
      "F. Relativa (Fuerza Relativa)",
      "RM Estimado dividido por el peso corporal del jugador. Permite comparar la fuerza entre jugadores de distinto peso. Objetivo sentadilla: 1.8–2.0. Objetivo pecho: 1.3–1.5.",
    ],
    [""],
    [
      "Contexto",
      "Los valores de VMP se basan en las tablas de referencia de Sánchez Medina et al. (2014) para sentadilla y González Badillo y Sánchez Medina (2010) para press banca. Estas tablas relacionan cada VMP con un porcentaje del 1RM, permitiendo estimar la repetición máxima sin realizar un esfuerzo máximo real.",
    ],
    [""],
    [
      "Nota",
      "Los valores son orientativos y pueden variar según la técnica, tipo de barra, y nivel de entrenamiento del atleta.",
    ],
  ];
  const hojaReferencia = XLSX.utils.aoa_to_sheet(referencia);
  hojaReferencia["!cols"] = [{ wch: 16 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(libro, hojaReferencia, "Referencia VMP");

  const nombreArchivo = nombre.replace(/\s+/g, "_").toLowerCase();
  XLSX.writeFile(libro, `historial_fuerza_${nombreArchivo}.xlsx`);
}
