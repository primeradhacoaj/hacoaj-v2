// Exporta la ficha de un jugador del panel técnico a un archivo Excel con 4
// hojas (info general, fuerza, pliegues y pesos), igual que la v1.
export async function exportarFichaJugador({ jugador: j, sentadilla, pecho, pliegues, pesos }) {
  const XLSX = await import("xlsx");
  const libro = XLSX.utils.book_new();

  const hojaInfo = XLSX.utils.aoa_to_sheet([
    ["Campo", "Valor"],
    ["Nombre", j.nombre],
    ["Posición", j.posicion || ""],
    ["Pierna hábil", j.piernaHabil || ""],
    ["Edad", j.edad || ""],
    ["Altura (cm)", j.altura || ""],
    ["Último peso (kg)", j.peso || ""],
    ["Nacimiento", j.nacimiento || ""],
    ["Estado", j.estado || ""],
  ]);
  hojaInfo["!cols"] = [{ wch: 18 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(libro, hojaInfo, "Info general");

  const hojaTabla = (filas, columnas, nombreHoja) => {
    const datos = filas.map((fila) =>
      Object.fromEntries(columnas.map(([clave, etiqueta]) => [etiqueta, fila[clave] ?? ""])),
    );
    const hoja = XLSX.utils.json_to_sheet(datos.length > 0 ? datos : [{}]);
    XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
  };

  const columnasFuerza = [
    ["fecha", "Fecha"],
    ["peso", "Peso corporal"],
    ["carga", "Carga externa"],
    ["vmp", "VMP"],
    ["rm", "RM estimado"],
    ["fRelativa", "F. Relativa"],
    ["comentario", "Comentario"],
  ];
  hojaTabla(sentadilla, columnasFuerza, "Fuerza - Sentadilla");
  hojaTabla(pecho, columnasFuerza, "Fuerza - Pecho");

  const columnasPliegues = [
    ["fecha", "Fecha"],
    ["peso", "Peso"],
    ["talla", "Talla"],
    ["imc", "IMC"],
    ["plTricipital", "Tricipital"],
    ["plSubescapular", "Subescapular"],
    ["plSupraespinal", "Supraespinal"],
    ["plAbdominal", "Abdominal"],
    ["plMuslo", "Muslo"],
    ["plPantorrilla", "Pantorrilla"],
    ["sumatoria6", "Sumatoria 6 pliegues"],
    ["pesoIdeal", "Peso ideal"],
    ["comentario", "Comentario"],
  ];
  hojaTabla(pliegues, columnasPliegues, "Pliegues");

  hojaTabla(
    pesos,
    [
      ["fecha", "Fecha"],
      ["peso", "Peso (kg)"],
    ],
    "Pesos",
  );

  const nombreArchivo = j.nombre.replace(/\s+/g, "_").toLowerCase();
  XLSX.writeFile(libro, `ficha_${nombreArchivo}.xlsx`);
}
