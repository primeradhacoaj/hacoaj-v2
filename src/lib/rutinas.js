// Planes de entrenamiento disponibles para los jugadores. Los PDF están en
// /public/rutinas. Más adelante esta lista puede salir de la base de datos.
//
// Cada plan: { titulo, descripcion, archivo } (`archivo` = nombre del PDF).
export const RUTINAS = [
  {
    titulo: "PLAN POTENCIA TREN INFERIOR",
    descripcion: "Trabajo de potencia para tren inferior",
    archivo: "PLAN POTENCIA TREN INFERIOR.pdf",
  },
  {
    titulo: "PLAN HIPERTROFIA",
    descripcion: "Rutina orientada a hipertrofia",
    archivo: "PLAN HIPERTROFIA.pdf",
  },
  {
    titulo: "PLAN AEROBICO",
    descripcion: "Trabajo aeróbico complementario",
    archivo: "PLAN AEROBICO.pdf",
  },
  {
    // En la v1 esta tarjeta apuntaba a "rutina Fmax TI.pdf", que no existe;
    // el archivo real es este.
    titulo: "PLAN FUERZA MAXIMA TREN INFERIOR",
    descripcion: "Fuerza máxima tren inferior",
    archivo: "PLAN FUERZA MAXIMA TREN INFERIOR.pdf",
  },
];

// Dirección web de un PDF de /public/rutinas (los nombres llevan espacios).
export function direccionPdf(archivo) {
  return `/rutinas/${encodeURIComponent(archivo)}`;
}
