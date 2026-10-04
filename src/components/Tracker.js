"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Registra las visitas a cada pantalla para la sección Analytics del administrador
// (reemplaza a `static/tracker.js` de la v1). No se ve: no dibuja nada.
//
// Cada visita guarda la pantalla, la query, de cuál venía y cuántos segundos estuvo.
// Se envía cuando se cambia de pantalla o cuando la pestaña se oculta / se cierra. Como al
// cerrar una pestaña el navegador corta los pedidos comunes, se manda con `keepalive`
// (el equivalente del `sendBeacon` de la v1, que no deja poner el token de la sesión).
//
// Quién es el usuario y su rol los completa la base sola con la sesión (no se mandan desde
// acá, así no se pueden falsificar). Sin sesión no se registra nada. No se miden el login
// ni las visitas de menos de 1 segundo (pantallas de paso, como un redirect).
export default function Tracker() {
  const pathname = usePathname();
  const token = useRef(null);
  const visita = useRef(null); // { pagina, query, previa, desde, enviada }
  const ultimaPagina = useRef("");

  // Mantiene a mano el token de la sesión (hace falta sincrónicamente al cerrar la pestaña).
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, session) => {
      token.current = session?.access_token ?? null;
    });
    return () => subscription.unsubscribe();
  }, []);

  // Una visita por cambio de pantalla; al irse, se envía la anterior.
  useEffect(() => {
    visita.current = {
      pagina: pathname,
      query: window.location.search,
      previa: ultimaPagina.current || referrerInterno(),
      desde: Date.now(),
      enviada: false,
    };
    ultimaPagina.current = pathname;

    return () => enviar(visita.current, token.current);
  }, [pathname]);

  // La pestaña se oculta o se cierra: se envía la visita actual (una sola vez, como la v1).
  useEffect(() => {
    const alOcultar = () => enviar(visita.current, token.current);
    const alCambiarVisibilidad = () => document.visibilityState === "hidden" && alOcultar();
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    window.addEventListener("pagehide", alOcultar);
    return () => {
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      window.removeEventListener("pagehide", alOcultar);
    };
  }, []);

  return null;
}

function referrerInterno() {
  try {
    return document.referrer ? new URL(document.referrer).pathname : "";
  } catch {
    return "";
  }
}

// Pantallas que no se miden: el login (todavía no hay usuario) y la raíz, que solo redirige.
const SIN_MEDIR = new Set(["/", "/login"]);

function enviar(visita, token) {
  if (!visita || visita.enviada || !token) return;
  visita.enviada = true;
  if (SIN_MEDIR.has(visita.pagina)) return;
  const duracion = Math.round((Date.now() - visita.desde) / 1000);
  if (duracion < 1) return;

  fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/page_views`, {
    method: "POST",
    keepalive: true,
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      pagina: visita.pagina,
      query: visita.query || null,
      duracion_seg: duracion,
      pagina_previa: visita.previa || null,
    }),
  }).catch(() => {});
}
