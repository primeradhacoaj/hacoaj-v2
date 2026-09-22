"use client";

import { useCallback, useSyncExternalStore } from "react";

// Recuerda, en localStorage de este navegador, qué respuestas de una encuesta
// ya se marcaron como "vistas" (mismo patrón que la sesión simulada en
// SesionProvider: useSyncExternalStore evita el parpadeo entre lo que arma el
// servidor y lo que hay guardado en el navegador).

const VACIO = new Set();
const almacenes = new Map(); // storageKey -> { valor: Set|null, oyentes: Set<fn> }

function entradaDe(storageKey) {
  let entrada = almacenes.get(storageKey);
  if (!entrada) {
    entrada = { valor: null, oyentes: new Set() };
    almacenes.set(storageKey, entrada);
  }
  return entrada;
}

function leerDeStorage(storageKey) {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(storageKey) || "[]"));
  } catch {
    return new Set();
  }
}

function guardarEnStorage(storageKey, set) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...set]));
  } catch {
    // Sin almacenamiento disponible: la marca de "visto" dura lo que dure la pestaña.
  }
}

function obtenerSnapshot(storageKey) {
  const entrada = entradaDe(storageKey);
  if (entrada.valor === null) entrada.valor = leerDeStorage(storageKey);
  return entrada.valor;
}

function suscribirse(storageKey, aviso) {
  const entrada = entradaDe(storageKey);
  entrada.oyentes.add(aviso);
  return () => entrada.oyentes.delete(aviso);
}

function marcarVistas(storageKey, claves) {
  const entrada = entradaDe(storageKey);
  const nuevo = new Set(entrada.valor ?? leerDeStorage(storageKey));
  for (const clave of claves) nuevo.add(clave);
  entrada.valor = nuevo;
  guardarEnStorage(storageKey, nuevo);
  entrada.oyentes.forEach((aviso) => aviso());
}

// Devuelve [vistas, marcarComoVistas]. `marcarComoVistas(claves)` agrega esas
// claves al set y lo guarda.
export function useVistas(storageKey) {
  const suscribir = useCallback((aviso) => suscribirse(storageKey, aviso), [storageKey]);
  const obtener = useCallback(() => obtenerSnapshot(storageKey), [storageKey]);
  const obtenerEnServidor = useCallback(() => VACIO, []);

  const vistas = useSyncExternalStore(suscribir, obtener, obtenerEnServidor);
  const marcarComoVistas = useCallback((claves) => marcarVistas(storageKey, claves), [storageKey]);

  return [vistas, marcarComoVistas];
}
