"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Alternador from "@/components/Alternador";
import Icono from "@/components/Icono";
import PantallaDatos from "@/components/PantallaDatos";
import { useSesion } from "@/components/SesionProvider";
import TarjetaJugador from "@/components/TarjetaJugador";
import TituloBloque from "@/components/TituloBloque";
import { obtenerMiHistorialFuerza } from "@/lib/data/fuerza";
import { exportarHistorialFuerza } from "@/lib/exportarFuerza";
import {
  TIPOS,
  colorFuerzaRelativa,
  zonasFuerzaRelativa,
} from "@/lib/historialFuerza";
import { cx } from "@/lib/cx";
import { useAviso } from "@/lib/useAviso";
import GraficoCombinado from "./GraficoCombinado";
import GraficoLinea from "./GraficoLinea";
import TablaHistorial from "./TablaHistorial";
import styles from "./HistorialFuerza.module.css";

const VISTAS = [
  { valor: "tabla", etiqueta: "📋 Tabla" },
  { valor: "graficos", etiqueta: "📊 Gráficos" },
];

const TIPOS_ALTERNADOR = [
  { valor: "sentadilla", etiqueta: "🏋 Sentadilla" },
  { valor: "pecho", etiqueta: "💪 Pecho" },
];

// Historial de fuerza del jugador (diseño y lógica de la v1): todas las
// mediciones en tabla o en gráficos, con exportación a Excel.
export default function HistorialFuerza() {
  const { sesion } = useSesion();
  // fase: "cargando" | "listo" | "error"
  const [estado, setEstado] = useState({ fase: "cargando" });
  const [vista, setVista] = useState("tabla"); // "tabla" | "graficos"
  const [tipo, setTipo] = useState("sentadilla"); // "sentadilla" | "pecho"
  const [exportando, setExportando] = useState(false);
  const detalle = useAviso(2500); // globito con el detalle de un punto del gráfico

  useEffect(() => {
    let cancelado = false;

    obtenerMiHistorialFuerza()
      .then((datos) => {
        if (cancelado) return;
        if (datos.status !== "success") {
          setEstado({ fase: "error", mensaje: datos.message });
          return;
        }
        setEstado({
          fase: "listo",
          pecho: datos.pecho || [],
          sentadilla: datos.sentadilla || [],
        });
      })
      .catch((error) => {
        if (!cancelado) setEstado({ fase: "error", mensaje: error.message });
      });

    return () => {
      cancelado = true;
    };
  }, [sesion.usuario]);

  async function exportar() {
    setExportando(true);
    try {
      await exportarHistorialFuerza({
        pecho: estado.pecho,
        sentadilla: estado.sentadilla,
        nombre: sesion.nombre,
      });
    } finally {
      setExportando(false);
    }
  }

  // El detalle de un punto se muestra una línea por renglón
  const mostrarDetalle = (lineas) => detalle.mostrar(lineas.join("\n"));

  return (
    <PantallaDatos volverHref="/fuerza">
      <TarjetaJugador
        nombre={sesion.nombre} foto={sesion.foto}
        subtitulo="Historial de fuerza"
        posicion={sesion.posicion}
        piernaHabil={sesion.piernaHabil}
      />

      <Alternador opciones={VISTAS} valor={vista} alCambiar={setVista} />

      {estado.fase === "cargando" && (
        <div className={styles.cargando}>
          <div>⏳</div>
          <div className={styles.cargandoTexto}>Cargando historial…</div>
        </div>
      )}

      {estado.fase === "error" && (
        <div className={styles.error}>Error: {estado.mensaje}</div>
      )}

      {estado.fase === "listo" && (
        <>
          {vista === "tabla" ? (
            <>
              <TituloBloque color={TIPOS.pecho.colorRm} arriba={24}>
                Press de Pecho
              </TituloBloque>
              <TablaHistorial registros={estado.pecho} campos={TIPOS.pecho.campos} />

              <TituloBloque color={TIPOS.sentadilla.colorRm} arriba={24}>
                Sentadilla
              </TituloBloque>
              <TablaHistorial
                registros={estado.sentadilla}
                campos={TIPOS.sentadilla.campos}
              />
            </>
          ) : (
            <Graficos
              tipo={tipo}
              cambiarTipo={setTipo}
              registros={estado[tipo]}
              alSeleccionar={mostrarDetalle}
            />
          )}

          <div className={styles.exportar}>
            <button
              type="button"
              className={styles.botonExportar}
              onClick={exportar}
              disabled={exportando}
            >
              <Icono nombre="descargar" tamano={14} strokeWidth={2} />
              {exportando ? "Exportando…" : "Exportar historial"}
            </button>
          </div>
        </>
      )}

      <div className={styles.volverContenedor}>
        <Link href="/fuerza" className={styles.volver}>
          ← Volver a fuerza
        </Link>
      </div>

      <div
        className={cx(styles.globito, detalle.visible && styles.globitoVisible)}
        role="status"
        aria-live="polite"
      >
        {detalle.mensaje}
      </div>
    </PantallaDatos>
  );
}

// Vista de gráficos: elegir ejercicio y ver tres gráficos de evolución.
function Graficos({ tipo, cambiarTipo, registros, alSeleccionar }) {
  const config = TIPOS[tipo];

  return (
    <>
      <Alternador opciones={TIPOS_ALTERNADOR} valor={tipo} alCambiar={cambiarTipo} />

      <TituloBloque color={config.colorRm} arriba={24}>
        F. Relativa — {config.etiqueta}
      </TituloBloque>
      <div className={cx(styles.tarjeta, styles.tarjetaAngosta)}>
        <div className={styles.leyenda}>
          <span style={{ color: "#10b981" }}>● Objetivo cumplido</span>
          <span style={{ color: "#f59e0b" }}>● Cerca del objetivo</span>
          <span style={{ color: "#ef4444" }}>● Aún puedes mejorar</span>
        </div>
        <GraficoLinea
          registros={registros}
          campoFecha={config.campos.fecha}
          campoValor={config.campos.relativa}
          decimales={2}
          colorLinea="#00296b"
          colorPunto={(valor) => colorFuerzaRelativa(valor, config.objetivo)}
          zonas={zonasFuerzaRelativa(config.objetivo)}
          extras={[
            { campo: config.campos.rm, etiqueta: "RM Est.", decimales: 1, unidad: " kg" },
            { campo: "PC", etiqueta: "Peso", decimales: 1, unidad: " kg" },
          ]}
          alSeleccionar={alSeleccionar}
        />
      </div>

      <TituloBloque color={config.colorRm} arriba={24}>
        Carga + VMP — {config.etiqueta}
      </TituloBloque>
      <div className={cx(styles.tarjeta, styles.tarjetaAncha)}>
        <div className={styles.leyendaCombo}>
          <span>
            <span className={styles.muestraBarra} />
            Carga (kg)
          </span>
          <span>
            <span className={styles.muestraLinea} />
            VMP (m/s)
          </span>
        </div>
        <GraficoCombinado
          registros={registros}
          campoFecha={config.campos.fecha}
          campoCarga={config.campos.carga}
          campoVmp={config.campos.vmp}
          alSeleccionar={alSeleccionar}
        />
      </div>

      <TituloBloque color={config.colorRm} arriba={24}>
        RM Estimado — {config.etiqueta}
      </TituloBloque>
      <div className={cx(styles.tarjeta, styles.tarjetaAngosta)}>
        <GraficoLinea
          registros={registros}
          campoFecha={config.campos.fecha}
          campoValor={config.campos.rm}
          decimales={1}
          unidad="kg"
          colorLinea={config.colorRm}
          extras={[
            { campo: config.campos.relativa, etiqueta: "F. Rel.", decimales: 2 },
            { campo: config.campos.carga, etiqueta: "Carga", decimales: 1, unidad: " kg" },
          ]}
          alSeleccionar={alSeleccionar}
        />
      </div>
    </>
  );
}
