import {
  cambiosFuerzaRelativa,
  distribucionPorPosicion,
  medicionesVencidas,
  promedioAnioActual,
  promedioPrimerRegistro,
  promedioUltimoRegistro,
  serieDePromedios,
  topPorFuerzaRelativa,
} from "@/lib/analisisPlantel";
import Donut from "./Donut";
import styles from "./DashboardGeneral.module.css";
import Sparkline from "./Sparkline";

const COLOR_POSICION = {
  Arquero: "#3b82f6",
  Central: "#00296b",
  Lateral: "#ed0992",
  Volante: "#0e8a4f",
  Mediocampista: "#0e8a4f",
  Delantero: "#c2410c",
};

const numero = (v, decimales = 2) => (v != null ? v.toFixed(decimales) : "—");

// Pestaña "Dashboard general": KPIs agregados del plantel, alertas y los
// rankings de fuerza relativa. Copiado de la v1.
export default function DashboardGeneral({ jugadores, posiciones }) {
  const totalJugadores = jugadores.length;

  const ultimoSent = promedioUltimoRegistro(jugadores, "fuerzaSent", "fRelativa");
  const baseSent = promedioPrimerRegistro(jugadores, "fuerzaSent", "fRelativa");
  const diffSent = ultimoSent.promedio != null && baseSent != null ? ultimoSent.promedio - baseSent : null;

  const ultimoPecho = promedioUltimoRegistro(jugadores, "fuerzaPecho", "fRelativa");
  const basePecho = promedioPrimerRegistro(jugadores, "fuerzaPecho", "fRelativa");
  const diffPecho = ultimoPecho.promedio != null && basePecho != null ? ultimoPecho.promedio - basePecho : null;

  const promedioPliegues = promedioAnioActual(jugadores, "pliegues", "sumatoria6").promedio;

  const pesos = jugadores.map((j) => j.peso).filter((p) => p != null && p > 0);
  const promedioPeso = pesos.length ? pesos.reduce((s, v) => s + v, 0) / pesos.length : null;
  const alturas = jugadores.map((j) => j.altura).filter(Boolean);
  const promedioAltura = alturas.length ? alturas.reduce((s, v) => s + v, 0) / alturas.length : null;
  const edades = jugadores.map((j) => j.edad).filter(Boolean);
  const promedioEdad = edades.length ? edades.reduce((s, v) => s + v, 0) / edades.length : null;

  const vencidas = medicionesVencidas(jugadores);
  const cambiosSent = cambiosFuerzaRelativa(jugadores, "fuerzaSent");
  const cambiosPecho = cambiosFuerzaRelativa(jugadores, "fuerzaPecho");
  const mejorasSent = cambiosSent.filter((c) => c.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
  const caidasSent = cambiosSent.filter((c) => c.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);
  const mejorasPecho = cambiosPecho.filter((c) => c.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
  const caidasPecho = cambiosPecho.filter((c) => c.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);
  const hayCambios = mejorasSent.length + caidasSent.length + mejorasPecho.length + caidasPecho.length > 0;

  const distribucion = distribucionPorPosicion(jugadores);
  const ordenPosiciones = ["Arquero", "Central", "Lateral", "Volante", "Mediocampista", "Delantero"];
  const datosDonut = [...distribucion.entries()]
    .sort(([a], [b]) => ordenPosiciones.indexOf(a) - ordenPosiciones.indexOf(b))
    .map(([etiqueta, valor]) => ({ etiqueta, valor, color: COLOR_POSICION[etiqueta] ?? "#666" }));

  const topSentadilla = topPorFuerzaRelativa(jugadores, "fuerzaSent");
  const topPecho = topPorFuerzaRelativa(jugadores, "fuerzaPecho");

  return (
    <>
      <div className={styles.kpis}>
        <Kpi etiqueta="Plantel" valor={totalJugadores} unidad="jugadores" />
        <Kpi
          etiqueta="F. Relativa Sent. (prom)"
          diferencia={diffSent}
          valor={numero(ultimoSent.promedio)}
          unidad="kg/kg"
          nota={`Baseline: ${numero(baseSent)} · Objetivo: 1.8 – 2.0`}
          pie="Prom. último registro por jugador"
        >
          <Sparkline datos={serieDePromedios(jugadores, "fuerzaSent", "fRelativa")} color="#0e8a4f" />
        </Kpi>
        <Kpi
          etiqueta="F. Relativa Pecho (prom)"
          diferencia={diffPecho}
          valor={numero(ultimoPecho.promedio)}
          unidad="kg/kg"
          nota={`Baseline: ${numero(basePecho)} · Objetivo: 1.3`}
          pie="Prom. último registro por jugador"
        >
          <Sparkline datos={serieDePromedios(jugadores, "fuerzaPecho", "fRelativa")} color="#00296b" />
        </Kpi>
        <Kpi
          etiqueta="Σ 6 Pliegues (prom)"
          valor={numero(promedioPliegues, 1)}
          unidad="mm"
          pie="Prom. último registro por jugador"
        />
      </div>

      <div className={styles.kpisFila2}>
        <Kpi etiqueta="Peso promedio" valor={numero(promedioPeso, 1)} unidad="kg" pie="Último registro por jugador" />
        <Kpi etiqueta="Altura promedio" valor={numero(promedioAltura, 1)} unidad="cm" />
        <Kpi etiqueta="Edad promedio" valor={numero(promedioEdad, 1)} unidad="años" />
      </div>

      {(vencidas.length > 0 || hayCambios) && (
        <div className={styles.alertas}>
          {vencidas.length > 0 && (
            <div className={styles.tarjetaVencidas}>
              <div className={styles.tituloVencidas}>
                <span>⚠️</span>
                <span className={styles.tituloVencidasTexto}>Mediciones vencidas</span>
                <span className={styles.notaVencidas}>(+2 meses sin medir)</span>
              </div>
              <div className={styles.listaVencidas}>
                {vencidas.map((v) => (
                  <div key={v.nombre} className={styles.filaVencida}>
                    <span>🔸</span>
                    <span className={styles.nombreVencida}>{v.nombre}</span>
                    <span className={styles.detalleVencida}>{v.detalle}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hayCambios && (
            <div className={styles.filaCambios}>
              <TarjetaCambios titulo="Cambios F. Relativa Sentadilla" mejoras={mejorasSent} caidas={caidasSent} color="#0e8a4f" />
              <TarjetaCambios titulo="Cambios F. Relativa Pecho" mejoras={mejorasPecho} caidas={caidasPecho} color="#00296b" />
            </div>
          )}
        </div>
      )}

      <div className={styles.filaInferior}>
        <div className={`${styles.tarjeta} ${styles.tarjetaDonut}`}>
          <div className={styles.tituloTarjeta}>Distribución por posición</div>
          <div className={styles.subtituloTarjeta}>{totalJugadores} jugadores</div>
          <div className={styles.filaDonut}>
            <Donut datos={datosDonut} />
            <div className={styles.leyenda}>
              {datosDonut.map((d) => (
                <div key={d.etiqueta} className={styles.filaLeyenda}>
                  <span className={styles.puntoLeyenda} style={{ background: d.color }} />
                  <span className={styles.etiquetaLeyenda}>{d.etiqueta}</span>
                  <span className={styles.cantidadLeyenda}>{d.valor}</span>
                  <span className={styles.porcentajeLeyenda}>{Math.round((d.valor / totalJugadores) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <TarjetaRanking titulo="Top F. Relativa Sentadilla" lista={topSentadilla} color="#0e8a4f" />
        <TarjetaRanking titulo="Top F. Relativa Pecho" lista={topPecho} color="#00296b" />
      </div>
    </>
  );
}

function Kpi({ etiqueta, diferencia, valor, unidad, nota, pie, children }) {
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
      {pie && <div className={styles.pieKpi}>{pie}</div>}
      {children && <div className={styles.sparklineKpi}>{children}</div>}
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

function TarjetaCambios({ titulo, mejoras, caidas, color }) {
  return (
    <div className={styles.tarjeta} style={{ borderLeft: `3px solid ${color}` }}>
      <div className={styles.tituloTarjetaChico}>{titulo}</div>
      {mejoras.length > 0 && (
        <>
          <div className={styles.subEtiqueta}>Mejoras</div>
          {mejoras.map((c) => (
            <FilaCambio key={c.nombre} item={c} />
          ))}
        </>
      )}
      {caidas.length > 0 && (
        <>
          <div className={styles.subEtiqueta}>Caídas</div>
          {caidas.map((c) => (
            <FilaCambio key={c.nombre} item={c} />
          ))}
        </>
      )}
    </div>
  );
}

function FilaCambio({ item }) {
  const sube = item.delta > 0;
  return (
    <div className={styles.filaCambio}>
      <span>{sube ? "📈" : "📉"}</span>
      <span className={styles.nombreCambio}>{item.nombre}</span>
      <span className={`${sube ? styles.tendenciaSube : styles.tendenciaBaja} ${styles.deltaCambio}`}>
        {sube ? "+" : ""}
        {item.delta.toFixed(2)}
      </span>
      <span className={styles.detalleCambio}>
        {item.anterior.toFixed(2)} → {item.actual.toFixed(2)}
      </span>
    </div>
  );
}

function TarjetaRanking({ titulo, lista, color }) {
  const maximo = lista.length ? lista[0].fRelativa : 1;
  return (
    <div className={styles.tarjeta}>
      <div className={styles.tituloTarjeta}>{titulo}</div>
      <div className={styles.subtituloTarjeta}>RM / peso corporal · último registro</div>
      {lista.length === 0 ? (
        <p className={styles.sinDatos}>Sin datos</p>
      ) : (
        lista.map((j, indice) => {
          const ancho = (j.fRelativa / maximo) * 100;
          const corto = `${j.nombre.split(" ")[0]} ${(j.nombre.split(" ")[1] || "")[0] ?? ""}.`;
          return (
            <div key={j.nombre} className={styles.filaRanking} title={`RM: ${numero(j.rm, 1)} kg · Fecha: ${j.fecha}`}>
              <span className={styles.puestoRanking}>{indice + 1}</span>
              <span className={styles.nombreRanking}>{corto}</span>
              <div className={styles.barraFondo}>
                <div className={styles.barraRelleno} style={{ width: `${ancho}%`, background: color }} />
              </div>
              <span className={styles.valorRanking}>{numero(j.fRelativa)}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
