"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import MenuItem from "@/components/MenuItem";
import {
  PUSH_NO_SOPORTADO,
  activarPush,
  observarPermisoPush,
  pedirPermisoPush,
  permisoPush,
  permisoPushServidor,
} from "@/lib/push";
import { createClient } from "@/lib/supabase/client";

const AVISO_BLOQUEADO = "Habilitá las notificaciones desde la configuración del navegador";

// Opción "Notificaciones" del menú del jugador (Ajustes). Funciona como interruptor, igual que en la v1:
//  · sin permiso todavía  -> flecha; al tocar, el navegador pide permiso y se suscribe este dispositivo
//  · permiso dado         -> "Activo"; al tocar se vuelve a registrar el dispositivo por si hiciera falta
//  · permiso bloqueado    -> "Bloqueado"; hay que habilitarlo desde la configuración del navegador
// Si el navegador no puede recibir avisos push, la opción no se muestra.
export default function ItemNotificaciones({ mostrar }) {
  const permiso = useSyncExternalStore(observarPermisoPush, permisoPush, permisoPushServidor);
  const [ocupado, setOcupado] = useState(false);

  // Con el permiso ya dado, cada vez que se abre el menú se asegura que este dispositivo esté registrado
  // a nombre de quien tiene la sesión (por si cambió la cuenta o el navegador renovó la suscripción).
  useEffect(() => {
    if (permiso === "granted") {
      activarPush(createClient()).catch((error) => console.error("Push: no se pudo registrar", error));
    }
  }, [permiso]);

  if (permiso === PUSH_NO_SOPORTADO) return null;

  async function alTocar() {
    if (ocupado) return;
    if (permiso === "denied") {
      mostrar(AVISO_BLOQUEADO);
      return;
    }
    setOcupado(true);
    try {
      if (permiso === "default") {
        const resultado = await pedirPermisoPush();
        if (resultado === "denied") mostrar(AVISO_BLOQUEADO);
        if (resultado !== "granted") return;
      }
      await activarPush(createClient());
      mostrar("¡Notificaciones activadas!", "exito");
    } catch (error) {
      console.error("Push: error al activar", error);
      mostrar("Error al activar notificaciones. Probá de nuevo.", "error");
    } finally {
      setOcupado(false);
    }
  }

  const activas = permiso === "granted";
  const bloqueadas = permiso === "denied";

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
      onClick={alTocar}
    />
  );
}
