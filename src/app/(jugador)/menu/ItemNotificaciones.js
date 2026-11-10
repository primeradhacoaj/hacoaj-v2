"use client";

import MenuItem from "@/components/MenuItem";
import { useNotificacionesPush } from "@/lib/useNotificacionesPush";

// Opción "Notificaciones" del menú del jugador (Ajustes), igual que en la v1: flecha sin permiso, "Activo" con
// permiso, "Bloqueado" si el navegador lo bloqueó. Si el navegador no puede recibir avisos push, no se muestra.
export default function ItemNotificaciones({ mostrar }) {
  const { soportado, activas, bloqueadas, activar } = useNotificacionesPush(mostrar);
  if (!soportado) return null;

  return (
    <MenuItem
      icono={bloqueadas ? "campanaApagada" : "campana"}
      tono={activas ? "oro" : "navy"}
      titulo="Notificaciones"
      descripcion={
        activas
          ? "Notificaciones activadas"
          : bloqueadas
            ? "Bloqueadas en el navegador"
            : "Activar avisos del cuerpo técnico"
      }
      insignia={
        activas
          ? { texto: "Activo", tipo: "activo" }
          : bloqueadas
            ? { texto: "Bloqueado", tipo: "bloqueado" }
            : undefined
      }
      onClick={activar}
    />
  );
}
