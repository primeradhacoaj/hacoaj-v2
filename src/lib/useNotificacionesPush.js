"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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

// Interruptor de avisos push de este dispositivo (menú del jugador y Configuración del panel):
//  · sin permiso todavía  -> al tocar, el navegador pide permiso y se suscribe este dispositivo
//  · permiso dado         -> al tocar se vuelve a registrar el dispositivo por si hiciera falta
//  · permiso bloqueado    -> hay que habilitarlo desde la configuración del navegador
// `mostrar` es el de `useAviso()`.
export function useNotificacionesPush(mostrar) {
  const permiso = useSyncExternalStore(observarPermisoPush, permisoPush, permisoPushServidor);
  const [ocupado, setOcupado] = useState(false);

  // Con el permiso ya dado, cada vez que se abre la pantalla se asegura que este dispositivo esté registrado
  // a nombre de quien tiene la sesión (por si cambió la cuenta o el navegador renovó la suscripción).
  useEffect(() => {
    if (permiso === "granted") {
      activarPush(createClient()).catch((error) => console.error("Push: no se pudo registrar", error));
    }
  }, [permiso]);

  async function activar() {
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

  return {
    soportado: permiso !== PUSH_NO_SOPORTADO,
    activas: permiso === "granted",
    bloqueadas: permiso === "denied",
    ocupado,
    activar,
  };
}
