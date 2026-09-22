"use client";

import { useCallback, useSyncExternalStore } from "react";
import { ACCESOS_POR_DEFECTO, TODOS_LOS_ACCESOS } from "./menus";

// Recuerda, en localStorage de este navegador, qué accesos directos del
// menú principal están activos y en qué orden (mismo patrón que
// `useVistas.js`: useSyncExternalStore para no parpadear entre el servidor
// y lo guardado). En la v1 esto también era por navegador (localStorage,
// `tecnico_shortcuts_config`), no una preferencia compartida entre técnicos.

const CLAVE = "hacoaj_accesos_tecnico";
let valor = null; // [{id, enabled}] en orden, o null = todavía no se leyó
const oyentes = new Set();

function configPorDefecto() {
  return TODOS_LOS_ACCESOS.map((a) => ({ id: a.id, enabled: ACCESOS_POR_DEFECTO.includes(a.id) }));
}

function leerDeStorage() {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return configPorDefecto();
    const guardado = JSON.parse(crudo).filter((c) => TODOS_LOS_ACCESOS.some((a) => a.id === c.id));
    const conocidos = new Set(guardado.map((c) => c.id));
    const nuevos = TODOS_LOS_ACCESOS.filter((a) => !conocidos.has(a.id)).map((a) => ({ id: a.id, enabled: false }));
    return [...guardado, ...nuevos];
  } catch {
    return configPorDefecto();
  }
}

function guardarEnStorage(config) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(config));
  } catch {
    // Sin almacenamiento disponible: la personalización dura lo que dure la pestaña.
  }
}

function obtenerSnapshot() {
  if (valor === null) valor = leerDeStorage();
  return valor;
}

function obtenerEnServidor() {
  return configPorDefecto();
}

function suscribirse(aviso) {
  oyentes.add(aviso);
  return () => oyentes.delete(aviso);
}

function guardar(config) {
  valor = config;
  guardarEnStorage(config);
  oyentes.forEach((aviso) => aviso());
}

// Devuelve { config, alternar, mover }. `config` es la lista completa (los
// 11 accesos) en el orden guardado, cada uno con `enabled`. `alternar(id)`
// prende/apaga uno; `mover(id, direccion)` lo sube (-1) o baja (+1).
export function useAccesosRapidos() {
  const config = useSyncExternalStore(suscribirse, obtenerSnapshot, obtenerEnServidor);

  const alternar = useCallback((id) => {
    guardar(obtenerSnapshot().map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)));
  }, []);

  const mover = useCallback((id, direccion) => {
    const actual = obtenerSnapshot();
    const indice = actual.findIndex((c) => c.id === id);
    const destino = indice + direccion;
    if (indice < 0 || destino < 0 || destino >= actual.length) return;
    const copia = [...actual];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    guardar(copia);
  }, []);

  return { config, alternar, mover };
}

// A partir de `config` (la lista completa), los accesos activos y en orden,
// con sus datos (título, ícono, href…), listos para dibujar.
export function accesosActivosDe(config) {
  const porId = new Map(TODOS_LOS_ACCESOS.map((a) => [a.id, a]));
  return config.filter((c) => c.enabled).map((c) => porId.get(c.id)).filter(Boolean);
}
