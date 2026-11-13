"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import IconoPanel from "@/components/IconoPanel";
import { useSesion } from "@/components/SesionProvider";
import { cx } from "@/lib/cx";
import { exportarDashboard } from "@/lib/exportarAnalisisPlantel";
import { etiquetaRol, iniciales } from "@/lib/sesion";
import DashboardGeneral from "./DashboardGeneral";
import FuerzaPlantel from "./FuerzaPlantel";
import PliequesPlantel from "./PliequesPlantel";
import styles from "./AnalisisPanel.module.css";
import TorneoPlantel from "./TorneoPlantel";

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

// Dashboard de análisis del panel técnico, copiado de la v1
// (`tecnico/dashboard_analisis.html`): pantalla completa con su propia barra
// lateral (logo, las 4 secciones, "Volver al menú" y quién está conectado; se
// puede achicar a solo íconos) y un encabezado con el escudo y "Exportar".
// Adentro de cada sección: KPIs, gráficos y tablas del plantel.
export default function AnalisisPanel({ jugadores, regresionExtra, posiciones, torneo }) {
  const [pestana, setPestana] = useState("dashboard");
  // En escritorio, tocar el botón achica la barra a solo íconos; en celular
  // arranca achicada y el botón la despliega (ver el CSS).
  const [alternada, setAlternada] = useState(false);
  const { sesion, cerrar } = useSesion();

  return (
    <div className={styles.shell}>
      <aside className={cx(styles.sidebar, alternada && styles.alternada)}>
        <div className={styles.logo}>
          <Image src="/logo_completo.png" alt="Náutico Hacoaj" width={110} height={55} className={styles.logoImagen} priority />
        </div>
        <div className={cx(styles.sbSub, styles.ocultable)}>Panel técnico · Primera D</div>
        <button
          type="button"
          className={styles.alternar}
          onClick={() => setAlternada((a) => !a)}
          title="Colapsar menú"
          aria-label="Mostrar u ocultar los nombres del menú"
        >
          <IconoPanel nombre="menu" tamano={16} trazo={2} />
        </button>
        <div className={styles.seccion}>
          <span className={styles.ocultable}>Métricas</span>
        </div>
        <nav className={styles.nav} aria-label="Secciones del dashboard">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={cx(styles.navBoton, p.id === pestana && styles.navActivo)}
              onClick={() => setPestana(p.id)}
              aria-current={p.id === pestana ? "page" : undefined}
              title={p.titulo}
            >
              <IconoPanel nombre={p.icono} tamano={17} strokeLinejoin="round" />
              <span className={styles.navTexto}>{p.titulo}</span>
            </button>
          ))}
        </nav>
        <div className={styles.pieNav}>
          <Link href="/panel" className={styles.volver} title="Volver al menú">
            <IconoPanel nombre="volver" tamano={16} trazo={1.8} strokeLinejoin="round" />
            <span className={styles.ocultable}>Volver al menú</span>
          </Link>
        </div>
        {sesion && (
          <div className={styles.usuario}>
            <div className={styles.avatar} aria-hidden="true">
              {iniciales(sesion.nombre)}
            </div>
            <div className={styles.datosUsuario}>
              <div className={styles.nombreUsuario}>{sesion.nombre}</div>
              <div className={styles.rolUsuario}>{etiquetaRol(sesion.rol)}</div>
            </div>
            <button type="button" className={styles.salir} onClick={cerrar} title="Cerrar sesión" aria-label="Cerrar sesión">
              <IconoPanel nombre="salir" tamano={15} />
            </button>
          </div>
        )}
      </aside>

      <div className={styles.principal}>
        <header className={styles.cabecera}>
          <div className={styles.marca}>
            <Image src="/escudo.png" alt="CNH" width={35} height={42} className={styles.escudo} />
            <div>
              <div className={styles.lema}>La fuerza y el orgullo de nuestra identidad</div>
              <h1 className={styles.titulo}>{TITULOS[pestana]}</h1>
            </div>
          </div>
          <div className={styles.espaciador} />
          <button type="button" className={styles.botonExportar} onClick={() => exportarDashboard(jugadores)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Exportar
          </button>
        </header>

        <div className={styles.contenido}>
          {pestana === "dashboard" && <DashboardGeneral jugadores={jugadores} posiciones={posiciones} />}
          {pestana === "fuerza" && (
            <FuerzaPlantel jugadores={jugadores} regresionExtra={regresionExtra} posiciones={posiciones} />
          )}
          {pestana === "pliegues" && <PliequesPlantel jugadores={jugadores} posiciones={posiciones} />}
          {pestana === "torneo" && <TorneoPlantel {...torneo} />}
        </div>
      </div>
    </div>
  );
}
