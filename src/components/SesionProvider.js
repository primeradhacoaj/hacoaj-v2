"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";

// SESIÓN REAL con Supabase Auth.
// La sesión de login (JWT) la maneja Supabase; acá se le suma el perfil del
// club (nombre, rol, posición…) que sale de la tabla `perfiles`. El resto de la
// app sigue usando `useSesion()` igual que con la sesión simulada de antes.
//
// Se usa useSyncExternalStore (como antes) para que el servidor y el navegador
// coincidan: en el servidor la sesión es "cargando", y recién en el navegador
// se sabe si hay alguien logueado.

const CARGANDO = { sesion: null, cargando: true };
let estado = CARGANDO;
const oyentes = new Set();
let escuchando = false;

function publicar(nuevo) {
  // Supabase avisa también cuando se vuelve a la pestaña; si no cambió nada,
  // no hace falta volver a dibujar.
  if (JSON.stringify(nuevo) === JSON.stringify(estado)) return;
  estado = nuevo;
  oyentes.forEach((aviso) => aviso());
}

async function cargarPerfil(session) {
  const supabase = createClient();
  const { data: perfil, error } = await supabase
    .from("perfiles")
    .select("nombre, rol, posicion, pierna_habil")
    .eq("auth_user_id", session.user.id)
    .maybeSingle();

  if (error) {
    publicar({ sesion: null, cargando: false });
    return;
  }
  // Una cuenta de login sin perfil en el club no tiene acceso a nada.
  if (!perfil) {
    await supabase.auth.signOut();
    return;
  }

  publicar({
    cargando: false,
    sesion: {
      usuario: (session.user.email ?? "").split("@")[0],
      nombre: perfil.nombre,
      rol: perfil.rol,
      posicion: perfil.posicion ?? "",
      piernaHabil: perfil.pierna_habil ?? "",
    },
  });
}

function escuchar() {
  if (escuchando) return;
  escuchando = true;
  createClient().auth.onAuthStateChange((evento, session) => {
    if (!session || evento === "SIGNED_OUT") {
      publicar({ sesion: null, cargando: false });
      return;
    }
    if (["INITIAL_SESSION", "SIGNED_IN", "USER_UPDATED"].includes(evento)) {
      // No se hacen consultas a Supabase adentro del callback (puede
      // trabarse): se difiere al próximo ciclo.
      setTimeout(() => cargarPerfil(session), 0);
    }
  });
}

function suscribir(aviso) {
  oyentes.add(aviso);
  escuchar();
  return () => oyentes.delete(aviso);
}

const SesionContext = createContext(null);

export function SesionProvider({ children }) {
  const { sesion, cargando } = useSyncExternalStore(
    suscribir,
    () => estado,
    () => CARGANDO,
  );

  const cerrar = useCallback(async () => {
    await createClient().auth.signOut();
  }, []);

  const valor = useMemo(() => ({ sesion, cargando, cerrar }), [sesion, cargando, cerrar]);

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

// Devuelve { sesion, cargando, cerrar() }.
//   sesion    { usuario, nombre, rol, posicion, piernaHabil } o null si nadie inició sesión
//   cargando  true un instante, hasta saber si hay sesión guardada
// Iniciar sesión se hace con `iniciarSesion` (src/lib/data/usuarios.js): el
// provider se entera solo cuando Supabase confirma el login.
export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) {
    throw new Error("useSesion se usa dentro de <SesionProvider>");
  }
  return contexto;
}
