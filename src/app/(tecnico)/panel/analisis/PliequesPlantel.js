"use client";

import { useMemo, useState } from "react";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import {
  delAnioActual,
  evolucionAnioActual,
  promedioAnioActual,
  promedioPorPosicion,
  rankingAnioActualAscendente,
  resumenPlieguesPorJugador,
} from "@/lib/analisisPlantel";
import { exportarPlieguesPlantel } from "@/lib/exportarAnalisisPlantel";
import comunes from "./AnalisisComun.module.css";
import LineChart from "./LineChart";
import propio from "./PliequesPlantel.module.css";

const styles = { ...comunes, ...propio };

const COLOR = "#e11d48";
const COLOR_PESO = "#6366f1";
const numero = (v, decimales = 1) => (v != null ? v.toFixed(decimales) : "—");
const inicialesDe = (nombre) => nombre.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("").toUpperCase();
const nombreCorto = (nombre) => `${nombre.split(" ")[0]} ${(nombre.split(" ")[1] || "")[0] ?? ""}.`;
const ANIO_ACTUAL = new Date().getFullYear();

// Pestaña "Composición corporal" del Dashboard de análisis: KPIs (con los
// datos de este año, como en la v1), filtros, evolución del peso, ranking de
// Σ6 pliegues, comparación por posición, ficha de un jugador y la tabla del
// plantel. Copiado de la v1, sin los dos scatter plots (Σ6 vs peso y altura
// vs peso, con zoom/pan y regresión) por lo complejos que son de reproducir
// fiel — igual que en la pestaña Fuerza.
export default function PliequesPlantel({ jugadores, posiciones }) {
  const [filtroPosicion, setFiltroPosicion] = useState("");
  const [filtroPierna, setFiltroPierna] = useState("");
  const [jugadorElegido, setJugadorElegido] = useState(null);

  const filtrados = useMemo(
    () =>
      jugadores.filter((j) => {
        if (filtroPosicion && j.posicion !== filtroPosicion) return false;
        if (filtroPierna && j.piernaHabil !== filtroPierna) return false;
        return true;
      }),
    [jugadores, filtroPosicion, filtroPierna],
  );

  const pliegues = promedioAnioActual(filtrados, "pliegues", "sumatoria6");
  const pesoAnio = promedioAnioActual(filtrados, "pesos", "peso");
  const alturas = filtrados.map((j) => j.altura).filter(Boolean);
  const promedioAltura = alturas.length ? alturas.reduce((s, v) => s + v, 0) / alturas.length : null;

  const valoresPliegues = filtrados
    .map((j) => delAnioActual(j.pliegues))
    .map((arr) => (arr.length ? arr[arr.length - 1].sumatoria6 : null))
    .filter((v) => v != null && v > 0);
  const minimoPliegues = valoresPliegues.length ? Math.min(...valoresPliegues) : null;
  const maximoPliegues = valoresPliegues.length ? Math.max(...valoresPliegues) : null;

  const puntosEvolucion = evolucionAnioActual(filtrados, "pesos", "peso");
  const ranking = rankingAnioActualAscendente(filtrados, "pliegues", "sumatoria6");
  const maximoRanking = ranking.length ? Math.max(...ranking.map((r) => r.valor)) : 1;
  const porPosicion = promedioPorPosicion(filtrados, "pliegues", "sumatoria6").sort((a, b) => b.promedio - a.promedio);
  const maximoPorPosicion = porPosicion.length ? Math.max(...porPosicion.map((p) => p.maximo)) : 1;

  const resumen = resumenPlieguesPorJugador(filtrados);
  const jugadorDetalle = jugadorElegido ? jugadores.find((j) => j.nombre === jugadorElegido) : null;

  return (
    <>
      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Σ 6 Pliegues (prom)</div>
          <div className={styles.valorKpi}>
            {numero(pliegues.promedio)}
            <span className={styles.unidadKpi}>mm</span>
          </div>
          {minimoPliegues != null && (
            <div className={styles.notaKpi}>
              Rango: {numero(minimoPliegues)} – {numero(maximoPliegues)} mm
            </div>
          )}
          <div className={styles.pieKpi}>Último registro de {ANIO_ACTUAL} · {pliegues.cantidad}/{filtrados.length} medidos</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Peso promedio</div>
          <div className={styles.valorKpi}>
            {numero(pesoAnio.promedio)}
            <span className={styles.unidadKpi}>kg</span>
          </div>
          <div className={styles.pieKpi}>Último pesaje de {ANIO_ACTUAL} · {pesoAnio.cantidad}/{filtrados.length} pesados</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Altura promedio</div>
          <div className={styles.valorKpi}>
            {numero(promedioAltura)}
            <span className={styles.unidadKpi}>cm</span>
          </div>
        </div>
      </div>

      <div className={styles.filtros}>
        <Campo etiqueta="Posición">
          <select value={filtroPosicion} onChange={(e) => setFiltroPosicion(e.target.value)} className={styles.select}>
            <option value="">Todas</option>
            {posiciones.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Pierna hábil">
          <select value={filtroPierna} onChange={(e) => setFiltroPierna(e.target.value)} className={styles.select}>
            <option value="">Todas</option>
            <option value="D">Derecha</option>
            <option value="I">Izquierda</option>
            <option value="Ambidiestro">Ambidiestro</option>
          </select>
        </Campo>
        <button type="button" className={styles.botonExportar} onClick={() => exportarPlieguesPlantel(resumen)}>
          <Icono nombre="descargar" tamano={14} strokeWidth={2} />
          Exportar tabla
        </button>
      </div>

      {jugadorDetalle && <DetalleJugador jugador={jugadorDetalle} onCerrar={() => setJugadorElegido(null)} />}

      <div className={styles.tarjeta}>
        <div className={styles.cabeceraTarjeta}>
          <div>
            <div className={styles.tituloTarjeta}>Evolución del peso</div>
            <div className={styles.subtituloTarjeta}>Promedio del plantel por fecha · {ANIO_ACTUAL}</div>
          </div>
        </div>
        <LineChart
          series={[{ nombre: "Peso", color: COLOR_PESO, puntos: puntosEvolucion }]}
          decimales={1}
        />
      </div>

      <div className={styles.tarjeta}>
        <div className={styles.cabeceraTarjeta}>
          <div>
            <div className={styles.tituloTarjeta}>Ranking Σ6 Pliegues</div>
            <div className={styles.subtituloTarjeta}>Todos los jugadores · menos es mejor · click para ver detalle</div>
          </div>
        </div>
        {ranking.length === 0 ? (
          <p className={styles.sinDatos}>Sin datos</p>
        ) : (
          <div className={styles.listaRanking}>
            {ranking.map((j, indice) => (
              <button
                key={j.nombre}
                type="button"
                className={styles.filaRanking}
                onClick={() => setJugadorElegido(j.nombre)}
                title={`Σ6: ${numero(j.valor)} mm`}
              >
                <span className={styles.puestoRanking}>{indice + 1}</span>
                <span className={styles.nombreRanking}>{nombreCorto(j.nombre)}</span>
                <span className={styles.posicionRanking}>{j.posicion}</span>
                <div className={styles.barraFondo}>
                  <div className={styles.barraRelleno} style={{ width: `${(j.valor / maximoRanking) * 100}%`, background: COLOR }} />
                </div>
                <span className={styles.valorRanking}>{numero(j.valor)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.tarjeta}>
        <div className={styles.cabeceraTarjeta}>
          <div>
            <div className={styles.tituloTarjeta}>Σ6 Pliegues por posición</div>
            <div className={styles.subtituloTarjeta}>Promedio de {ANIO_ACTUAL}</div>
          </div>
        </div>
        {porPosicion.length === 0 ? (
          <p className={styles.sinDatos}>Sin datos</p>
        ) : (
          porPosicion.map((p) => (
            <div key={p.posicion} className={styles.filaPosicion} title={`${p.posicion} · Rango: ${numero(p.minimo)} – ${numero(p.maximo)} mm · ${p.cantidad} jugadores`}>
              <span className={styles.nombrePosicion}>{p.posicion}</span>
              <div className={styles.barraFondo}>
                <div className={styles.barraPosicion} style={{ width: `${(p.promedio / maximoPorPosicion) * 100}%` }} />
              </div>
              <span className={styles.valorRanking}>{numero(p.promedio)} mm</span>
              <span className={styles.cantidadPosicion}>n={p.cantidad}</span>
            </div>
          ))
        )}
      </div>

      <TablaPlantel resumen={resumen} onElegir={setJugadorElegido} />
    </>
  );
}

function Campo({ etiqueta, children }) {
  return (
    <div className={styles.campo}>
      <span className={styles.etiquetaCampo}>{etiqueta}</span>
      {children}
    </div>
  );
}

function Diferencia({ valor, peorSiSube = true }) {
  const signo = valor > 0 ? "+" : "";
  const sube = valor > 0;
  const clase = peorSiSube ? (sube ? styles.tendenciaBaja : styles.tendenciaSube) : sube ? styles.tendenciaSube : styles.tendenciaBaja;
  return (
    <span className={valor !== 0 ? clase : undefined}>
      {signo}
      {valor.toFixed(1)}
    </span>
  );
}

function DetalleJugador({ jugador, onCerrar }) {
  const pesosAnio = delAnioActual(jugador.pesos);
  const pliegues = jugador.pliegues || [];
  const invertidos = [...pliegues].reverse();

  const actual = pesosAnio.length ? pesosAnio[pesosAnio.length - 1].peso : null;
  const anterior = pesosAnio.length >= 2 ? pesosAnio[pesosAnio.length - 2].peso : null;
  const delta = actual != null && anterior != null ? actual - anterior : null;
  const pesoIdeal = pliegues.length ? pliegues[pliegues.length - 1].pesoIdeal : null;
  const diferenciaIdeal = actual != null && pesoIdeal != null ? actual - pesoIdeal : null;

  return (
    <div className={styles.tarjetaDetalle} style={{ borderLeftColor: COLOR }}>
      <button type="button" className={styles.cerrarDetalle} onClick={onCerrar} aria-label="Cerrar">
        <Icono nombre="cerrar" tamano={16} strokeWidth={2} />
      </button>
      <div className={styles.cabeceraDetalle}>
        <span className={styles.avatarDetalle}>{inicialesDe(jugador.nombre)}</span>
        <div>
          <div className={styles.nombreDetalle}>{jugador.nombre}</div>
          <div className={styles.metaDetalle}>
            {[jugador.posicion, jugador.altura != null && `${jugador.altura} cm`, jugador.edad != null && `${jugador.edad} años`]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div className={styles.cifrasDetalle}>
          <div>
            <div className={styles.rotuloCifra}>Peso actual</div>
            <div className={styles.valorCifra}>
              {numero(actual)} kg{delta != null && <Diferencia valor={delta} />}
            </div>
          </div>
          <div>
            <div className={styles.rotuloCifra}>Vs. peso ideal</div>
            <div className={styles.valorCifra}>{diferenciaIdeal != null ? <Diferencia valor={diferenciaIdeal} /> : "—"}</div>
          </div>
        </div>
      </div>

      <div className={styles.tituloTarjeta} style={{ marginBottom: 6 }}>
        Evolución del peso · {ANIO_ACTUAL}
      </div>
      <LineChart
        series={[{ nombre: "Peso", color: COLOR_PESO, puntos: pesosAnio.map((r) => ({ fecha: r.fecha, valor: r.peso })) }]}
        ancho={600}
        alto={160}
        decimales={1}
      />

      <div className={styles.tituloTarjeta} style={{ marginTop: 16, marginBottom: 6, fontSize: 12 }}>
        Historial de pliegues
      </div>
      {invertidos.length === 0 ? (
        <p className={styles.sinDatos}>Sin mediciones</p>
      ) : (
        <div className={styles.tablaChicaContenedor}>
          <table className={styles.tablaChica}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Peso</th>
                <th>Σ6 Pl.</th>
                <th>P. Ideal</th>
              </tr>
            </thead>
            <tbody>
              {invertidos.map((r, i) => (
                <tr key={i}>
                  <td>{r.fecha || "—"}</td>
                  <td>{numero(r.peso)}</td>
                  <td className={styles.negrita}>{numero(r.sumatoria6)}</td>
                  <td>{numero(r.pesoIdeal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TablaPlantel({ resumen, onElegir }) {
  return (
    <div className={styles.tablaGrande}>
      <div className={styles.cabeceraTablaGrande}>
        <div className={styles.tituloTarjeta}>Detalle del plantel</div>
        <div className={styles.subtituloTarjeta}>{resumen.length} jugadores · click en una fila para el detalle</div>
      </div>
      <div className={styles.scrollTabla}>
        <table>
          <thead>
            <tr>
              <th className={styles.izquierda}>Jugador</th>
              <th className={styles.izquierda}>Pos</th>
              <th>Altura</th>
              <th>Peso</th>
              <th>Δ Peso</th>
              <th className={styles.izquierda}>Fch. Peso</th>
              <th>P. Ideal</th>
              <th>Dif. Ideal</th>
              <th className={styles.negrita}>Σ6 Pl.</th>
            </tr>
          </thead>
          <tbody>
            {resumen.map((j) => (
              <tr key={j.nombre} className={styles.filaTabla} onClick={() => onElegir(j.nombre)}>
                <td className={styles.izquierda}>
                  <span className={styles.avatarChico}>{inicialesDe(j.nombre)}</span>
                  {j.nombre}
                </td>
                <td className={styles.izquierda}>{j.posicion || "—"}</td>
                <td>{numero(j.altura, 0)}</td>
                <td>{numero(j.peso)}</td>
                <td>{j.deltaPeso != null ? <Diferencia valor={j.deltaPeso} /> : "—"}</td>
                <td className={cx(styles.izquierda, styles.fechaTabla)}>{j.fechaPeso || "—"}</td>
                <td>{numero(j.pesoIdeal)}</td>
                <td>{j.diferenciaIdeal != null ? <Diferencia valor={j.diferenciaIdeal} /> : "—"}</td>
                <td className={styles.negrita}>{numero(j.sumatoria6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
