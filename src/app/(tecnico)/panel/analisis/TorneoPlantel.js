"use client";

import { useMemo, useState } from "react";
import Icono from "@/components/Icono";
import { exportarTorneoPlantel } from "@/lib/exportarAnalisisPlantel";
import BarChart from "./BarChart";
import comunes from "./AnalisisComun.module.css";
import propio from "./TorneoPlantel.module.css";

const styles = { ...comunes, ...propio };

const numero = (v, decimales = 2) => (v != null ? v.toFixed(decimales) : "—");
const inicialesDe = (nombre) => nombre.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("").toUpperCase();

// Agrupa los goles por tercio del partido (1-30', 31-60', 61-90+).
function golesPorTercio(minutos, divisiones = 3) {
  const segmento = 90 / divisiones;
  const cuenta = new Array(divisiones).fill(0);
  for (const minuto of minutos) {
    const indice = Math.min(Math.floor((minuto - 1) / segmento), divisiones - 1);
    if (indice >= 0) cuenta[indice]++;
  }
  return cuenta;
}

const ETIQUETAS_TERCIO = ["1-30'", "31-60'", "61-90+'"];

// Pestaña "Promocional 2026" del Dashboard de análisis: cómo le va a Hacoaj
// en el torneo. Copiado de la v1, con el mismo criterio que las otras
// pestañas: KPIs y gráficos agregados, no la tabla partido por partido (esa
// ya existe en Torneo → Partidos). Se dejaron afuera la combinación ideal de
// gol, las parejas de cambio más frecuentes y el "equipo ideal" — piden datos
// que esta app todavía no calcula (asistencias, quién sale por quién en cada
// cambio agregado) y agregan poco sobre lo que ya muestran los gráficos de
// jugadores y la tabla completa.
export default function TorneoPlantel({ equipo, stats, jugadores, posiciones, goles }) {
  const [filtroPosicion, setFiltroPosicion] = useState("");

  const filtrados = useMemo(
    () => (filtroPosicion ? jugadores.filter((j) => j.posicion === filtroPosicion) : jugadores),
    [jugadores, filtroPosicion],
  );

  const barrasDe = (campo, cantidad = 12) =>
    [...filtrados]
      .filter((j) => j[campo] > 0)
      .sort((a, b) => b[campo] - a[campo])
      .slice(0, cantidad)
      .map((j) => ({ etiqueta: j.nombre, valor: j[campo] }));

  const tercioFavor = golesPorTercio(goles.favor);
  const tercioContra = golesPorTercio(goles.contra);
  const maximoTercio = Math.max(...tercioFavor, ...tercioContra, 1);

  return (
    <>
      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Puntos / partido</div>
          <div className={styles.valorKpi}>{stats.pj > 0 ? numero(stats.pts / stats.pj) : "—"}</div>
          <div className={styles.pieKpi}>Temporada 2026 · {stats.pj} partidos</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Goles a favor / partido</div>
          <div className={styles.valorKpi}>{stats.pj > 0 ? numero(stats.gf / stats.pj) : "—"}</div>
          <div className={styles.pieKpi}>{stats.gf} goles en total</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Goles en contra / partido</div>
          <div className={styles.valorKpi}>{stats.pj > 0 ? numero(stats.gc / stats.pj) : "—"}</div>
          <div className={styles.pieKpi}>{stats.gc} goles en total</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Puntos</div>
          <div className={styles.valorKpi}>
            {stats.pts}
            <span className={styles.unidadKpi}>/{stats.pj * 3}</span>
          </div>
          <div className={styles.pieKpi}>{stats.pg}G · {stats.pe}E · {stats.pp}P</div>
        </div>
      </div>

      <div className={styles.filtros}>
        <div className={styles.campo}>
          <span className={styles.etiquetaCampo}>Posición</span>
          <select value={filtroPosicion} onChange={(e) => setFiltroPosicion(e.target.value)} className={styles.select}>
            <option value="">Todas</option>
            {posiciones.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className={styles.botonExportar} onClick={() => exportarTorneoPlantel(equipo, stats, filtrados)}>
          <Icono nombre="descargar" tamano={14} strokeWidth={2} />
          Exportar tabla
        </button>
      </div>

      <div className={styles.tarjeta}>
        <div className={styles.cabeceraTarjeta}>
          <div>
            <div className={styles.tituloTarjeta}>Minutos jugados</div>
            <div className={styles.subtituloTarjeta}>Histórico del jugador en {equipo} · todas las temporadas</div>
          </div>
        </div>
        <BarChart datos={barrasDe("minutos")} color="#00296b" />
      </div>

      <div className={styles.filaDosColumnas}>
        <div className={styles.tarjeta}>
          <div className={styles.tituloTarjeta}>Goles</div>
          <div className={styles.subtituloTarjeta}>Histórico del jugador</div>
          <BarChart datos={barrasDe("goles")} color="#0e8a4f" alto={200} />
        </div>
        <div className={styles.tarjeta}>
          <div className={styles.tituloTarjeta}>Tarjetas amarillas</div>
          <div className={styles.subtituloTarjeta}>Histórico del jugador</div>
          <BarChart datos={barrasDe("amarillas")} color="#e5a100" alto={200} />
        </div>
      </div>

      <div className={styles.tarjeta}>
        <div className={styles.cabeceraTarjeta}>
          <div>
            <div className={styles.tituloTarjeta}>Distribución de goles</div>
            <div className={styles.subtituloTarjeta}>Cuándo llegan los goles del partido · temporada 2026</div>
          </div>
        </div>
        <TercioChart favor={tercioFavor} contra={tercioContra} maximo={maximoTercio} />
        <div className={styles.leyendaLinea}>
          <span>
            <span className={styles.puntoLeyenda} style={{ background: "#0e8a4f" }} /> A favor
          </span>
          <span>
            <span className={styles.puntoLeyenda} style={{ background: "#c2410c" }} /> En contra
          </span>
        </div>
      </div>

      <TablaJugadores equipo={equipo} jugadores={filtrados} />
    </>
  );
}

function TercioChart({ favor, contra, maximo }) {
  const ancho = 500;
  const alto = 240;
  const anchoGrupo = 80;
  const anchoBarra = (anchoGrupo - 4) / 2;
  const altoGrafico = alto - 50;
  const inicioX = 40;
  const marcas = Array.from({ length: 5 }, (_, i) => maximo - (maximo / 4) * i);

  return (
    <svg width="100%" viewBox={`0 0 ${ancho} ${alto}`} style={{ display: "block" }}>
      {marcas.map((valor, i) => {
        const y = 10 + (altoGrafico / 4) * i;
        return (
          <g key={i}>
            <line x1={inicioX} y1={y} x2={inicioX + ETIQUETAS_TERCIO.length * (anchoGrupo + 10)} y2={y} stroke="#eceef2" />
            <text x={inicioX - 4} y={y + 3} fill="rgba(0,0,0,.45)" fontSize="10" textAnchor="end">
              {Math.round(valor)}
            </text>
          </g>
        );
      })}
      {ETIQUETAS_TERCIO.map((etiqueta, i) => {
        const x = inicioX + i * (anchoGrupo + 10) + 5;
        const altoFavor = (favor[i] / maximo) * altoGrafico;
        const altoContra = (contra[i] / maximo) * altoGrafico;
        return (
          <g key={etiqueta}>
            <rect x={x} y={10 + altoGrafico - altoFavor} width={anchoBarra} height={altoFavor} fill="#0e8a4f" rx="3" />
            <rect x={x + anchoBarra + 4} y={10 + altoGrafico - altoContra} width={anchoBarra} height={altoContra} fill="#c2410c" rx="3" />
            {favor[i] > 0 && (
              <text x={x + anchoBarra / 2} y={10 + altoGrafico - altoFavor - 4} fill="#0e8a4f" fontSize="11" textAnchor="middle" fontWeight="600">
                {favor[i]}
              </text>
            )}
            {contra[i] > 0 && (
              <text x={x + anchoBarra + 4 + anchoBarra / 2} y={10 + altoGrafico - altoContra - 4} fill="#c2410c" fontSize="11" textAnchor="middle" fontWeight="600">
                {contra[i]}
              </text>
            )}
            <text x={x + anchoGrupo / 2} y={10 + altoGrafico + 16} fill="rgba(0,0,0,.6)" fontSize="11" textAnchor="middle" fontWeight="500">
              {etiqueta}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TablaJugadores({ equipo, jugadores }) {
  const ordenados = [...jugadores].sort((a, b) => b.minutos - a.minutos);
  return (
    <div className={styles.tablaGrande}>
      <div className={styles.cabeceraTablaGrande}>
        <div className={styles.tituloTarjeta}>Plantel en {equipo}</div>
        <div className={styles.subtituloTarjeta}>{jugadores.length} jugadores · histórico, todas las temporadas</div>
      </div>
      <div className={styles.scrollTabla}>
        <table>
          <thead>
            <tr>
              <th className={styles.izquierda}>Jugador</th>
              <th className={styles.izquierda}>Pos</th>
              <th>PJ</th>
              <th>Titular</th>
              <th>Minutos</th>
              <th>Goles</th>
              <th>Amarillas</th>
              <th>Rojas</th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((j) => (
              <tr key={j.nombre} className={styles.filaTablaSinClick}>
                <td className={styles.izquierda}>
                  <span className={styles.avatarChico}>{inicialesDe(j.nombre)}</span>
                  {j.nombre}
                </td>
                <td className={styles.izquierda}>{j.posicion || "—"}</td>
                <td>{j.partidos}</td>
                <td>{j.titular}</td>
                <td>{j.minutos}</td>
                <td className={styles.negrita}>{j.goles}</td>
                <td>{j.amarillas}</td>
                <td>{j.rojas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
