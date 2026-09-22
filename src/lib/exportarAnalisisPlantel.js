import { promedioUltimoRegistro } from "@/lib/analisisPlantel";

// Exporta el resumen del Dashboard general a un archivo Excel de una hoja,
// igual que la v1.
export async function exportarResumenAnalisis(jugadores) {
  const XLSX = await import("xlsx");

  const sent = promedioUltimoRegistro(jugadores, "fuerzaSent", "fRelativa");
  const pecho = promedioUltimoRegistro(jugadores, "fuerzaPecho", "fRelativa");
  const pesos = jugadores.map((j) => j.peso).filter((p) => p != null && p > 0);
  const promedioPeso = pesos.length ? pesos.reduce((s, v) => s + v, 0) / pesos.length : null;
  const alturas = jugadores.map((j) => j.altura).filter(Boolean);
  const promedioAltura = alturas.length ? alturas.reduce((s, v) => s + v, 0) / alturas.length : null;
  const edades = jugadores.map((j) => j.edad).filter(Boolean);
  const promedioEdad = edades.length ? edades.reduce((s, v) => s + v, 0) / edades.length : null;

  const filas = [
    ["Métrica", "Valor"],
    ["Total jugadores", jugadores.length],
    ["Con mediciones de fuerza", Math.max(sent.cantidad, pecho.cantidad)],
    ["F. Relativa Sentadilla (prom.)", sent.promedio?.toFixed(2) ?? ""],
    ["F. Relativa Pecho (prom.)", pecho.promedio?.toFixed(2) ?? ""],
    ["Peso promedio (kg)", promedioPeso?.toFixed(1) ?? ""],
    ["Altura promedio (cm)", promedioAltura?.toFixed(1) ?? ""],
    ["Edad promedio", promedioEdad?.toFixed(1) ?? ""],
  ];
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  hoja["!cols"] = [{ wch: 28 }, { wch: 14 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Resumen");
  XLSX.writeFile(libro, "resumen_dashboard_plantel.xlsx");
}

// Exporta la tabla completa de fuerza del plantel (la de la pestaña
// "Fuerza" del dashboard) a un archivo Excel.
export async function exportarFuerzaPlantel(resumen) {
  if (resumen.length === 0) return;
  const XLSX = await import("xlsx");

  const filas = resumen.map((j) => ({
    Jugador: j.nombre,
    Posición: j.posicion ?? "",
    "Peso (kg)": j.peso ?? "",
    "VMP Sentadilla": j.sentadilla.vmp ?? "",
    "RM Sentadilla (kg)": j.sentadilla.rm ?? "",
    "F. Relativa Sentadilla": j.sentadilla.fRelativa ?? "",
    "Fecha Sentadilla": j.sentadilla.fecha ?? "",
    "VMP Pecho": j.pecho.vmp ?? "",
    "RM Pecho (kg)": j.pecho.rm ?? "",
    "F. Relativa Pecho": j.pecho.fRelativa ?? "",
    "Fecha Pecho": j.pecho.fecha ?? "",
  }));
  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Fuerza plantel");
  XLSX.writeFile(libro, "fuerza_plantel.xlsx");
}

// Exporta la tabla completa de pliegues del plantel (la de la pestaña
// "Composición corporal" del dashboard) a un archivo Excel.
export async function exportarPlieguesPlantel(resumen) {
  if (resumen.length === 0) return;
  const XLSX = await import("xlsx");

  const filas = resumen.map((j) => ({
    Jugador: j.nombre,
    Posición: j.posicion ?? "",
    "Altura (cm)": j.altura ?? "",
    "Peso (kg)": j.peso ?? "",
    "Δ Peso (kg)": j.deltaPeso ?? "",
    "Fecha peso": j.fechaPeso ?? "",
    "Peso ideal (kg)": j.pesoIdeal ?? "",
    "Diferencia vs. ideal (kg)": j.diferenciaIdeal ?? "",
    "Σ6 Pliegues (mm)": j.sumatoria6 ?? "",
  }));
  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Pliegues plantel");
  XLSX.writeFile(libro, "pliegues_plantel.xlsx");
}
