"use client";

import { useEffect, useState } from "react";
import Alternador from "@/components/Alternador";
import Icono from "@/components/Icono";
import InsigniaEstado from "@/components/InsigniaEstado";
import PantallaDatos from "@/components/PantallaDatos";
import { useSesion } from "@/components/SesionProvider";
import SinDatos from "@/components/SinDatos";
import TarjetaJugador from "@/components/TarjetaJugador";
import TituloBloque from "@/components/TituloBloque";
import { obtenerMisPliegues } from "@/lib/data/pliegues";
import { exportarHistorialPliegues } from "@/lib/exportarPliegues";
import { fechaLegible, formatear } from "@/lib/fuerza";
import { colorBarraPliegues, estadoPlieguesTabla } from "@/lib/pliegues";
import GraficoBarras from "./GraficoBarras";
import styles from "./HistorialPliegues.module.css";

const VISTAS = [
  { valor: "tabla", etiqueta: "Tabla" },
  { valor: "graficos", etiqueta: "Gráficos" },
];

// Historial de composición corporal del jugador (diseño y lógica de la v1):
// todas las mediciones de pliegues en tabla o en gráficos, con exportación a
// Excel.
export default function HistorialPliegues() {
  const { sesion } = useSesion();
  // fase: "cargando" | "listo" | "error"
  const [estado, setEstado] = useState({ fase: "cargando" });
  const [vista, setVista] = useState("tabla");
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    obtenerMisPliegues()
      .then((datos) => {
        if (cancelado) return;
        if (datos.status !== "success") {
          setEstado({ fase: "error", mensaje: datos.message });
          return;
        }
        setEstado({ fase: "listo", pliegues: datos.pliegues || [], mensaje: datos.message });
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
      await exportarHistorialPliegues({ pliegues: estado.pliegues, nombre: sesion.nombre });
    } finally {
      setExportando(false);
    }
  }

  const listo = estado.fase === "listo";
  const hayDatos = listo && estado.pliegues.length > 0;
  // El campo de la sumatoria puede venir como "sumatoria 6 pl" o "Σ 6 pl"
  const campo =
    hayDatos && "sumatoria 6 pl" in estado.pliegues[0] ? "sumatoria 6 pl" : "Σ 6 pl";

  return (
    <PantallaDatos volverHref="/pliegues">
      {estado.fase === "cargando" && (
        <div className={styles.cargando}>
          <div className={styles.spinner} />
          <div className={styles.cargandoTexto}>Cargando historial…</div>
        </div>
      )}

      {estado.fase === "error" && <div className={styles.error}>Error: {estado.mensaje}</div>}

      {listo && (
        <>
          <TarjetaJugador
            nombre={sesion.nombre}
            subtitulo="Historial de pliegues"
            posicion={sesion.posicion}
            piernaHabil={sesion.piernaHabil}
          />

          {!hayDatos && (
            <div className={styles.tarjeta}>
              <SinDatos
                mensaje={
                  estado.mensaje || "No se hicieron los datos de pliegues para este usuario"
                }
              />
            </div>
          )}

          {hayDatos && (
            <>
              <Alternador opciones={VISTAS} valor={vista} alCambiar={setVista} />

              {vista === "tabla" ? (
                <>
                  <TituloBloque color="#0a53b5">Registros</TituloBloque>
                  <div className={styles.tarjeta}>
                    <table className={styles.tabla}>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Peso</th>
                          <th>Σ 6pl</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estado.pliegues.map((p, indice) => {
                          const sumatoria = p[campo];
                          const estadoFila = estadoPlieguesTabla(sumatoria);
                          return (
                            <tr key={indice}>
                              <td>{fechaLegible(p["Fecha pliegue"]) || "--"}</td>
                              <td>{formatear(p.Peso, 1)} kg</td>
                              <td>{formatear(sumatoria, 1)} mm</td>
                              <td>
                                <InsigniaEstado tono={estadoFila.tono}>
                                  {estadoFila.texto}
                                </InsigniaEstado>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <button
                      type="button"
                      className={styles.exportar}
                      onClick={exportar}
                      disabled={exportando}
                    >
                      <Icono nombre="descargar" tamano={14} strokeWidth={2} />
                      {exportando ? "Exportando…" : "Exportar a Excel"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <TituloBloque color="#378ADD">Evolución del peso</TituloBloque>
                  <div className={styles.tarjeta}>
                    <GraficoBarras
                      registros={estado.pliegues}
                      campo="Peso"
                      unidad="kg"
                      color="#378ADD"
                    />
                  </div>

                  <TituloBloque color="#EF9F27" arriba={16}>
                    Evolución sumatoria 6 pliegues
                  </TituloBloque>
                  <div className={styles.tarjeta}>
                    <GraficoBarras
                      registros={estado.pliegues}
                      campo={campo}
                      unidad="mm"
                      color={colorBarraPliegues}
                    />
                    <div className={styles.leyenda}>
                      <div className={styles.leyendaItem}>
                        <div className={styles.cuadrito} style={{ background: "#10b981" }} />
                        Bueno (&lt;50)
                      </div>
                      <div className={styles.leyendaItem}>
                        <div className={styles.cuadrito} style={{ background: "#f59e0b" }} />
                        Regular (50-60)
                      </div>
                      <div className={styles.leyendaItem}>
                        <div className={styles.cuadrito} style={{ background: "#ef4444" }} />
                        Alto (&gt;60)
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </PantallaDatos>
  );
}
