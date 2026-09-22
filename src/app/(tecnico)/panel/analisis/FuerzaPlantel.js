"use client";

import { useMemo, useState } from "react";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import {
  evolucionPorFecha,
  promedioPrimerRegistro,
  promedioUltimoRegistro,
  resumenFuerzaPorJugador,
  topPorFuerzaRelativa,
} from "@/lib/analisisPlantel";
import { exportarFuerzaPlantel } from "@/lib/exportarAnalisisPlantel";
import comunes from "./AnalisisComun.module.css";
import propio from "./FuerzaPlantel.module.css";
import LineChart from "./LineChart";

// Junta las clases compartidas por las pestañas del dashboard con las
// propias de Fuerza (colores de sentadilla/pecho).
const styles = { ...comunes, ...propio };

const numero = (v, decimales = 2) => (v != null ? v.toFixed(decimales) : "—");
const inicialesDe = (nombre) =>
  nombre.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("").toUpperCase();
const nombreCorto = (nombre) => `${nombre.split(" ")[0]} ${(nombre.split(" ")[1] || "")[0] ?? ""}.`;

// Pestaña "Fuerza" del Dashboard de análisis: KPIs, filtros (posición, pierna
// hábil), evolución en el tiempo, ranking completo, ficha de un jugador y la
// tabla con todo el plantel. Copiado de la v1, sin el scatter plot de peso
// vs RM (con zoom/pan y regresión lineal) — se dejó afuera por lo complejo
// que es de reproducir fiel, y da una lectura parecida a la del ranking.
export default function FuerzaPlantel({ jugadores, posiciones }) {
  const [filtroPosicion, setFiltroPosicion] = useState("");
  const [filtroPierna, setFiltroPierna] = useState("");
  const [ejercicioGrafico, setEjercicioGrafico] = useState("sentadilla");
  const [metricaGrafico, setMetricaGrafico] = useState("fRelativa");
  const [ejercicioRanking, setEjercicioRanking] = useState("sentadilla");
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

  const ultimoSent = promedioUltimoRegistro(filtrados, "fuerzaSent", "fRelativa");
  const baseSent = promedioPrimerRegistro(filtrados, "fuerzaSent", "fRelativa");
  const ultimoPecho = promedioUltimoRegistro(filtrados, "fuerzaPecho", "fRelativa");
  const basePecho = promedioPrimerRegistro(filtrados, "fuerzaPecho", "fRelativa");
  const rmSent = promedioUltimoRegistro(filtrados, "fuerzaSent", "rm");
  const baseRmSent = promedioPrimerRegistro(filtrados, "fuerzaSent", "rm");
  const rmPecho = promedioUltimoRegistro(filtrados, "fuerzaPecho", "rm");
  const baseRmPecho = promedioPrimerRegistro(filtrados, "fuerzaPecho", "rm");

  const coleccionGrafico = ejercicioGrafico === "sentadilla" ? "fuerzaSent" : "fuerzaPecho";
  const colorGrafico = ejercicioGrafico === "sentadilla" ? "#0e8a4f" : "#00296b";
  const puntosGrafico = evolucionPorFecha(filtrados, coleccionGrafico, metricaGrafico);

  const coleccionRanking = ejercicioRanking === "sentadilla" ? "fuerzaSent" : "fuerzaPecho";
  const colorRanking = ejercicioRanking === "sentadilla" ? "#0e8a4f" : "#00296b";
  const ranking = topPorFuerzaRelativa(filtrados, coleccionRanking, Infinity);
  const maximoRanking = ranking.length ? ranking[0].fRelativa : 1;

  const resumen = resumenFuerzaPorJugador(filtrados);
  const jugadorDetalle = jugadorElegido ? jugadores.find((j) => j.nombre === jugadorElegido) : null;

  return (
    <>
      <div className={styles.kpis}>
        <Kpi
          etiqueta="F. Rel. Sentadilla (prom)"
          diferencia={ultimoSent.promedio != null && baseSent != null ? ultimoSent.promedio - baseSent : null}
          valor={numero(ultimoSent.promedio)}
          unidad="kg/kg"
          nota={`Baseline: ${numero(baseSent)} · Objetivo: 1.8 – 2.0`}
          pie={`${ultimoSent.cantidad}/${filtrados.length} medidos`}
        />
        <Kpi
          etiqueta="F. Rel. Pecho (prom)"
          diferencia={ultimoPecho.promedio != null && basePecho != null ? ultimoPecho.promedio - basePecho : null}
          valor={numero(ultimoPecho.promedio)}
          unidad="kg/kg"
          nota={`Baseline: ${numero(basePecho)} · Objetivo: 1.3`}
          pie={`${ultimoPecho.cantidad}/${filtrados.length} medidos`}
        />
        <Kpi
          etiqueta="RM Sentadilla (prom)"
          diferencia={rmSent.promedio != null && baseRmSent != null ? rmSent.promedio - baseRmSent : null}
          valor={numero(rmSent.promedio, 1)}
          unidad="kg"
          nota={`Baseline: ${numero(baseRmSent, 1)} kg`}
          pie={`${rmSent.cantidad}/${filtrados.length} medidos`}
        />
        <Kpi
          etiqueta="RM Pecho (prom)"
          diferencia={rmPecho.promedio != null && baseRmPecho != null ? rmPecho.promedio - baseRmPecho : null}
          valor={numero(rmPecho.promedio, 1)}
          unidad="kg"
          nota={`Baseline: ${numero(baseRmPecho, 1)} kg`}
          pie={`${rmPecho.cantidad}/${filtrados.length} medidos`}
        />
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
        <button
          type="button"
          className={styles.botonExportar}
          onClick={() => exportarFuerzaPlantel(resumen)}
        >
          <Icono nombre="descargar" tamano={14} strokeWidth={2} />
          Exportar tabla
        </button>
      </div>

      {jugadorDetalle && (
        <DetalleJugador jugador={jugadorDetalle} onCerrar={() => setJugadorElegido(null)} />
      )}

      <div className={styles.tarjeta}>
        <div className={styles.cabeceraTarjeta}>
          <div>
            <div className={styles.tituloTarjeta}>
              Evolución {metricaGrafico === "fRelativa" ? "F. Relativa" : "RM Estimado"}{" "}
              {ejercicioGrafico === "sentadilla" ? "Sentadilla" : "Pecho"}
            </div>
            <div className={styles.subtituloTarjeta}>Promedio del plantel por fecha</div>
          </div>
          <div className={styles.botonesChica}>
            <BotonChip activo={ejercicioGrafico === "sentadilla"} onClick={() => setEjercicioGrafico("sentadilla")}>
              Sent.
            </BotonChip>
            <BotonChip activo={ejercicioGrafico === "pecho"} onClick={() => setEjercicioGrafico("pecho")}>
              Pecho
            </BotonChip>
            <span className={styles.separadorChip} />
            <BotonChip activo={metricaGrafico === "fRelativa"} onClick={() => setMetricaGrafico("fRelativa")}>
              F.Rel
            </BotonChip>
            <BotonChip activo={metricaGrafico === "rm"} onClick={() => setMetricaGrafico("rm")}>
              RM
            </BotonChip>
          </div>
        </div>
        <LineChart
          series={[{ nombre: ejercicioGrafico, color: colorGrafico, puntos: puntosGrafico.map((p) => ({ fecha: p.fecha, valor: p.valor })) }]}
          decimales={metricaGrafico === "rm" ? 1 : 2}
        />
      </div>

      <div className={styles.tarjeta}>
        <div className={styles.cabeceraTarjeta}>
          <div>
            <div className={styles.tituloTarjeta}>
              Ranking F. Relativa {ejercicioRanking === "sentadilla" ? "Sentadilla" : "Pecho"}
            </div>
            <div className={styles.subtituloTarjeta}>Todos los jugadores · click para ver detalle</div>
          </div>
          <div className={styles.botonesChica}>
            <BotonChip activo={ejercicioRanking === "sentadilla"} onClick={() => setEjercicioRanking("sentadilla")}>
              Sentadilla
            </BotonChip>
            <BotonChip activo={ejercicioRanking === "pecho"} onClick={() => setEjercicioRanking("pecho")}>
              Pecho
            </BotonChip>
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
                title={`RM: ${numero(j.rm, 1)} kg · Fecha: ${j.fecha}`}
              >
                <span className={styles.puestoRanking}>{indice + 1}</span>
                <span className={styles.nombreRanking}>{nombreCorto(j.nombre)}</span>
                <span className={styles.posicionRanking}>{j.posicion}</span>
                <div className={styles.barraFondo}>
                  <div
                    className={styles.barraRelleno}
                    style={{ width: `${(j.fRelativa / maximoRanking) * 100}%`, background: colorRanking }}
                  />
                </div>
                <span className={styles.valorRanking}>{numero(j.fRelativa)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <TablaPlantel resumen={resumen} onElegir={setJugadorElegido} />
    </>
  );
}

function Kpi({ etiqueta, diferencia, valor, unidad, nota, pie }) {
  return (
    <div className={styles.kpi}>
      <div className={styles.etiquetaKpi}>
        {etiqueta} {diferencia != null && <Diferencia valor={diferencia} />}
      </div>
      <div className={styles.valorKpi}>
        {valor}
        <span className={styles.unidadKpi}>{unidad}</span>
      </div>
      {nota && <div className={styles.notaKpi}>{nota}</div>}
      {pie && <div className={styles.pieKpi}>Prom. último registro · {pie}</div>}
    </div>
  );
}

function Diferencia({ valor }) {
  const signo = valor > 0 ? "+" : "";
  return (
    <span className={valor > 0 ? styles.tendenciaSube : valor < 0 ? styles.tendenciaBaja : undefined}>
      {signo}
      {valor.toFixed(2)}
    </span>
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

function BotonChip({ activo, onClick, children }) {
  return (
    <button type="button" className={cx(styles.chip, activo && styles.chipActivo)} onClick={onClick}>
      {children}
    </button>
  );
}

function DetalleJugador({ jugador, onCerrar }) {
  const sent = jugador.fuerzaSent || [];
  const pecho = jugador.fuerzaPecho || [];
  const deltaDe = (arr) => {
    if (arr.length === 0) return { actual: null, delta: null };
    const actual = arr[arr.length - 1].fRelativa;
    const anterior = arr.length >= 2 ? arr[arr.length - 2].fRelativa : null;
    return { actual, delta: actual != null && anterior != null ? actual - anterior : null };
  };
  const dSent = deltaDe(sent);
  const dPecho = deltaDe(pecho);

  const serieFRel = [
    { nombre: "Sentadilla", color: "#0e8a4f", puntos: sent.map((r) => ({ fecha: r.fecha, valor: r.fRelativa })) },
    { nombre: "Pecho", color: "#00296b", puntos: pecho.map((r) => ({ fecha: r.fecha, valor: r.fRelativa })) },
  ];

  return (
    <div className={styles.tarjetaDetalle}>
      <button type="button" className={styles.cerrarDetalle} onClick={onCerrar} aria-label="Cerrar">
        <Icono nombre="cerrar" tamano={16} strokeWidth={2} />
      </button>
      <div className={styles.cabeceraDetalle}>
        <span className={styles.avatarDetalle}>{inicialesDe(jugador.nombre)}</span>
        <div>
          <div className={styles.nombreDetalle}>{jugador.nombre}</div>
          <div className={styles.metaDetalle}>
            {[jugador.posicion, jugador.peso != null && `${numero(jugador.peso, 1)} kg`, jugador.edad != null && `${jugador.edad} años`, jugador.piernaHabil]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div className={styles.cifrasDetalle}>
          <div>
            <div className={styles.rotuloCifra}>F.Rel Sent</div>
            <div className={cx(styles.valorCifra, styles.colorSent)}>
              {numero(dSent.actual)}
              {dSent.delta != null && <Diferencia valor={dSent.delta} />}
            </div>
          </div>
          <div>
            <div className={styles.rotuloCifra}>F.Rel Pecho</div>
            <div className={cx(styles.valorCifra, styles.colorPecho)}>
              {numero(dPecho.actual)}
              {dPecho.delta != null && <Diferencia valor={dPecho.delta} />}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tituloTarjeta} style={{ marginBottom: 6 }}>
        Evolución F. Relativa
      </div>
      <LineChart series={serieFRel} ancho={600} alto={160} />
      <div className={styles.leyendaLinea}>
        <span>
          <span className={styles.puntoLeyenda} style={{ background: "#0e8a4f" }} /> Sentadilla
        </span>
        <span>
          <span className={styles.puntoLeyenda} style={{ background: "#00296b" }} /> Pecho
        </span>
      </div>

      <div className={styles.historialesDetalle}>
        <HistorialChico titulo="Historial Sentadilla" filas={sent} />
        <HistorialChico titulo="Historial Pecho" filas={pecho} />
      </div>
    </div>
  );
}

function HistorialChico({ titulo, filas }) {
  const invertidas = [...filas].reverse();
  return (
    <div>
      <div className={styles.tituloTarjeta} style={{ marginBottom: 6, fontSize: 12 }}>
        {titulo}
      </div>
      {invertidas.length === 0 ? (
        <p className={styles.sinDatos}>Sin mediciones</p>
      ) : (
        <div className={styles.tablaChicaContenedor}>
          <table className={styles.tablaChica}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Peso</th>
                <th>Carga</th>
                <th>VMP</th>
                <th>RM</th>
                <th>F.Rel</th>
              </tr>
            </thead>
            <tbody>
              {invertidas.map((r, i) => (
                <tr key={i}>
                  <td>{r.fecha || "—"}</td>
                  <td>{numero(r.peso, 1)}</td>
                  <td>{numero(r.carga, 1)}</td>
                  <td>{numero(r.vmp)}</td>
                  <td className={styles.negrita}>{numero(r.rm, 1)}</td>
                  <td className={styles.negrita}>{numero(r.fRelativa)}</td>
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
              <th colSpan={3} className={styles.sinBorde} />
              <th colSpan={5} className={cx(styles.grupoSent, styles.grupoCabecera)}>
                Sentadilla
              </th>
              <th colSpan={5} className={cx(styles.grupoPecho, styles.grupoCabecera)}>
                Pecho
              </th>
            </tr>
            <tr>
              <th className={styles.izquierda}>Jugador</th>
              <th className={styles.izquierda}>Pos</th>
              <th>Peso</th>
              <th className={styles.grupoSent}>VMP.S</th>
              <th className={styles.grupoSent}>RM.S</th>
              <th className={cx(styles.grupoSent, styles.negrita)}>F.R.S</th>
              <th className={styles.grupoSent}>Δ Sent</th>
              <th className={cx(styles.grupoSent, styles.izquierda)}>Fch.S</th>
              <th className={styles.grupoPecho}>VMP.P</th>
              <th className={styles.grupoPecho}>RM.P</th>
              <th className={cx(styles.grupoPecho, styles.negrita)}>F.R.P</th>
              <th className={styles.grupoPecho}>Δ Pecho</th>
              <th className={cx(styles.grupoPecho, styles.izquierda)}>Fch.P</th>
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
                <td>{numero(j.peso, 1)}</td>
                <td className={styles.grupoSent}>{numero(j.sentadilla.vmp)}</td>
                <td className={styles.grupoSent}>{numero(j.sentadilla.rm, 1)}</td>
                <td className={cx(styles.grupoSent, styles.negrita)}>{numero(j.sentadilla.fRelativa)}</td>
                <td className={styles.grupoSent}>
                  {j.sentadilla.delta != null ? <Diferencia valor={j.sentadilla.delta} /> : "—"}
                </td>
                <td className={cx(styles.grupoSent, styles.izquierda, styles.fechaTabla)}>{j.sentadilla.fecha || "—"}</td>
                <td className={styles.grupoPecho}>{numero(j.pecho.vmp)}</td>
                <td className={styles.grupoPecho}>{numero(j.pecho.rm, 1)}</td>
                <td className={cx(styles.grupoPecho, styles.negrita)}>{numero(j.pecho.fRelativa)}</td>
                <td className={styles.grupoPecho}>{j.pecho.delta != null ? <Diferencia valor={j.pecho.delta} /> : "—"}</td>
                <td className={cx(styles.grupoPecho, styles.izquierda, styles.fechaTabla)}>{j.pecho.fecha || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
