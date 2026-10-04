"use client";

import { useMemo, useState } from "react";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import { exportarTorneoPlantel } from "@/lib/exportarAnalisisPlantel";
import BarChart from "./BarChart";
import comunes from "./AnalisisComun.module.css";
import propio from "./TorneoPlantel.module.css";

const styles = { ...comunes, ...propio };

const inicialesDe = (nombre) => nombre.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("").toUpperCase();

// Los 11 puestos de cada formación, en el orden de la cancha (de atrás para adelante).
// Son los códigos que se cargan en "Posición" de cada jugador del partido. Las
// formaciones que no están acá usan la 4-4-2, igual que la v1.
const PUESTOS_POR_FORMACION = {
  "442": ["PO", "DFD", "DFC", "DFC", "DFI", "MD", "MC", "MC", "MI", "DC", "DC"],
  "433": ["PO", "DFD", "DFC", "DFC", "DFI", "MC", "MC", "MC", "ED", "DC", "EI"],
  "4231": ["PO", "DFD", "DFC", "DFC", "DFI", "MCD", "MCD", "MD", "MC", "MI", "DC"],
  "352": ["PO", "DFC", "DFC", "DFC", "MD", "MC", "MC", "MC", "MI", "DC", "DC"],
};

// Cuántos goles cayeron en cada tramo del partido (90' dividido en `divisiones`).
function golesPorTramo(minutos, divisiones) {
  const segmento = 90 / divisiones;
  const cuenta = new Array(divisiones).fill(0);
  for (const minuto of minutos) {
    const indice = Math.min(Math.floor((minuto - 1) / segmento), divisiones - 1);
    if (indice >= 0) cuenta[indice]++;
  }
  return cuenta;
}

function etiquetasDeTramos(divisiones) {
  const segmento = 90 / divisiones;
  return Array.from({ length: divisiones }, (_, i) => {
    const desde = Math.round(i * segmento) + 1;
    const hasta = i === divisiones - 1 ? "90+" : Math.round((i + 1) * segmento);
    return `${desde}-${hasta}'`;
  });
}

// Pestaña "Promocional 2026" del Dashboard de análisis: cómo le va a Hacoaj en el torneo.
// Copiada de la v1: filtros (posición, condición, jugadores), KPIs del equipo, minutos
// jugados (titular/suplente), goles/asistencias/tarjetas (totales o cada 90 minutos),
// distribución de goles por tramo del partido, combinación ideal de gol, parejas de
// cambio y equipo ideal. Al final, la tabla completa del plantel con su exportación.
export default function TorneoPlantel({
  equipo,
  stats,
  kpis,
  jugadores,
  posiciones,
  goles,
  cambiosTop,
  combinacionesGol,
  formacionMasUsada,
}) {
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [filtroPosiciones, setFiltroPosiciones] = useState([]);
  const [filtroCondicion, setFiltroCondicion] = useState("");
  const [filtroJugadores, setFiltroJugadores] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [modoBarras, setModoBarras] = useState("total");
  const [modoMinutos, setModoMinutos] = useState("todos");
  const [divisiones, setDivisiones] = useState(3);

  const filtrados = useMemo(() => {
    let lista = jugadores;
    if (filtroJugadores.length) lista = lista.filter((j) => filtroJugadores.includes(j.nombre));
    if (filtroPosiciones.length) lista = lista.filter((j) => filtroPosiciones.includes(j.posicion));
    // Igual que en la v1: con "Local"/"Visitante" quedan los que jugaron alguna vez de esa
    // condición (los totales siguen siendo los de toda la temporada).
    if (filtroCondicion) lista = lista.filter((j) => j.condiciones.includes(filtroCondicion));
    return lista;
  }, [jugadores, filtroJugadores, filtroPosiciones, filtroCondicion]);

  const cantidadFiltros = (filtroJugadores.length ? 1 : 0) + (filtroPosiciones.length ? 1 : 0) + (filtroCondicion ? 1 : 0);
  const alternar = (lista, setLista, valor) =>
    setLista(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);
  const limpiarFiltros = () => {
    setFiltroPosiciones([]);
    setFiltroJugadores([]);
    setFiltroCondicion("");
    setBusqueda("");
  };

  const textoBusqueda = busqueda.toLowerCase().trim();
  const nombresVisibles = jugadores
    .filter(
      (j) =>
        !textoBusqueda ||
        j.nombre.toLowerCase().includes(textoBusqueda) ||
        j.nombreCorto.toLowerCase().includes(textoBusqueda),
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  // ── Datos de los gráficos ──
  const porNoventa = modoBarras === "por90";
  const barras = (campo) =>
    filtrados
      .filter((j) => j[campo] > 0)
      .sort((a, b) => b[campo] - a[campo])
      .map((j) => ({
        etiqueta: j.nombreCorto,
        valor: porNoventa ? (j.minutos > 0 ? Number(((j[campo] / j.minutos) * 90).toFixed(2)) : 0) : j[campo],
      }));

  const minutos = filtrados
    .filter((j) => j.minutos > 0)
    .map((j) => ({ etiqueta: j.nombreCorto, titular: j.minutosTitular, suplente: j.minutosSuplente }))
    .filter((d) => (modoMinutos === "titular" ? d.titular > 0 : modoMinutos === "suplente" ? d.suplente > 0 : true))
    .sort((a, b) => {
      const valor = (d) => (modoMinutos === "titular" ? d.titular : modoMinutos === "suplente" ? d.suplente : d.titular + d.suplente);
      return valor(b) - valor(a);
    });

  const tramosFavor = golesPorTramo(goles.favor, divisiones);
  const tramosContra = golesPorTramo(goles.contra, divisiones);

  // Equipo ideal: para cada puesto de la formación más usada, el jugador con más minutos ahí.
  const puestos = PUESTOS_POR_FORMACION[formacionMasUsada.replace(/-/g, "")] ?? PUESTOS_POR_FORMACION["442"];
  const usados = new Set();
  const equipoIdeal = puestos.map((puesto) => {
    const elegido = filtrados
      .filter((j) => !usados.has(j.nombre) && (j.posicionesPartido[puesto] ?? 0) > 0)
      .sort((a, b) => (b.minutosPorPosicion[puesto] ?? 0) - (a.minutosPorPosicion[puesto] ?? 0))[0];
    if (elegido) usados.add(elegido.nombre);
    return { puesto, jugador: elegido ?? null };
  });

  return (
    <>
      <div className={cx(styles.tarjeta, styles.tarjetaFiltros)}>
        <div className={styles.cabeceraFiltros}>
          <button
            type="button"
            className={styles.botonFiltros}
            onClick={() => setFiltrosAbiertos((abiertos) => !abiertos)}
            aria-expanded={filtrosAbiertos}
          >
            <Icono nombre="filtro" tamano={16} strokeWidth={1.8} />
            <span>Filtros</span>
            {cantidadFiltros > 0 && <span className={styles.contadorFiltros}>{cantidadFiltros}</span>}
            <span className={cx(styles.flechaFiltros, filtrosAbiertos && styles.flechaArriba)}>
              <Icono nombre="flechaAbajo" tamano={14} strokeWidth={2} />
            </span>
          </button>
          <button type="button" className={styles.botonExportar} onClick={() => exportarTorneoPlantel(equipo, stats, filtrados)}>
            <Icono nombre="descargar" tamano={14} strokeWidth={2} />
            Exportar tabla
          </button>
        </div>

        {filtrosAbiertos && (
          <div className={styles.gruposFiltros}>
            <div className={styles.grupoFiltro}>
              <div className={styles.rotuloGrupo}>Posición</div>
              <div className={styles.botonesFiltro}>
                {posiciones.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={cx(styles.chip, filtroPosiciones.includes(p) && styles.chipFiltroActivo)}
                    onClick={() => alternar(filtroPosiciones, setFiltroPosiciones, p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.grupoFiltro}>
              <div className={styles.rotuloGrupo}>Condición</div>
              <div className={styles.botonesFiltro}>
                {[
                  ["", "Todos"],
                  ["Local", "Local"],
                  ["Visitante", "Visitante"],
                ].map(([valor, texto]) => (
                  <button
                    key={texto}
                    type="button"
                    className={cx(styles.chip, filtroCondicion === valor && styles.chipFiltroActivo)}
                    onClick={() => setFiltroCondicion(valor)}
                  >
                    {texto}
                  </button>
                ))}
              </div>
            </div>
            <div className={cx(styles.grupoFiltro, styles.grupoAncho)}>
              <div className={styles.rotuloGrupo}>Jugadores</div>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar jugador…"
                aria-label="Buscar jugador"
                className={styles.buscador}
              />
              <div className={cx(styles.botonesFiltro, styles.listaJugadores)}>
                {nombresVisibles.map((j) => (
                  <button
                    key={j.nombre}
                    type="button"
                    className={cx(styles.chip, filtroJugadores.includes(j.nombre) && styles.chipFiltroActivo)}
                    onClick={() => alternar(filtroJugadores, setFiltroJugadores, j.nombre)}
                  >
                    {j.nombreCorto}
                  </button>
                ))}
              </div>
            </div>
            {cantidadFiltros > 0 && (
              <button type="button" className={cx(styles.chip, styles.limpiarFiltros)} onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Puntos / partido</div>
          <div className={styles.valorKpi}>
            {kpis.puntosPartido}
            <span className={styles.unidadKpi}>pp</span>
          </div>
          <div className={styles.pieKpi}>{stats.pj} partidos</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Goles a favor / partido</div>
          <div className={styles.valorKpi}>
            {kpis.golesPartido}
            <span className={styles.unidadKpi}>gf/p</span>
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Goles en contra / partido</div>
          <div className={styles.valorKpi}>
            {kpis.golesContraPartido}
            <span className={styles.unidadKpi}>gc/p</span>
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Índice de rotación</div>
          <div className={styles.valorKpi}>
            {kpis.rotacion}
            <span className={styles.unidadKpi}>%</span>
          </div>
          <div className={styles.pieKpi}>Top 11 jugadores</div>
        </div>
      </div>

      <div className={styles.tarjeta}>
        <div className={styles.tituloTarjeta}>Minutos jugados</div>
        <div className={styles.modos}>
          {[
            ["todos", "Todos"],
            ["titular", "Titular"],
            ["suplente", "Suplente"],
          ].map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              className={cx(styles.chip, modoMinutos === valor && styles.chipActivo)}
              onClick={() => setModoMinutos(valor)}
            >
              {texto}
            </button>
          ))}
        </div>
        {modoMinutos === "todos" && (
          <div className={styles.leyendaLinea}>
            <span>
              <span className={styles.puntoLeyenda} style={{ background: "#00296b" }} /> Titular
            </span>
            <span>
              <span className={styles.puntoLeyenda} style={{ background: "#3b82f6" }} /> Suplente
            </span>
          </div>
        )}
        <MinutosChart datos={minutos} modo={modoMinutos} />
      </div>

      <div className={styles.modos}>
        {[
          ["total", "Total"],
          ["por90", "Cada 90 min"],
        ].map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            className={cx(styles.chip, styles.chipModo, modoBarras === valor && styles.chipActivo)}
            onClick={() => setModoBarras(valor)}
          >
            {texto}
          </button>
        ))}
      </div>

      <div className={styles.filaTres}>
        <div className={styles.tarjeta}>
          <div className={styles.tituloTarjeta}>Goles</div>
          <div className={styles.subtituloTarjeta}>{porNoventa ? "Cada 90 minutos" : "Totales por jugador"}</div>
          <BarChart datos={barras("goles")} color="#00296b" alto={220} decimales={porNoventa ? 2 : 0} decimalesEjes={porNoventa ? 2 : 0} />
        </div>
        <div className={styles.tarjeta}>
          <div className={styles.tituloTarjeta}>Asistencias</div>
          <div className={styles.subtituloTarjeta}>{porNoventa ? "Cada 90 minutos" : "Totales por jugador"}</div>
          <BarChart datos={barras("asistencias")} color="#3b82f6" alto={220} decimales={porNoventa ? 2 : 0} decimalesEjes={porNoventa ? 2 : 0} />
        </div>
        <div className={styles.tarjeta}>
          <div className={styles.tituloTarjeta}>Tarjetas amarillas</div>
          <div className={styles.subtituloTarjeta}>{porNoventa ? "Cada 90 minutos" : "Por jugador"}</div>
          <BarChart datos={barras("amarillas")} color="#d97706" alto={220} decimales={porNoventa ? 2 : 0} decimalesEjes={porNoventa ? 2 : 0} />
        </div>
      </div>

      <div className={styles.filaDosColumnas}>
        <div className={styles.tarjeta}>
          <div className={styles.tituloTarjeta}>Distribución de goles</div>
          <div className={styles.modos}>
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                className={cx(styles.chip, divisiones === n && styles.chipActivo)}
                onClick={() => setDivisiones(n)}
                aria-label={`Dividir el partido en ${n} tramos`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className={styles.leyendaLinea}>
            <span>
              <span className={styles.puntoLeyenda} style={{ background: "#0e8a4f" }} /> A favor
            </span>
            <span>
              <span className={styles.puntoLeyenda} style={{ background: "#c2410c" }} /> En contra
            </span>
          </div>
          <TramosChart favor={tramosFavor} contra={tramosContra} etiquetas={etiquetasDeTramos(divisiones)} />
        </div>

        <div className={styles.tarjeta}>
          <div className={styles.tituloTarjeta}>Combinación ideal de gol</div>
          <div className={styles.subtituloTarjeta}>Asistidor → Goleador más frecuente</div>
          <MiniTabla
            columnas={["Combinación", "Veces"]}
            filas={combinacionesGol.map(([clave, veces]) => [clave, veces])}
            vacio="Sin datos de asistencias"
          />
        </div>
      </div>

      <div className={styles.filaDosColumnas}>
        <div className={styles.tarjeta}>
          <div className={styles.tituloTarjeta}>Parejas de cambio más frecuentes</div>
          <div className={styles.subtituloTarjeta}>Sale → Entra</div>
          <MiniTabla columnas={["Cambio", "Veces"]} filas={cambiosTop.map(([clave, veces]) => [clave, veces])} vacio="Sin datos" />
        </div>

        <div className={styles.tarjeta}>
          <div className={styles.tituloTarjeta}>Equipo ideal</div>
          <div className={styles.subtituloTarjeta}>
            Formación más usada: <strong>{formacionMasUsada || "—"}</strong>
          </div>
          <table className={styles.miniTabla}>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Jugador</th>
                <th className={styles.centro}>Min</th>
                <th className={styles.centro}>PJ</th>
              </tr>
            </thead>
            <tbody>
              {equipoIdeal.map(({ puesto, jugador }, indice) => (
                <tr key={`${puesto}-${indice}`}>
                  <td className={styles.puestoIdeal}>{puesto}</td>
                  {jugador ? (
                    <>
                      <td>{jugador.nombreCorto}</td>
                      <td className={styles.centro}>{jugador.minutosPorPosicion[puesto] ?? 0}</td>
                      <td className={styles.centro}>{jugador.posicionesPartido[puesto] ?? 0}</td>
                    </>
                  ) : (
                    <>
                      <td className={styles.sinJugador}>—</td>
                      <td />
                      <td />
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TablaJugadores equipo={equipo} jugadores={filtrados} />
    </>
  );
}

function MiniTabla({ columnas, filas, vacio }) {
  return (
    <table className={styles.miniTabla}>
      <thead>
        <tr>
          <th>{columnas[0]}</th>
          <th className={styles.centro}>{columnas[1]}</th>
        </tr>
      </thead>
      <tbody>
        {filas.length > 0 ? (
          filas.map(([clave, veces]) => (
            <tr key={clave}>
              <td>{clave}</td>
              <td className={cx(styles.centro, styles.negrita)}>{veces}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={2} className={cx(styles.centro, styles.sinJugador)}>
              {vacio}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// Barras apiladas de minutos (titular abajo, suplente arriba), o una sola serie.
function MinutosChart({ datos, modo }) {
  if (datos.length === 0) {
    return <div className={styles.sinDatos}>Sin datos</div>;
  }
  const valorDe = (d) => (modo === "titular" ? d.titular : modo === "suplente" ? d.suplente : d.titular + d.suplente);
  const maximo = Math.max(...datos.map(valorDe), 1);
  const ancho = 700;
  const alto = 220;
  const anchoBarra = Math.min(28, (ancho - 40) / datos.length - 4);
  const altoGrafico = alto - 50;
  const inicioX = 40;
  const anchoTotal = Math.max(ancho, inicioX + datos.length * (anchoBarra + 4) + 10);

  return (
    <svg width="100%" viewBox={`0 0 ${anchoTotal} ${alto}`} style={{ display: "block" }}>
      {Array.from({ length: 5 }, (_, i) => {
        const y = 10 + (altoGrafico / 4) * i;
        return (
          <g key={i}>
            <line x1={inicioX} y1={y} x2={inicioX + datos.length * (anchoBarra + 4)} y2={y} stroke="#eceef2" />
            <text x={inicioX - 4} y={y + 3} fill="rgba(0,0,0,.45)" fontSize="10" textAnchor="end">
              {Math.round(maximo - (maximo / 4) * i)}
            </text>
          </g>
        );
      })}
      {datos.map((d, i) => {
        const x = inicioX + i * (anchoBarra + 4) + 2;
        const total = valorDe(d);
        const altoTotal = (total / maximo) * altoGrafico;
        const altoTitular = (d.titular / maximo) * altoGrafico;
        const etiqueta = d.etiqueta.length > 12 ? `${d.etiqueta.slice(0, 11)}…` : d.etiqueta;
        return (
          <g key={d.etiqueta}>
            {modo === "todos" ? (
              <>
                <rect x={x} y={10 + altoGrafico - altoTotal} width={anchoBarra} height={altoTitular} fill="#00296b" rx="2" />
                <rect x={x} y={10 + altoGrafico - (altoTotal - altoTitular)} width={anchoBarra} height={altoTotal - altoTitular} fill="#3b82f6" rx="2" />
              </>
            ) : (
              <rect x={x} y={10 + altoGrafico - altoTotal} width={anchoBarra} height={altoTotal} fill={modo === "titular" ? "#00296b" : "#3b82f6"} rx="2" />
            )}
            <text x={x + anchoBarra / 2} y={10 + altoGrafico - altoTotal - 4} fill="rgba(0,0,0,.7)" fontSize="9" textAnchor="middle">
              {total}
            </text>
            <text
              x={x + anchoBarra / 2}
              y={10 + altoGrafico + 12}
              fill="rgba(0,0,0,.6)"
              fontSize="9"
              textAnchor="middle"
              transform={`rotate(-35 ${x + anchoBarra / 2} ${10 + altoGrafico + 12})`}
            >
              {etiqueta}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Goles a favor y en contra por tramo del partido.
function TramosChart({ favor, contra, etiquetas }) {
  const tramos = etiquetas.length;
  const maximo = Math.max(...favor, ...contra, 1);
  const alto = 280;
  const anchoGrupo = Math.min(80, (500 - 60) / tramos - 10);
  const anchoBarra = (anchoGrupo - 4) / 2;
  const altoGrafico = alto - 50;
  const inicioX = 40;
  const ancho = Math.max(500, inicioX + tramos * (anchoGrupo + 10) + 10);

  return (
    <svg width="100%" viewBox={`0 0 ${ancho} ${alto}`} style={{ display: "block" }}>
      {Array.from({ length: 5 }, (_, i) => {
        const y = 10 + (altoGrafico / 4) * i;
        return (
          <g key={i}>
            <line x1={inicioX} y1={y} x2={inicioX + tramos * (anchoGrupo + 10)} y2={y} stroke="#eceef2" />
            <text x={inicioX - 4} y={y + 3} fill="rgba(0,0,0,.45)" fontSize="10" textAnchor="end">
              {Math.round(maximo - (maximo / 4) * i)}
            </text>
          </g>
        );
      })}
      {etiquetas.map((etiqueta, i) => {
        const x = inicioX + i * (anchoGrupo + 10) + 5;
        const altoFavor = (favor[i] / maximo) * altoGrafico;
        const altoContra = (contra[i] / maximo) * altoGrafico;
        return (
          <g key={etiqueta}>
            <rect x={x} y={10 + altoGrafico - altoFavor} width={anchoBarra} height={altoFavor} fill="#0e8a4f" rx="3" />
            <rect x={x + anchoBarra + 4} y={10 + altoGrafico - altoContra} width={anchoBarra} height={altoContra} fill="#c2410c" rx="3" />
            {favor[i] > 0 && (
              <text x={x + anchoBarra / 2} y={10 + altoGrafico - altoFavor - 3} fill="#0e8a4f" fontSize="10" textAnchor="middle" fontWeight="600">
                {favor[i]}
              </text>
            )}
            {contra[i] > 0 && (
              <text x={x + anchoBarra + 4 + anchoBarra / 2} y={10 + altoGrafico - altoContra - 3} fill="#c2410c" fontSize="10" textAnchor="middle" fontWeight="600">
                {contra[i]}
              </text>
            )}
            <text x={x + anchoGrupo / 2} y={10 + altoGrafico + 16} fill="rgba(0,0,0,.6)" fontSize={tramos > 4 ? 9 : 11} textAnchor="middle" fontWeight="500">
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
        <div className={styles.subtituloTarjeta}>{jugadores.length} jugadores · temporada 2026</div>
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
              <th>Asist.</th>
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
                <td>{j.asistencias}</td>
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
