"use client";

import PerfilChip from "@/components/PerfilChip";
import { useSesion } from "@/components/SesionProvider";

// Tarjeta del jugador que inició sesión (nombre y una línea dorada), para las
// pantallas que la muestran debajo del encabezado.
//
// Props:
//   pildora  texto dorado bajo el nombre
export default function PerfilSesion({ pildora }) {
  const { sesion } = useSesion();
  return <PerfilChip compacto saludo="Jugador" nombre={sesion.nombre} foto={sesion.foto} pildora={pildora} />;
}
