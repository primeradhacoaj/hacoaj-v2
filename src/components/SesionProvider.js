"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

// SESIÓN SIMULADA.
// Guarda quién inició sesión en el navegador (localStorage) para que todas las
// pantallas lo sepan. Es PROVISORIO: cuando llegue Supabase Auth, la sesión
// será real y esto se reemplaza. Las pantallas usan siempre `useSesion()`, así
// que no van a notar el cambio.

const CLAVE = "hacoaj_sesion_prueba";
const oyentes = new Set(); // quienes quieren enterarse cuando la sesión cambia
let enMemoria = null; // respaldo por si el navegador bloquea localStorage

function suscribir(aviso) {
  oyentes.add(aviso);
  window.addEventListener("storage", aviso); // cambios hechos desde otra pestaña
  return () => {
    oyentes.delete(aviso);
    window.removeEventListener("storage", aviso);
  };
}

function leer() {
  try {
    return window.localStorage.getItem(CLAVE);
  } catch {
    return enMemoria;
  }
}

// Mientras se arma la página en el servidor no hay navegador: "undefined"
// significa "todavía no sé si hay sesión".
function leerEnServidor() {
  return undefined;
}

function guardar(valor) {
  enMemoria = valor;
  try {
    if (valor) window.localStorage.setItem(CLAVE, valor);
    else window.localStorage.removeItem(CLAVE);
  } catch {
    // sin localStorage la sesión dura mientras la pestaña esté abierta
  }
  oyentes.forEach((aviso) => aviso());
}

const SesionContext = createContext(null);

export function SesionProvider({ children }) {
  const crudo = useSyncExternalStore(suscribir, leer, leerEnServidor);

  const sesion = useMemo(() => {
    if (!crudo) return null;
    try {
      return JSON.parse(crudo);
    } catch {
      return null;
    }
  }, [crudo]);

  const iniciar = useCallback((usuario) => guardar(JSON.stringify(usuario)), []);
  const cerrar = useCallback(() => guardar(null), []);

  const valor = useMemo(
    () => ({ sesion, cargando: crudo === undefined, iniciar, cerrar }),
    [sesion, crudo, iniciar, cerrar],
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

// Devuelve { sesion, cargando, iniciar(usuario), cerrar() }.
//   sesion    { usuario, nombre, rol } o null si nadie inició sesión
//   cargando  true un instante, hasta saber si hay sesión guardada
export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) {
    throw new Error("useSesion se usa dentro de <SesionProvider>");
  }
  return contexto;
}
