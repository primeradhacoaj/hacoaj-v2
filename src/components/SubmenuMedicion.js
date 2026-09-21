"use client";

import SubmenuSeccion from "@/components/SubmenuSeccion";

// Submenú de un tipo de medición (Mi fuerza, Composición corporal…): elegir
// entre el último registro y el historial. Usa el submenú genérico con las dos
// opciones de siempre.
//
// Props:
//   seccion, titulo, subtitulo   textos del encabezado
//   decoracion, estiloDecoracion dibujo de fondo del encabezado (un <svg>) y su posición
//   iconoPildora, textoPildora   ícono y texto dorados bajo el nombre del jugador
//   ultimoHref, historialHref    a dónde lleva cada opción
//   historialDescripcion         texto de la opción "Mi historial"
//   historialDisponible          false = todavía sin pantalla: al tocarla avisa
export default function SubmenuMedicion({
  ultimoHref,
  historialHref,
  historialDescripcion,
  historialDisponible = true,
  ...resto
}) {
  return (
    <SubmenuSeccion
      {...resto}
      tituloLista="Tus registros"
      notaLista="2 vistas"
      opciones={[
        {
          icono: "analytics",
          titulo: "Mi último registro",
          descripcion: "Ver tu medición más reciente",
          href: ultimoHref,
          destacado: true,
        },
        {
          icono: "encuestas",
          tono: "navy",
          titulo: "Mi historial",
          descripcion: historialDescripcion,
          href: historialHref,
          disponible: historialDisponible,
        },
      ]}
    />
  );
}
