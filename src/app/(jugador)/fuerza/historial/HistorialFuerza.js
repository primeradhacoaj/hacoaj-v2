"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Icono from "@/components/Icono";
import PantallaDatos from "@/components/PantallaDatos";
import { useSesion } from "@/components/SesionProvider";
import TarjetaJugador from "@/components/TarjetaJugador";
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

    obtenerMiHistorialFuerza(sesion.usuario)
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
        nombre={sesion.nombre}
        subtitulo="Historial de fuerza"
        posicion={sesion.posicion}
        piernaHabil={sesion.piernaHabil}
      />

      <div className={styles.alternador}>
        <button
          type="button"
          className={cx(styles.boton, vista === "tabla" && styles.activo)}
          onClick={() => setVista("tabla")}
        >
          📋 Tabla
        </button>
        <button
          type="button"
          className={cx(styles.boton, vista === "graficos" && styles.activo)}
          onClick={() => setVista("graficos")}
        >
          📊 Gráficos
        </button>
      </div>

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
              <Seccion punto="pecho">Press de Pecho</Seccion>
              <TablaHistorial registros={estado.pecho} campos={TIPOS.pecho.campos} />

              <Seccion punto="sentadilla">Sentadilla</Seccion>
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

function Seccion({ punto, children }) {
  return (
    <div className={styles.seccion}>
      <span className={cx(styles.punto, styles[punto])} />
      <span className={styles.seccionTitulo}>{children}</span>
    </div>
  );
}

// Vista de gráficos: elegir ejercicio y ver tres gráficos de evolución.
function Graficos({ tipo, cambiarTipo, registros, alSeleccionar }) {
  const config = TIPOS[tipo];
  const punto = tipo === "sentadilla" ? "sentadilla" : "pecho";

  return (
    <>
      <div className={styles.alternador}>
        <button
          type="button"
          className={cx(styles.boton, tipo === "sentadilla" && styles.activo)}
          onClick={() => cambiarTipo("sentadilla")}
        >
          🏋 Sentadilla
        </button>
        <button
          type="button"
          className={cx(styles.boton, tipo === "pecho" && styles.activo)}
          onClick={() => cambiarTipo("pecho")}
        >
          💪 Pecho
        </button>
      </div>

      <Seccion punto={punto}>F. Relativa — {config.etiqueta}</Seccion>
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

      <Seccion punto={punto}>Carga + VMP — {config.etiqueta}</Seccion>
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

      <Seccion punto={punto}>RM Estimado — {config.etiqueta}</Seccion>
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
