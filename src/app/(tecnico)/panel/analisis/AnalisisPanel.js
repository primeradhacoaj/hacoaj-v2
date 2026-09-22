"use client";

import Image from "next/image";
import { useState } from "react";
import Icono from "@/components/Icono";
import IconoPanel from "@/components/IconoPanel";
import { cx } from "@/lib/cx";
import { exportarResumenAnalisis } from "@/lib/exportarAnalisisPlantel";
import DashboardGeneral from "./DashboardGeneral";
import FuerzaPlantel from "./FuerzaPlantel";
import PliequesPlantel from "./PliequesPlantel";
import styles from "./AnalisisPanel.module.css";

const PESTANAS = [
  { id: "dashboard", titulo: "Dashboard", icono: "dashboard" },
  { id: "fuerza", titulo: "Fuerza", icono: "fuerza" },
  { id: "pliegues", titulo: "Composición corporal", icono: "ondas" },
  { id: "torneo", titulo: "Promocional 2026", icono: "torneo" },
];

const TITULOS = {
  dashboard: "Dashboard general",
  fuerza: "Fuerza del plantel",
  pliegues: "Pliegues y composición",
  torneo: "Promocional 2026",
};

// Dashboard de análisis del panel técnico, copiado de la v1: barra lateral
// con 4 secciones y, adentro de cada una, KPIs agregados del plantel (no una
// tabla con cada registro — esa es la pantalla de "Fuerza"/"Pliegues" del
// menú técnico, que muestra el historial completo).
//
// Por ahora están armadas "Dashboard", "Fuerza" y "Composición corporal"; solo
// falta "Promocional 2026".
export default function AnalisisPanel({ jugadores, posiciones }) {
  const [pestana, setPestana] = useState("dashboard");

  return (
    <div className={styles.contenedor}>
      <aside className={styles.sidebar}>
        <nav className={styles.nav} aria-label="Secciones del dashboard">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={cx(styles.navBoton, p.id === pestana && styles.navActivo)}
              onClick={() => setPestana(p.id)}
            >
              <IconoPanel nombre={p.icono} tamano={17} />
              {p.titulo}
            </button>
          ))}
        </nav>
      </aside>

      <div className={styles.principal}>
        <header className={styles.cabecera}>
          <Image src="/escudo.png" alt="CNH" width={35} height={42} className={styles.escudo} />
          <div>
            <div className={styles.lema}>La fuerza y el orgullo de nuestra identidad</div>
            <h1 className={styles.titulo}>{TITULOS[pestana]}</h1>
          </div>
          <div className={styles.espaciador} />
          {pestana === "dashboard" && (
            <button
              type="button"
              className={styles.botonExportar}
              onClick={() => exportarResumenAnalisis(jugadores)}
            >
              <Icono nombre="descargar" tamano={15} strokeWidth={1.7} />
              Exportar
            </button>
          )}
        </header>

        <div className={styles.contenido}>
          {pestana === "dashboard" && <DashboardGeneral jugadores={jugadores} posiciones={posiciones} />}
          {pestana === "fuerza" && <FuerzaPlantel jugadores={jugadores} posiciones={posiciones} />}
          {pestana === "pliegues" && <PliequesPlantel jugadores={jugadores} posiciones={posiciones} />}
          {pestana === "torneo" && (
            <div className={styles.proximamente}>
              <IconoPanel nombre={PESTANAS.find((p) => p.id === pestana).icono} tamano={28} />
              <p>Esta sección del dashboard se está armando.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
