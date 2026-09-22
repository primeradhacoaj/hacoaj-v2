// Exporta una tabla de respuestas del plantel (wellness, post partido,
// historial de fuerza/pliegues…) a un archivo Excel de una sola hoja.
//
// columnas: [[clave, etiqueta]]
export async function exportarTabla(filas, columnas, nombreArchivo, nombreHoja = "Respuestas") {
  if (filas.length === 0) return;

  const XLSX = await import("xlsx");
  const datos = filas.map((fila) =>
    Object.fromEntries(columnas.map(([clave, etiqueta]) => [etiqueta, fila[clave] ?? ""])),
  );
  const hoja = XLSX.utils.json_to_sheet(datos);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
  XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
}
