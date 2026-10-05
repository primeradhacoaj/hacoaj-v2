"use client";

import { useEffect } from "react";

// Registra el service worker (`public/sw.js`) apenas se abre la app. No dibuja nada.
// Es lo que permite instalar la app en la pantalla de inicio y recibir notificaciones push.
export default function RegistrarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("No se pudo registrar el service worker", error);
    });
  }, []);

  return null;
}
