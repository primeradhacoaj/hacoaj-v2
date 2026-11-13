"use client";

import { usePathname } from "next/navigation";
import BarraSuperior from "@/components/BarraSuperior";

const GENERAL = { titulo: "Panel Técnico", subtitulo: "Club Náutico Hacoaj · Primera D" };

// Barra superior de cada pantalla del panel técnico. En la v1 cada pantalla
// tenía la suya: casi todas iguales ("Panel Técnico"), pero algunas con su propio
// título y el botón para volver arriba a la derecha. Se arma acá, según la
// dirección, para no repetirla en cada página.
const PROPIAS = {
  // El dashboard de análisis tiene su propia barra lateral (sin barra superior).
  "/panel/analisis": null,
  "/panel/encuestas": {
    titulo: "Encuestas",
    subtitulo: GENERAL.subtitulo,
    volver: { href: "/panel", texto: "Volver al menú" },
    salir: false,
  },
  "/panel/encuestas/wellness": {
    titulo: "Wellness",
    subtitulo: "Vista del cuerpo técnico",
    volver: { href: "/panel/encuestas", texto: "Volver a encuestas" },
    compacta: true,
    usuario: false,
    salir: false,
  },
  "/panel/encuestas/post-partido": {
    titulo: "Encuesta Post Partido",
    subtitulo: "Vista del cuerpo técnico",
    volver: { href: "/panel/encuestas", texto: "Volver a encuestas" },
    compacta: true,
    usuario: false,
    salir: false,
  },
};

export default function BarraPanel() {
  const ruta = usePathname();
  const propia = Object.hasOwn(PROPIAS, ruta) ? PROPIAS[ruta] : GENERAL;
  if (!propia) return null;
  return <BarraSuperior {...propia} />;
}
