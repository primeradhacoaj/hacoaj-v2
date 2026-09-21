// Configuración y ayudas del historial de fuerza (copiadas de la v1).

// Los nombres de columna vienen de la hoja de cálculo de la v1; se mantienen
// tal cual para poder reutilizar los datos.
export const TIPOS = {
  sentadilla: {
    etiqueta: "Sentadilla",
    objetivo: 1.8,
    colorRm: "#c9a83e",
    campos: {
      fecha: "Fecha Sent",
      carga: "C EXTERNA SENT",
      vmp: "VMP SENTADILLA",
      rm: "RM ESTIMADO SENT",
      relativa: "F RELATIVA (1,8/2) SENT",
    },
  },
  pecho: {
    etiqueta: "Pecho",
    objetivo: 1.3,
    colorRm: "#0a53b5",
    campos: {
      fecha: "Fecha Pecho",
      carga: "C EXTERNA PECHO",
      vmp: "VMP PECHO",
      rm: "RM ESTIMADO PECHO",
      relativa: "F RELATIVA (1,3) PECHO",
    },
  },
};

// Color de un punto de fuerza relativa según qué tan cerca está del objetivo.
export function colorFuerzaRelativa(valor, objetivo) {
  if (valor === null || valor === undefined) return "#94a3b8";
  const proporcion = valor / objetivo;
  if (proporcion >= 1) return "#10b981";
  if (proporcion >= 0.8) return "#f59e0b";
  return "#ef4444";
}

// Bandas de color de fondo del gráfico de fuerza relativa.
export function zonasFuerzaRelativa(objetivo) {
  const limiteAmarillo = objetivo * 0.8;
  return [
    { min: objetivo, max: 99, color: "#10b981" },
    { min: limiteAmarillo, max: objetivo, color: "#f59e0b" },
    { min: 0, max: limiteAmarillo, color: "#ef4444" },
  ];
}
