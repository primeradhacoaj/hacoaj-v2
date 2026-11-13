"use client";

import { useRef, useState } from "react";
import { delAnioActual, evolucionAnioActual, fechaDiaMes, nombreCorto } from "@/lib/analisisPlantel";
import { cx } from "@/lib/cx";
import Dispersion from "./Dispersion";
import FiltrosPlantel, { FILTROS_VACIOS, aplicarFiltros } from "./FiltrosPlantel";
import { EvolucionJugador, EvolucionPlantel } from "./Graficos";
import styles from "./Metricas.module.css";
import { Avatar, BotonChico, Tendencia, Th, useOrden } from "./Piezas";

const ROJO = "#e11d48"; // pliegues
const VIOLETA = "#6366f1"; // peso
const ANIO = new Date().getFullYear();
const numero = (v, decimales = 1) => (v != null ? Number(v).toFixed(decimales) : "—");
const promedio = (valores) => (valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null);

const COLOR_POSICION = { Arquero: "#3b82f6", Central: "#00296b", Lateral: "#ed0992", Volante: "#0e8a4f", Delantero: "#c2410c" };
const ORDEN_POSICIONES = ["Arquero", "Central", "Lateral", "Volante", "Delantero"];

// Datos "de este año" de cada jugador (la v1 miraba solo el año en curso para
// peso y pliegues): último pesaje, el cambio contra el anterior, Σ6 pliegues,
// peso ideal y la diferencia con el ideal.
function datosDelAnio(j) {
  const pesos = delAnioActual(j.pesos).filter((r) => r.peso != null);
  const pliegues = delAnioActual(j.pliegues);
  const ultimoPliegue = pliegues.length ? pliegues[pliegues.length - 1] : null;
  const pesoActual = pesos.length ? pesos[pesos.length - 1].peso : null;
  const pesoIdeal = ultimoPliegue?.pesoIdeal ?? null;
  return {
    nombre: j.nombre,
    posicion: j.posicion,
    altura: j.altura,
    pesoActual,
    fechaPeso: pesos.length ? pesos[pesos.length - 1].fecha : null,
    deltaPeso: pesos.length >= 2 ? pesos[pesos.length - 1].peso - pesos[pesos.length - 2].peso : null,
    pesoIdeal,
    // positivo = le falta subir (como en la v1)
    diferenciaIdeal: pesoActual != null && pesoIdeal != null ? pesoIdeal - pesoActual : null,
    sumatoria6: ultimoPliegue?.sumatoria6 ?? null,
  };
}

// Promedio de un valor por posición (barras de "por posición").
function porPosicion(filas, campo) {
  const grupos = new Map();
  for (const f of filas) {
    const v = f[campo];
    if (v == null || v <= 0 || !f.posicion) continue;
    grupos.set(f.posicion, [...(grupos.get(f.posicion) ?? []), v]);
  }
  const posiciones = [
    ...ORDEN_POSICIONES.filter((p) => grupos.has(p)),
    ...[...grupos.keys()].filter((p) => !ORDEN_POSICIONES.includes(p)),
  ];
  return posiciones.map((p) => {
    const valores = grupos.get(p);
    return {
      posicion: p,
      promedio: promedio(valores),
      minimo: Math.min(...valores),
      maximo: Math.max(...valores),
      cantidad: valores.length,
      color: COLOR_POSICION[p] ?? "#666",
    };
  });
}

// Pestaña "Composición corporal" del dashboard, copiada de la v1: KPIs del año,
// filtros plegables, ficha del jugador elegido, evolución del peso promedio
// junto al gráfico Σ6 pliegues vs peso (o altura vs peso), ranking de Σ6
// pliegues, promedios por posición y la tabla del plantel ordenable.
export default function PliequesPlantel({ jugadores, posiciones }) {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [modoDispersion, setModoDispersion] = useState("pliegues");
  const [elegido, setElegido] = useState(null);
  const detalleRef = useRef(null);
  const orden = useOrden("nombre", ["fechaPeso"]);

  const filtrados = aplicarFiltros(jugadores, filtros);
  const total = filtrados.length;
  const datos = filtrados.map(datosDelAnio);

  const valoresPliegues = datos.map((d) => d.sumatoria6).filter((v) => v != null && v > 0);
  const pesos = datos.map((d) => d.pesoActual).filter((v) => v != null && v > 0);
  const alturas = filtrados.map((j) => j.altura).filter((v) => v != null && v > 0);

  const ranking = datos.filter((d) => d.sumatoria6 != null && d.sumatoria6 > 0).sort((a, b) => a.sumatoria6 - b.sumatoria6);
  const maximoRanking = ranking.length ? Math.max(...ranking.map((r) => r.sumatoria6)) : 1;

  const esPliegues = modoDispersion === "pliegues";
  const puntosDispersion = datos
    .filter((d) => d.pesoActual)
    .map((d) => ({ nombre: d.nombre, posicion: d.posicion || "", x: d.pesoActual, y: esPliegues ? d.sumatoria6 : d.altura, activo: true }))
    .filter((p) => p.y != null && p.y > 0);

  const filas = orden.ordenar(datos);
  const jugadorElegido = elegido ? jugadores.find((j) => j.nombre === elegido) : null;

  const elegir = (nombre) => {
    const nuevo = elegido === nombre ? null : nombre;
    setElegido(nuevo);
    if (nuevo) setTimeout(() => detalleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <div style={{ "--acento": ROJO, "--acento-detalle": ROJO, "--fila-elegida": "rgba(225,29,72,.06)" }}>
      <div className={styles.kpis3}>
        <div className={styles.kpi}>
          <div className={styles.kpiEtiqueta}>Σ6 Pliegues (prom)</div>
          <div className={styles.kpiValor}>
            {numero(promedio(valoresPliegues))}
            <span className={styles.kpiUnidad}>mm</span>
          </div>
          <div className={styles.kpiPie}>
            {valoresPliegues.length}/{total} con medición
            {valoresPliegues.length > 0 &&
              ` · Rango: ${numero(Math.min(...valoresPliegues))} – ${numero(Math.max(...valoresPliegues))}`}
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiEtiqueta}>Peso promedio</div>
          <div className={styles.kpiValor}>
            {numero(promedio(pesos))}
            <span className={styles.kpiUnidad}>kg</span>
          </div>
          <div className={styles.kpiPie}>
            Último pesaje {ANIO} · {pesos.length}/{total} con registro
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiEtiqueta}>Altura promedio</div>
          <div className={styles.kpiValor}>
            {numero(promedio(alturas))}
            <span className={styles.kpiUnidad}>cm</span>
          </div>
          <div className={styles.kpiPie}>{alturas.length} jugadores con dato</div>
        </div>
      </div>

      <FiltrosPlantel
        filtros={filtros}
        setFiltros={setFiltros}
        abierto={filtrosAbiertos}
        onAlternar={() => setFiltrosAbiertos((a) => !a)}
        jugadores={jugadores}
        posiciones={posiciones}
      />

      {jugadorElegido && (
        <div ref={detalleRef}>
          <DetalleJugador jugador={jugadorElegido} onCerrar={() => setElegido(null)} />
        </div>
      )}

      <div className={styles.dosColumnas}>
        <div className={styles.card}>
          <div className={styles.cardTitulo}>Evolución peso promedio ({ANIO})</div>
          <div className={styles.cardSub} style={{ marginBottom: 12 }}>
            Promedio del plantel por fecha de pesaje
          </div>
          <EvolucionPlantel
            puntos={evolucionAnioActual(filtrados, "pesos", "peso")}
            color={VIOLETA}
            etiqueta="Peso prom"
            decimales={1}
            formatoFecha={fechaDiaMes}
            chico
            textoVacio={`Sin datos suficientes de pesaje en ${ANIO}`}
          />
        </div>
        <div className={styles.card}>
          <div className={styles.cabeceraCard}>
            <div>
              <div className={styles.cardTitulo}>{esPliegues ? "Σ6 Pliegues vs Peso" : "Altura vs Peso"}</div>
              <div className={styles.cardSub}>{esPliegues ? "¿Quién tiene mejor composición?" : "Relación altura-peso"}</div>
            </div>
            <div className={styles.botones}>
              <BotonChico activo={esPliegues} onClick={() => setModoDispersion("pliegues")}>
                Pliegues
              </BotonChico>
              <BotonChico activo={!esPliegues} onClick={() => setModoDispersion("altura")}>
                Altura
              </BotonChico>
            </div>
          </div>
          <Dispersion
            key={modoDispersion}
            puntos={puntosDispersion}
            color={esPliegues ? ROJO : VIOLETA}
            etiquetaX="Peso corporal (kg)"
            etiquetaY={esPliegues ? "Σ6 Pliegues (mm)" : "Altura (cm)"}
            decimalesY={esPliegues ? 1 : 0}
            margenY={esPliegues ? 5 : 2}
            colorEncima={esPliegues ? "#c2410c" : "#0e8a4f"}
            colorDebajo={esPliegues ? "#0e8a4f" : "#c2410c"}
            globito={(p, residuo) => {
              const bueno = esPliegues ? residuo <= 0 : residuo >= 0;
              return (
                <>
                  <strong>{p.nombre}</strong>
                  <br />
                  Peso: {p.x.toFixed(1)} kg · {esPliegues ? "Σ6 Pliegues" : "Altura"}: {p.y.toFixed(1)}
                  {esPliegues ? " mm" : " cm"}
                  <br />
                  {p.posicion} ·{" "}
                  <span style={{ color: bueno ? "#6ee7b7" : "#fca5a5" }}>
                    {residuo >= 0 ? "+" : ""}
                    {residuo.toFixed(1)} vs tendencia
                  </span>
                </>
              );
            }}
            textoTendencia={
              esPliegues ? (
                <>
                  <strong>Línea de tendencia</strong>
                  <br />
                  Relación entre peso corporal y Σ6 pliegues.
                  <br />
                  <span style={{ color: "#6ee7b7" }}>▼ Por debajo</span> = mejor composición corporal
                  <br />
                  <span style={{ color: "#fca5a5" }}>▲ Por encima</span> = mayor grasa subcutánea
                </>
              ) : (
                <>
                  <strong>Línea de tendencia</strong>
                  <br />
                  Relación entre peso corporal y altura.
                  <br />
                  <span style={{ color: "#6ee7b7" }}>▲ Por encima</span> = más alto de lo esperado
                  <br />
                  <span style={{ color: "#fca5a5" }}>▼ Por debajo</span> = más bajo de lo esperado
                </>
              )
            }
          />
        </div>
      </div>

      <div className={styles.dosColumnas}>
        <div className={styles.card}>
          <div className={styles.cardTitulo}>Ranking Σ6 Pliegues</div>
          <div className={styles.cardSub} style={{ marginBottom: 12 }}>
            Menor es mejor · click para ver detalle
          </div>
          <div className={styles.scrollRanking}>
            {ranking.length === 0 ? (
              <div className={styles.sinDatos}>Sin datos</div>
            ) : (
              ranking.map((d, i) => (
                <button
                  key={d.nombre}
                  type="button"
                  className={styles.filaRanking}
                  onClick={() => elegir(d.nombre)}
                  title={`${d.nombre}\nΣ6: ${numero(d.sumatoria6)} mm`}
                >
                  <span className={styles.puesto}>{i + 1}</span>
                  <span className={styles.nombreRanking}>{nombreCorto(d.nombre)}</span>
                  <span className={styles.posicionRanking}>{d.posicion || ""}</span>
                  <div className={styles.barraFondo}>
                    <div className={styles.barra} style={{ width: `${(d.sumatoria6 / maximoRanking) * 100}%`, background: ROJO, opacity: 0.7 }} />
                  </div>
                  <span className={styles.valorRanking}>{numero(d.sumatoria6)}</span>
                </button>
              ))
            )}
          </div>
        </div>
        <div>
          <div className={cx(styles.card, styles.mb16)}>
            <div className={styles.cardTitulo}>Σ6 Pliegues por posición</div>
            <div className={styles.cardSub} style={{ marginBottom: 12 }}>
              Promedio por posición
            </div>
            <BarrasPorPosicion grupos={porPosicion(datos, "sumatoria6")} unidad="mm" />
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitulo}>Peso promedio por posición</div>
            <div className={styles.cardSub} style={{ marginBottom: 12 }}>
              Promedio del último pesaje {ANIO}
            </div>
            <BarrasPorPosicion grupos={porPosicion(datos, "pesoActual")} unidad="kg" />
          </div>
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
                <Th orden={orden} columna="nombre" className={styles.izq} style={{ minWidth: 120 }}>
                  Jugador
                </Th>
                <Th orden={orden} columna="posicion" className={styles.izq} style={{ minWidth: 50 }}>
                  Pos
                </Th>
                <Th orden={orden} columna="altura" className={styles.der} style={{ minWidth: 50 }}>
                  Altura
                </Th>
                <Th orden={orden} columna="pesoActual" className={styles.der} style={{ minWidth: 50 }}>
                  Peso
                </Th>
                <Th orden={orden} columna="deltaPeso" className={styles.der} style={{ minWidth: 50 }}>
                  Δ Peso
                </Th>
                <Th orden={orden} columna="fechaPeso" className={styles.izq} style={{ minWidth: 68 }}>
                  Fch. Peso
                </Th>
                <Th orden={orden} columna="pesoIdeal" className={styles.der} style={{ minWidth: 55 }}>
                  P. Ideal
                </Th>
                <Th orden={orden} columna="diferenciaIdeal" className={styles.der} style={{ minWidth: 55 }}>
                  Dif. Ideal
                </Th>
                <Th orden={orden} columna="sumatoria6" className={cx(styles.der, styles.fuerte)} style={{ minWidth: 60 }}>
                  Σ6 Pl.
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
                  <td className={styles.der}>{numero(f.altura)}</td>
                  <td className={styles.der}>{numero(f.pesoActual)}</td>
                  <td className={styles.der}>{f.deltaPeso != null ? <Tendencia valor={f.deltaPeso} decimales={1} /> : "—"}</td>
                  <td className={styles.fechaGris}>{fechaDiaMes(f.fechaPeso)}</td>
                  <td className={styles.der}>{numero(f.pesoIdeal)}</td>
                  <td className={styles.der}>{f.diferenciaIdeal != null ? <Tendencia valor={f.diferenciaIdeal} decimales={1} /> : "—"}</td>
                  <td className={cx(styles.der, styles.fuerte)}>{numero(f.sumatoria6)}</td>
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

function BarrasPorPosicion({ grupos, unidad }) {
  if (!grupos.length) return <div className={styles.sinDatos}>Sin datos</div>;
  const maximo = Math.max(...grupos.map((g) => g.maximo));
  return grupos.map((g) => (
    <div
      key={g.posicion}
      className={styles.filaPosicion}
      title={`${g.posicion}\nPromedio: ${numero(g.promedio)} ${unidad}\nRango: ${numero(g.minimo)} – ${numero(g.maximo)} ${unidad}\nJugadores: ${g.cantidad}`}
    >
      <span className={styles.nombrePosicion}>{g.posicion}</span>
      <div className={styles.barraPosicionFondo}>
        <div className={styles.barra} style={{ width: `${(g.promedio / maximo) * 100}%`, background: g.color, opacity: 0.65 }} />
      </div>
      <span className={styles.valorPosicion}>
        {numero(g.promedio)} {unidad}
      </span>
      <span className={styles.cantidadPosicion}>n={g.cantidad}</span>
    </div>
  ));
}

// Ficha del jugador elegido: último peso (y el cambio), peso ideal, Σ6 pliegues
// y altura; evolución del peso de este año e historial de pliegues.
function DetalleJugador({ jugador, onCerrar }) {
  const d = datosDelAnio(jugador);
  const pesosAnio = delAnioActual(jugador.pesos).filter((r) => r.peso != null);
  const pliegues = jugador.pliegues || [];
  const cifra = (rotulo, valor, unidad, color, extra) => (
    <div>
      <div className={styles.rotuloCifra}>{rotulo}</div>
      <div className={styles.valorCifra} style={{ color }}>
        {numero(valor)}
        <span className={styles.unidadCifra}> {unidad}</span>
        {extra}
      </div>
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
            {jugador.posicion || ""} · {jugador.edad != null ? `${jugador.edad} años` : ""} · {jugador.piernaHabil || ""}
          </div>
        </div>
        <div className={styles.cifras}>
          {cifra(
            "Último peso",
            d.pesoActual,
            "kg",
            VIOLETA,
            d.deltaPeso != null && (
              <span className={d.deltaPeso > 0 ? styles.baja : d.deltaPeso < 0 ? styles.sube : undefined} style={{ marginLeft: 6, fontSize: 11 }}>
                {d.deltaPeso > 0 ? "+" : ""}
                {d.deltaPeso.toFixed(1)}
              </span>
            ),
          )}
          {cifra("Peso ideal", d.pesoIdeal, "kg", "rgba(0,0,0,.55)")}
          {cifra("Σ6 Pliegues", d.sumatoria6, "mm", ROJO)}
          {cifra("Altura", jugador.altura, "cm", "rgba(0,0,0,.7)")}
        </div>
      </div>
      <div className={styles.dosColumnas} style={{ marginBottom: 0 }}>
        <div>
          <div className={styles.tituloChico}>Evolución de peso ({ANIO})</div>
          <EvolucionJugador
            series={[{ nombre: "Peso", color: VIOLETA, puntos: pesosAnio.map((r) => ({ fecha: r.fecha, valor: r.peso })) }]}
            decimales={1}
            unidad=" kg"
            ancho={400}
            alto={180}
            pad={{ t: 20, b: 30, l: 45, r: 15 }}
            formatoFecha={fechaDiaMes}
            minimoPuntos={2}
            textoVacio={`Sin datos suficientes de pesaje en ${ANIO}`}
          />
          <div className={styles.notaChica}>{pesosAnio.length} registros de pesaje</div>
        </div>
        <div>
          <div className={styles.tituloChico}>Historial de pliegues</div>
          <div className={styles.historial}>
            {pliegues.length === 0 ? (
              <div className={styles.sinMediciones}>Sin mediciones de pliegues</div>
            ) : (
              <table className={cx(styles.tabla, styles.tablaChica)}>
                <thead>
                  <tr>
                    <th className={styles.izq}>Fecha</th>
                    <th className={styles.der}>Peso</th>
                    <th className={styles.der}>Σ6 Pl.</th>
                    <th className={styles.der}>P. Ideal</th>
                  </tr>
                </thead>
                <tbody>
                  {[...pliegues].reverse().map((r, i) => (
                    <tr key={i}>
                      <td>{r.fecha || "—"}</td>
                      <td className={styles.der}>{numero(r.peso)}</td>
                      <td className={cx(styles.der, styles.negrita)}>{numero(r.sumatoria6)}</td>
                      <td className={styles.der}>{numero(r.pesoIdeal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
