"use client";

import { useState } from "react";
import { colorAvatar, fechaCortaADate } from "@/lib/analisisPlantel";
import { cx } from "@/lib/cx";
import { iniciales } from "@/lib/sesion";
import styles from "./Metricas.module.css";

// Piezas chicas de las pestañas Fuerza y Composición corporal (copiadas de la v1).

// Círculo con las iniciales, de un azul propio para cada persona (avatarHTML).
export function Avatar({ nombre, tamano = 32 }) {
  return (
    <div
      className={styles.avatar}
      style={{ width: tamano, height: tamano, fontSize: tamano * 0.38, background: colorAvatar(nombre) }}
      aria-hidden="true"
    >
      {iniciales(nombre)}
    </div>
  );
}

// Flecha con el cambio contra la medición anterior (trendHTML): verde si mejora.
// `invertir`: bajar es lo bueno.
export function Tendencia({ valor, decimales = 2, invertir = false }) {
  if (valor == null) return <span className={styles.neutro}>—</span>;
  if (valor === 0) return <span className={styles.neutro}>0</span>;
  const bueno = invertir ? valor < 0 : valor > 0;
  return (
    <span className={bueno ? styles.sube : styles.baja}>
      {valor > 0 ? "↑" : "↓"} {Math.abs(valor).toFixed(decimales)}
    </span>
  );
}

// "+0.12" verde / "-0.05" naranja, junto al título de un KPI (diffHTML).
export function Diferencia({ valor, decimales = 2, sufijo = "" }) {
  if (valor == null) return null;
  return (
    <span className={valor > 0 ? styles.sube : valor < 0 ? styles.baja : undefined} style={{ fontSize: 11, fontWeight: 500 }}>
      {valor > 0 ? "+" : ""}
      {valor.toFixed(decimales)}
      {sufijo}
    </span>
  );
}

// Botoncito de las tarjetas (Sent./Pecho, F.Rel/RM...).
export function BotonChico({ activo, onClick, children }) {
  return (
    <button type="button" className={cx(styles.fbtn, activo && styles.fbtnActivo)} onClick={onClick} aria-pressed={activo}>
      {children}
    </button>
  );
}

// Orden de la tabla del plantel: clic en un título ordena por esa columna; otro
// clic invierte. Las columnas de fecha ("dd/mm/aaaa") se ordenan como fechas y
// los vacíos van al principio en orden ascendente (como en la v1).
export function useOrden(columnaInicial = "nombre", columnasFecha = []) {
  const [orden, setOrden] = useState({ columna: columnaInicial, sentido: 1 });

  const ordenar = (filas) => {
    const { columna, sentido } = orden;
    const valor = (fila) => {
      let v = fila[columna];
      if (columnasFecha.includes(columna)) v = fechaCortaADate(v)?.getTime() ?? null;
      return v ?? -Infinity;
    };
    return [...filas].sort((a, b) => {
      const va = valor(a);
      const vb = valor(b);
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb, "es") * sentido;
      if (typeof va === "string") return sentido;
      if (typeof vb === "string") return -sentido;
      return (va - vb) * sentido;
    });
  };

  const alTocar = (columna) =>
    setOrden((o) => (o.columna === columna ? { columna, sentido: -o.sentido } : { columna, sentido: 1 }));

  const flecha = (columna) => (orden.columna === columna ? (orden.sentido > 0 ? " ↑" : " ↓") : "");
  const sentidoDe = (columna) => (orden.columna === columna ? (orden.sentido > 0 ? "ascending" : "descending") : undefined);

  return { ordenar, alTocar, flecha, sentidoDe };
}

// Título de columna que ordena la tabla al tocarlo (con la flechita ↑/↓).
export function Th({ orden, columna, children, className, style }) {
  return (
    <th className={className} style={style} onClick={() => orden.alTocar(columna)} aria-sort={orden.sentidoDe(columna)}>
      {children}
      {orden.flecha(columna)}
    </th>
  );
}
