// Botón "Exportar" del dashboard de análisis, igual que la v1: un Excel con 5
// hojas — resumen de KPIs, una fila por jugador y el historial completo de
// sentadilla, pecho y pliegues.
export async function exportarDashboard(jugadores) {
  const XLSX = await import("xlsx");
  const ultimo = (arr) => (arr?.length ? arr[arr.length - 1] : {});
  const promedio = (valores) => {
    const v = valores.filter((x) => x != null && x !== 0);
    return v.length ? Number((v.reduce((s, x) => s + x, 0) / v.length).toFixed(2)) : "";
  };
  const ancho = (titulos) => titulos.map((t) => ({ wch: Math.max(t.length + 2, 14) }));
  const libro = XLSX.utils.book_new();

  const fRelSent = jugadores.map((j) => ultimo(j.fuerzaSent).fRelativa);
  const fRelPecho = jugadores.map((j) => ultimo(j.fuerzaPecho).fRelativa);
  const resumen = XLSX.utils.aoa_to_sheet([
    ["Métrica", "Valor"],
    ["Total jugadores", jugadores.length],
    ["Con mediciones", jugadores.filter((j) => j.fuerzaSent?.length || j.fuerzaPecho?.length).length],
    ["F. Relativa Sent. (prom)", promedio(fRelSent)],
    ["F. Relativa Pecho (prom)", promedio(fRelPecho)],
    ["Σ6 Pliegues (prom)", promedio(jugadores.map((j) => ultimo(j.pliegues).sumatoria6))],
    ["Peso promedio (kg)", promedio(jugadores.map((j) => j.peso))],
    ["Altura promedio (cm)", promedio(jugadores.map((j) => j.altura))],
    ["Edad promedio", promedio(jugadores.map((j) => j.edad))],
  ]);
  resumen["!cols"] = [{ wch: 28 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(libro, resumen, "Resumen");

  const titulos = ["Jugador", "Posición", "Edad", "Altura (cm)", "Peso (kg)", "F.Rel. Sent.", "RM Sent.", "Últ. med. Sent.",
    "F.Rel. Pecho", "RM Pecho", "Últ. med. Pecho", "Σ6 Pliegues (mm)"];
  const filas = jugadores.map((j) => {
    const s = ultimo(j.fuerzaSent);
    const p = ultimo(j.fuerzaPecho);
    return [j.nombre, j.posicion || "", j.edad ?? "", j.altura ?? "", j.peso ?? "", s.fRelativa ?? "", s.rm ?? "", s.fecha || "",
      p.fRelativa ?? "", p.rm ?? "", p.fecha || "", ultimo(j.pliegues).sumatoria6 ?? ""];
  });
  const hojaJugadores = XLSX.utils.aoa_to_sheet([titulos, ...filas]);
  hojaJugadores["!cols"] = ancho(titulos);
  XLSX.utils.book_append_sheet(libro, hojaJugadores, "Jugadores");

  const titulosFuerza = ["Jugador", "Fecha", "Peso Corp.", "Carga", "VMP", "RM Estimado", "F. Relativa"];
  for (const [coleccion, hoja] of [["fuerzaSent", "Hist. Sentadilla"], ["fuerzaPecho", "Hist. Pecho"]]) {
    const registros = jugadores.flatMap((j) =>
      (j[coleccion] || []).map((r) => [j.nombre, r.fecha || "", r.peso ?? "", r.carga ?? "", r.vmp ?? "", r.rm ?? "", r.fRelativa ?? ""]),
    );
    const h = XLSX.utils.aoa_to_sheet([titulosFuerza, ...registros]);
    h["!cols"] = ancho(titulosFuerza);
    XLSX.utils.book_append_sheet(libro, h, hoja);
  }

  const titulosPliegues = ["Jugador", "Fecha", "Peso (kg)", "Σ6 Pliegues (mm)"];
  const pliegues = jugadores.flatMap((j) => (j.pliegues || []).map((r) => [j.nombre, r.fecha || "", r.peso ?? "", r.sumatoria6 ?? ""]));
  const hojaPliegues = XLSX.utils.aoa_to_sheet([titulosPliegues, ...pliegues]);
  hojaPliegues["!cols"] = ancho(titulosPliegues);
  XLSX.utils.book_append_sheet(libro, hojaPliegues, "Hist. Pliegues");

  XLSX.writeFile(libro, `Dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Exporta el resumen del torneo (estadísticas del equipo + plantel) de la
// pestaña "Promocional 2026" del dashboard, a un Excel de 2 hojas.
export async function exportarTorneoPlantel(equipo, stats, jugadores) {
  const XLSX = await import("xlsx");
  const libro = XLSX.utils.book_new();

  const hojaEquipo = XLSX.utils.aoa_to_sheet([
    ["Métrica", "Valor"],
    ["Equipo", equipo],
    ["Temporada", stats.temporada],
    ["Partidos jugados", stats.pj],
    ["Puntos", stats.pts],
    ["Ganados", stats.pg],
    ["Empatados", stats.pe],
    ["Perdidos", stats.pp],
    ["Goles a favor", stats.gf],
    ["Goles en contra", stats.gc],
    ["Diferencia de gol", stats.dif],
  ]);
  hojaEquipo["!cols"] = [{ wch: 20 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(libro, hojaEquipo, "Equipo");

  const filas = jugadores.map((j) => ({
    Jugador: j.nombre,
    Posición: j.posicion ?? "",
    PJ: j.partidos,
    Titular: j.titular,
    Minutos: j.minutos,
    Goles: j.goles,
    Asistencias: j.asistencias,
    Amarillas: j.amarillas,
    Rojas: j.rojas,
  }));
  const hojaJugadores = XLSX.utils.json_to_sheet(filas);
  XLSX.utils.book_append_sheet(libro, hojaJugadores, "Plantel");

  XLSX.writeFile(libro, "torneo_plantel.xlsx");
}
