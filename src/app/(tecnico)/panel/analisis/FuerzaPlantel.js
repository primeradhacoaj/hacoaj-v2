"use client";

import { useRef, useState } from "react";
import {
  evolucionPorFecha,
  fechaDiaMes,
  nombreCorto,
  promedioPrimerRegistro,
  promedioUltimoRegistro,
  topPorFuerzaRelativa,
} from "@/lib/analisisPlantel";
import { cx } from "@/lib/cx";
import Dispersion from "./Dispersion";
import FiltrosPlantel, { FILTROS_VACIOS, aplicarFiltros } from "./FiltrosPlantel";
import { EvolucionJugador, EvolucionPlantel } from "./Graficos";
import styles from "./Metricas.module.css";
import { Avatar, BotonChico, Diferencia, Tendencia, Th, useOrden } from "./Piezas";

const VERDE = "#0e8a4f"; // sentadilla
const AZUL = "#00296b"; // pecho
const numero = (v, decimales = 2) => (v != null ? Number(v).toFixed(decimales) : "—");
const coleccionDe = (ejercicio) => (ejercicio === "sentadilla" ? "fuerzaSent" : "fuerzaPecho");
const colorDe = (ejercicio) => (ejercicio === "sentadilla" ? VERDE : AZUL);
const nombreDe = (ejercicio) => (ejercicio === "sentadilla" ? "Sentadilla" : "Pecho");

// Promedio de RM y peso de todas las mediciones de cada jugador → un punto por
// jugador para el gráfico "Peso vs RM" (como en la v1).
function puntosPesoRm(lista, coleccion, activo) {
  const puntos = [];
  for (const j of lista) {
    const arr = (j[coleccion] || []).filter((r) => r.rm && r.peso);
    if (!arr.length) continue;
    puntos.push({
      nombre: j.nombre,
      posicion: j.posicion || "",
      x: arr.reduce((s, r) => s + r.peso, 0) / arr.length,
      y: arr.reduce((s, r) => s + r.rm, 0) / arr.length,
      activo,
    });
  }
  return puntos;
}

// Último registro de sentadilla y pecho de cada jugador (y el cambio de F.
// relativa contra el anterior), aplanado para la tabla ordenable.
function filaDeTabla(j) {
  const ultimo = (arr) => (arr.length ? arr[arr.length - 1] : {});
  const delta = (arr) => {
    if (arr.length < 2) return null;
    const a = arr[arr.length - 1].fRelativa;
    const b = arr[arr.length - 2].fRelativa;
    return a != null && b != null ? a - b : null;
  };
  const sent = j.fuerzaSent || [];
  const pecho = j.fuerzaPecho || [];
  return {
    nombre: j.nombre,
    posicion: j.posicion,
    peso: j.peso,
    vmpSent: ultimo(sent).vmp ?? null,
    rmSent: ultimo(sent).rm ?? null,
    fRelSent: ultimo(sent).fRelativa ?? null,
    deltaSent: delta(sent),
    fechaSent: ultimo(sent).fecha ?? null,
    vmpPecho: ultimo(pecho).vmp ?? null,
    rmPecho: ultimo(pecho).rm ?? null,
    fRelPecho: ultimo(pecho).fRelativa ?? null,
    deltaPecho: delta(pecho),
    fechaPecho: ultimo(pecho).fecha ?? null,
  };
}

// Pestaña "Fuerza" del dashboard, copiada de la v1: KPIs, filtros plegables,
// ficha del jugador elegido, evolución del promedio del plantel (F. relativa o
// RM, sentadilla o pecho) junto al gráfico "Peso vs RM", ranking completo de
// fuerza relativa y la tabla del plantel (ordenable por columna; clic en una
// fila o en el ranking abre la ficha del jugador).
export default function FuerzaPlantel({ jugadores, regresionExtra = [], posiciones }) {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [ejercicioGrafico, setEjercicioGrafico] = useState("sentadilla");
  const [metrica, setMetrica] = useState("fRelativa");
  const [ejercicioDispersion, setEjercicioDispersion] = useState("sentadilla");
  const [ejercicioRanking, setEjercicioRanking] = useState("sentadilla");
  const [elegido, setElegido] = useState(null);
  const detalleRef = useRef(null);
  const orden = useOrden("nombre", ["fechaSent", "fechaPecho"]);

  const filtrados = aplicarFiltros(jugadores, filtros);
  const total = filtrados.length;

  const fRelSent = promedioUltimoRegistro(filtrados, "fuerzaSent", "fRelativa");
  const fRelPecho = promedioUltimoRegistro(filtrados, "fuerzaPecho", "fRelativa");
  const baseSent = promedioPrimerRegistro(filtrados, "fuerzaSent", "fRelativa");
  const basePecho = promedioPrimerRegistro(filtrados, "fuerzaPecho", "fRelativa");
  const rmSent = promedioUltimoRegistro(filtrados, "fuerzaSent", "rm");
  const rmPecho = promedioUltimoRegistro(filtrados, "fuerzaPecho", "rm");
  const baseRmSent = promedioPrimerRegistro(filtrados, "fuerzaSent", "rm");
  const baseRmPecho = promedioPrimerRegistro(filtrados, "fuerzaPecho", "rm");
  const resta = (a, b) => (a != null && b != null ? a - b : null);

  const etiquetaMetrica = metrica === "fRelativa" ? "F. Relativa" : "RM Estimado";
  const puntosEvolucion = evolucionPorFecha(filtrados, coleccionDe(ejercicioGrafico), metrica);

  const coleccionDispersion = coleccionDe(ejercicioDispersion);
  const puntosDispersion = [
    ...puntosPesoRm(filtrados, coleccionDispersion, true),
    ...puntosPesoRm(regresionExtra, coleccionDispersion, false),
  ];

  const ranking = topPorFuerzaRelativa(filtrados, coleccionDe(ejercicioRanking), Infinity);
  const maximoRanking = ranking.length ? ranking[0].fRelativa : 1;
  const ultimoDe = (nombre, coleccion) => {
    const arr = jugadores.find((j) => j.nombre === nombre)?.[coleccion] || [];
    return arr[arr.length - 1] || {};
  };

  const filas = orden.ordenar(filtrados.map(filaDeTabla));
  const jugadorElegido = elegido ? jugadores.find((j) => j.nombre === elegido) : null;

  const elegir = (nombre) => {
    const nuevo = elegido === nombre ? null : nombre;
    setElegido(nuevo);
    if (nuevo) setTimeout(() => detalleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <div style={{ "--acento": AZUL, "--acento-detalle": "#3b82f6", "--fila-elegida": "rgba(59,130,246,.06)" }}>
      <div className={styles.kpis4}>
        <div className={styles.kpi}>
          <div className={styles.kpiEtiqueta}>
            <span>F. Rel. Sentadilla (prom)</span> <Diferencia valor={resta(fRelSent.promedio, baseSent)} />
          </div>
          <div className={styles.kpiValor}>
            {numero(fRelSent.promedio)}
            <span className={styles.kpiUnidad}>kg/kg</span>
          </div>
          <div className={styles.kpiObjetivo}>Baseline: {numero(baseSent)} · Objetivo: 1.8 – 2.0</div>
          <div className={styles.kpiPie}>
            Prom. último registro por jugador · {fRelSent.cantidad}/{total} medidos
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiEtiqueta}>
            <span>F. Rel. Pecho (prom)</span> <Diferencia valor={resta(fRelPecho.promedio, basePecho)} />
          </div>
          <div className={styles.kpiValor}>
            {numero(fRelPecho.promedio)}
            <span className={styles.kpiUnidad}>kg/kg</span>
          </div>
          <div className={styles.kpiObjetivo}>Baseline: {numero(basePecho)} · Objetivo: 1.3</div>
          <div className={styles.kpiPie}>
            Prom. último registro por jugador · {fRelPecho.cantidad}/{total} medidos
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiEtiqueta}>
            <span>RM Sentadilla (prom)</span> <Diferencia valor={resta(rmSent.promedio, baseRmSent)} decimales={1} sufijo=" kg" />
          </div>
          <div className={styles.kpiValor}>
            {numero(rmSent.promedio, 1)}
            <span className={styles.kpiUnidad}>kg</span>
          </div>
          <div className={styles.kpiObjetivo}>Baseline: {numero(baseRmSent, 1)} kg</div>
          <div className={styles.kpiPie}>
            Prom. último registro · {rmSent.cantidad}/{total} medidos
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiEtiqueta}>
            <span>RM Pecho (prom)</span> <Diferencia valor={resta(rmPecho.promedio, baseRmPecho)} decimales={1} sufijo=" kg" />
          </div>
          <div className={styles.kpiValor}>
            {numero(rmPecho.promedio, 1)}
            <span className={styles.kpiUnidad}>kg</span>
          </div>
          <div className={styles.kpiObjetivo}>Baseline: {numero(baseRmPecho, 1)} kg</div>
          <div className={styles.kpiPie}>
            Prom. último registro · {rmPecho.cantidad}/{total} medidos
          </div>
        </div>
      </div>

      <FiltrosPlantel
        filtros={filtros}
        setFiltros={setFiltros}
        abierto={filtrosAbiertos}
        onAlternar={() => setFiltrosAbiertos((a) => !a)}
        jugadores={jugadores}
        posiciones={posiciones}
        conFechas
      />

      {jugadorElegido && (
        <div ref={detalleRef}>
          <DetalleJugador jugador={jugadorElegido} onCerrar={() => setElegido(null)} />
        </div>
      )}

      <div className={styles.dosColumnas}>
        <div className={styles.card}>
          <div className={styles.cabeceraCard}>
            <div>
              <div className={styles.cardTitulo}>
                Evolución {etiquetaMetrica} {nombreDe(ejercicioGrafico)}
              </div>
              <div className={styles.cardSub}>Promedio del plantel por fecha</div>
            </div>
            <div className={styles.botones}>
              <BotonChico activo={ejercicioGrafico === "sentadilla"} onClick={() => setEjercicioGrafico("sentadilla")}>
                Sent.
              </BotonChico>
              <BotonChico activo={ejercicioGrafico === "pecho"} onClick={() => setEjercicioGrafico("pecho")}>
                Pecho
              </BotonChico>
              <span className={styles.separador} />
              <BotonChico activo={metrica === "fRelativa"} onClick={() => setMetrica("fRelativa")}>
                F.Rel
              </BotonChico>
              <BotonChico activo={metrica === "rm"} onClick={() => setMetrica("rm")}>
                RM
              </BotonChico>
            </div>
          </div>
          <EvolucionPlantel
            puntos={puntosEvolucion}
            color={colorDe(ejercicioGrafico)}
            etiqueta={etiquetaMetrica}
            decimales={metrica === "rm" ? 1 : 2}
          />
        </div>

        <div className={styles.card}>
          <div className={styles.cabeceraCard}>
            <div>
              <div className={styles.cardTitulo}>Peso vs RM {nombreDe(ejercicioDispersion)}</div>
              <div className={styles.cardSub}>¿Quién aprovecha su masa?</div>
            </div>
            <div className={styles.botones}>
              <BotonChico activo={ejercicioDispersion === "sentadilla"} onClick={() => setEjercicioDispersion("sentadilla")}>
                Sent.
              </BotonChico>
              <BotonChico activo={ejercicioDispersion === "pecho"} onClick={() => setEjercicioDispersion("pecho")}>
                Pecho
              </BotonChico>
            </div>
          </div>
          <Dispersion
            key={ejercicioDispersion}
            puntos={puntosDispersion}
            color={colorDe(ejercicioDispersion)}
            etiquetaX="Peso corporal (kg)"
            etiquetaY="RM Estimado (kg)"
            margenY={5}
            globito={(p, residuo) => (
              <>
                <strong>{p.nombre}</strong>
                <br />
                Peso: {p.x.toFixed(1)} kg · RM: {p.y.toFixed(1)} kg
                <br />
                {p.posicion} ·{" "}
                <span style={{ color: residuo >= 0 ? "#6ee7b7" : "#fca5a5" }}>
                  {residuo >= 0 ? "+" : ""}
                  {residuo.toFixed(1)} kg vs tendencia
                </span>
              </>
            )}
            textoTendencia={
              <>
                <strong>Línea de tendencia del plantel</strong>
                <br />
                Calculada a partir de los pesos y RM de todos
                <br />
                los jugadores. Muestra cuánto debería levantar
                <br />
                un jugador dado su peso corporal.
                <br />
                <span style={{ color: "#6ee7b7" }}>▲ Por encima</span> = rinde más de lo esperado
                <br />
                <span style={{ color: "#fca5a5" }}>▼ Por debajo</span> = tiene margen para mejorar
              </>
            }
          />
        </div>
      </div>

      <div className={cx(styles.card, styles.mb16)}>
        <div className={styles.cabeceraCard}>
          <div>
            <div className={styles.cardTitulo}>Ranking F. Relativa {nombreDe(ejercicioRanking)}</div>
            <div className={styles.cardSub}>Todos los jugadores · click para ver detalle</div>
          </div>
          <div className={styles.botones}>
            <BotonChico activo={ejercicioRanking === "sentadilla"} onClick={() => setEjercicioRanking("sentadilla")}>
              Sentadilla
            </BotonChico>
            <BotonChico activo={ejercicioRanking === "pecho"} onClick={() => setEjercicioRanking("pecho")}>
              Pecho
            </BotonChico>
          </div>
        </div>
        <div className={styles.scrollRanking}>
          {ranking.length === 0 ? (
            <div className={styles.sinDatos}>Sin datos</div>
          ) : (
            ranking.map((j, i) => {
              const ultimo = ultimoDe(j.nombre, coleccionDe(ejercicioRanking));
              return (
                <button
                  key={j.nombre}
                  type="button"
                  className={styles.filaRanking}
                  onClick={() => elegir(j.nombre)}
                  title={`${j.nombre}\nRM: ${numero(j.rm, 1)} kg\nVMP: ${numero(ultimo.vmp)} m/s\nFecha: ${j.fecha || "—"}`}
                >
                  <span className={styles.puesto}>{i + 1}</span>
                  <span className={styles.nombreRanking}>{nombreCorto(j.nombre)}</span>
                  <span className={styles.posicionRanking}>{j.posicion || ""}</span>
                  <div className={styles.barraFondo}>
                    <div
                      className={styles.barra}
                      style={{ width: `${(j.fRelativa / maximoRanking) * 100}%`, background: colorDe(ejercicioRanking), opacity: 0.8 }}
                    />
                  </div>
                  <span className={styles.valorRanking}>{numero(j.fRelativa)}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className={styles.tblWrap}>
        <div className={styles.tblCabecera}>
          <div>
            <div className={styles.cardTitulo}>Detalle del plantel</div>
            <div className={styles.cardSub}>{total} jugadores · click en fila para detalle</div>
          </div>
        </div>
        <div className={styles.scrollX}>
          <table className={styles.tabla} style={{ minWidth: "100%" }}>
            <thead>
              <tr>
                <th colSpan={3} className={styles.grupoVacio} />
                <th colSpan={5} className={cx(styles.grupo, styles.grupoSent)}>
                  Sentadilla
                </th>
                <th colSpan={5} className={cx(styles.grupo, styles.grupoPecho)}>
                  Pecho
                </th>
              </tr>
              <tr>
                <Th orden={orden} columna="nombre" className={styles.izq} style={{ minWidth: 120 }}>
                  Jugador
                </Th>
                <Th orden={orden} columna="posicion" className={styles.izq} style={{ minWidth: 50 }}>
                  Pos
                </Th>
                <Th orden={orden} columna="peso" className={styles.der} style={{ minWidth: 45 }}>
                  Peso
                </Th>
                <Th orden={orden} columna="vmpSent" className={cx(styles.der, styles.thSent)} style={{ minWidth: 42 }}>
                  VMP.S
                </Th>
                <Th orden={orden} columna="rmSent" className={cx(styles.der, styles.thSent)} style={{ minWidth: 42 }}>
                  RM.S
                </Th>
                <Th orden={orden} columna="fRelSent" className={cx(styles.der, styles.thSent, styles.fuerte)} style={{ minWidth: 42 }}>
                  F.R.S
                </Th>
                <Th orden={orden} columna="deltaSent" className={cx(styles.der, styles.thSent)} style={{ minWidth: 42 }}>
                  Δ Sent
                </Th>
                <Th orden={orden} columna="fechaSent" className={cx(styles.izq, styles.thSent)} style={{ minWidth: 68 }}>
                  Fch.S
                </Th>
                <Th orden={orden} columna="vmpPecho" className={cx(styles.der, styles.thPecho)} style={{ minWidth: 42 }}>
                  VMP.P
                </Th>
                <Th orden={orden} columna="rmPecho" className={cx(styles.der, styles.thPecho)} style={{ minWidth: 42 }}>
                  RM.P
                </Th>
                <Th orden={orden} columna="fRelPecho" className={cx(styles.der, styles.thPecho, styles.fuerte)} style={{ minWidth: 42 }}>
                  F.R.P
                </Th>
                <Th orden={orden} columna="deltaPecho" className={cx(styles.der, styles.thPecho)} style={{ minWidth: 42 }}>
                  Δ Pecho
                </Th>
                <Th orden={orden} columna="fechaPecho" className={cx(styles.izq, styles.thPecho)} style={{ minWidth: 68 }}>
                  Fch.P
                </Th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.nombre} className={cx(styles.fila, elegido === f.nombre && styles.filaElegida)} onClick={() => elegir(f.nombre)}>
                  <td>
                    <div className={styles.celdaJugador}>
                      <Avatar nombre={f.nombre} tamano={24} />
                      <span className={styles.nombreJugador}>{f.nombre}</span>
                    </div>
                  </td>
                  <td>{f.posicion || "—"}</td>
                  <td className={styles.der}>{numero(f.peso, 1)}</td>
                  <td className={cx(styles.der, styles.tdSent)}>{numero(f.vmpSent)}</td>
                  <td className={cx(styles.der, styles.tdSent)}>{numero(f.rmSent, 1)}</td>
                  <td className={cx(styles.der, styles.tdSent, styles.fuerte)}>{numero(f.fRelSent)}</td>
                  <td className={cx(styles.der, styles.tdSent)}>{f.deltaSent != null ? <Tendencia valor={f.deltaSent} /> : "—"}</td>
                  <td className={cx(styles.fechaGris, styles.tdSent)}>{fechaDiaMes(f.fechaSent)}</td>
                  <td className={cx(styles.der, styles.tdPecho)}>{numero(f.vmpPecho)}</td>
                  <td className={cx(styles.der, styles.tdPecho)}>{numero(f.rmPecho, 1)}</td>
                  <td className={cx(styles.der, styles.tdPecho, styles.fuerte)}>{numero(f.fRelPecho)}</td>
                  <td className={cx(styles.der, styles.tdPecho)}>{f.deltaPecho != null ? <Tendencia valor={f.deltaPecho} /> : "—"}</td>
                  <td className={cx(styles.fechaGris, styles.tdPecho)}>{fechaDiaMes(f.fechaPecho)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.tblPie}>{total} jugadores</div>
      </div>
    </div>
  );
}

// Ficha del jugador elegido: F. relativa actual (y el cambio), evolución de
// F. relativa y de RM, e historial de sentadilla y de pecho.
function DetalleJugador({ jugador, onCerrar }) {
  const sent = jugador.fuerzaSent || [];
  const pecho = jugador.fuerzaPecho || [];
  const actualYCambio = (arr) => {
    const actual = arr.length ? arr[arr.length - 1].fRelativa : null;
    if (arr.length < 2) return { actual, cambio: null };
    const anterior = arr[arr.length - 2].fRelativa;
    return { actual, cambio: actual != null && anterior != null ? actual - anterior : null };
  };
  const dSent = actualYCambio(sent);
  const dPecho = actualYCambio(pecho);
  const series = (campo) => [
    { nombre: "Sentadilla", color: VERDE, puntos: sent.map((r) => ({ fecha: r.fecha, valor: r[campo] })) },
    { nombre: "Pecho", color: AZUL, puntos: pecho.map((r) => ({ fecha: r.fecha, valor: r[campo] })) },
  ];
  const leyenda = (
    <div className={styles.leyenda}>
      <span>
        <span className={styles.rayita} style={{ background: VERDE }} />
        Sentadilla
      </span>
      <span>
        <span className={styles.rayita} style={{ background: AZUL }} />
        Pecho
      </span>
    </div>
  );

  return (
    <div className={cx(styles.card, styles.detalle)}>
      <button type="button" className={styles.cerrar} onClick={onCerrar} title="Cerrar" aria-label="Cerrar">
        ✕
      </button>
      <div className={styles.cabeceraDetalle}>
        <Avatar nombre={jugador.nombre} tamano={40} />
        <div>
          <div className={styles.nombreDetalle}>{jugador.nombre}</div>
          <div className={styles.metaDetalle}>
            {jugador.posicion || ""} · {jugador.peso != null ? `${numero(jugador.peso, 1)} kg` : ""} ·{" "}
            {jugador.edad != null ? `${jugador.edad} años` : ""} · {jugador.piernaHabil || ""}
          </div>
        </div>
        <div className={styles.cifras}>
          <div>
            <div className={styles.rotuloCifra}>F.Rel Sent</div>
            <div className={styles.valorCifra} style={{ color: VERDE }}>
              {numero(dSent.actual)}
              {dSent.cambio != null && <Diferencia valor={dSent.cambio} />}
            </div>
          </div>
          <div>
            <div className={styles.rotuloCifra}>F.Rel Pecho</div>
            <div className={styles.valorCifra} style={{ color: AZUL }}>
              {numero(dPecho.actual)}
              {dPecho.cambio != null && <Diferencia valor={dPecho.cambio} />}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.dosColumnas}>
        <div>
          <div className={styles.tituloChico}>Evolución F. Relativa</div>
          <EvolucionJugador series={series("fRelativa")} />
          {leyenda}
        </div>
        <div>
          <div className={styles.tituloChico}>Evolución RM Estimado</div>
          <EvolucionJugador series={series("rm")} decimales={1} />
          {leyenda}
        </div>
      </div>
      <div className={styles.dosColumnas} style={{ marginBottom: 0 }}>
        <div>
          <div className={styles.tituloChico}>Historial Sentadilla</div>
          <div className={styles.historial}>
            <HistorialFuerza filas={sent} />
          </div>
        </div>
        <div>
          <div className={styles.tituloChico}>Historial Pecho</div>
          <div className={styles.historial}>
            <HistorialFuerza filas={pecho} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HistorialFuerza({ filas }) {
  if (!filas.length) return <div className={styles.sinMediciones}>Sin mediciones</div>;
  return (
    <table className={cx(styles.tabla, styles.tablaChica)}>
      <thead>
        <tr>
          <th className={styles.izq}>Fecha</th>
          <th className={styles.der}>Peso</th>
          <th className={styles.der}>Carga</th>
          <th className={styles.der}>VMP</th>
          <th className={styles.der}>RM</th>
          <th className={styles.der}>F.Rel</th>
        </tr>
      </thead>
      <tbody>
        {[...filas].reverse().map((r, i) => (
          <tr key={i}>
            <td>{r.fecha || "—"}</td>
            <td className={styles.der}>{numero(r.peso, 1)}</td>
            <td className={styles.der}>{numero(r.carga, 1)}</td>
            <td className={styles.der}>{numero(r.vmp)}</td>
            <td className={cx(styles.der, styles.negrita)}>{numero(r.rm, 1)}</td>
            <td className={cx(styles.der, styles.negrita)}>{numero(r.fRelativa)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
