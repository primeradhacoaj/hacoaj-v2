"use client";

import { useMemo, useState } from "react";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import { ETIQUETA_PAGINA, JERARQUIA_JUGADOR } from "@/lib/data/analytics";
import styles from "./AnalyticsPanel.module.css";

const FILTROS = [
  { id: "todos", titulo: "Todos" },
  { id: "hoy", titulo: "Hoy" },
  { id: "semana", titulo: "Últimos 7 días" },
  { id: "mes", titulo: "Últimos 30 días" },
];

function etiquetaDe(pagina) {
  return ETIQUETA_PAGINA[pagina] ?? pagina;
}

function formatearDuracion(seg) {
  if (seg < 60) return `${seg}s`;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatearFechaHora(iso) {
  const fecha = new Date(iso);
  const dd = String(fecha.getDate()).padStart(2, "0");
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const hh = String(fecha.getHours()).padStart(2, "0");
  const mi = String(fecha.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${fecha.getFullYear()} ${hh}:${mi}`;
}

// Analytics del panel técnico (solo administrador), copiado de la v1: KPIs,
// uso por sección del menú del jugador, rankings y detalle de visitas.
//
// La v1 lo arma con visitas REALES que va grabando un script de tracking
// (`/static/tracker.js`) en cada carga de página. v2 todavía no hace ese
// tracking (no hay base de datos ni usuarios reales) — `visitas` son datos
// de prueba de los 3 usuarios de prueba, con la forma que va a tener la
// tabla real. Simplificado frente a la v1: sin las columnas "Query" y
// "Desde" (no las genera el tracker todavía).
export default function AnalyticsPanel({ visitas }) {
  const [filtro, setFiltro] = useState("todos");
  const [abiertas, setAbiertas] = useState(() => new Set());

  const filtradas = useMemo(() => {
    if (filtro === "todos") return visitas;
    const ahora = new Date();
    const limite = new Date(ahora);
    if (filtro === "hoy") limite.setHours(0, 0, 0, 0);
    if (filtro === "semana") limite.setDate(limite.getDate() - 7);
    if (filtro === "mes") limite.setDate(limite.getDate() - 30);
    return visitas.filter((v) => new Date(v.timestamp) >= limite);
  }, [visitas, filtro]);

  const stats = useMemo(() => {
    const usuarios = new Set(filtradas.map((v) => v.usuario));
    const paginas = new Set(filtradas.map((v) => v.pagina));
    const duraciones = filtradas.map((v) => v.duracion_seg);
    const promedio = duraciones.length
      ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length)
      : 0;
    const desde = filtradas.length ? filtradas[filtradas.length - 1].timestamp.slice(0, 10) : "";
    return { total: filtradas.length, usuarios: usuarios.size, paginas: paginas.size, promedio, desde };
  }, [filtradas]);

  const { topPaginas, topUsuarios } = useMemo(() => {
    const porPagina = new Map();
    const porUsuario = new Map();
    for (const v of filtradas) {
      porPagina.set(v.pagina, (porPagina.get(v.pagina) ?? 0) + 1);
      porUsuario.set(v.usuario, (porUsuario.get(v.usuario) ?? 0) + 1);
    }
    const orden = (mapa) => [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { topPaginas: orden(porPagina), topUsuarios: orden(porUsuario) };
  }, [filtradas]);

  const jerarquia = useMemo(() => {
    const deJugadores = filtradas.filter((v) => v.rol === "jugador");
    const secciones = JERARQUIA_JUGADOR.map((seccion) => {
      const rutas = [seccion.hub, ...seccion.hijos.map((h) => h.path)];
      const filas = deJugadores.filter((v) => rutas.includes(v.pagina));
      const hijos = seccion.hijos.map((hijo) => {
        const filasHijo = deJugadores.filter((v) => v.pagina === hijo.path);
        return {
          ...hijo,
          visitas: filasHijo.length,
          segundos: filasHijo.reduce((a, v) => a + v.duracion_seg, 0),
        };
      });
      return {
        ...seccion,
        visitas: filas.length,
        segundos: filas.reduce((a, v) => a + v.duracion_seg, 0),
        hijos,
      };
    });
    const maximo = Math.max(1, ...secciones.map((s) => s.visitas));
    return { secciones, maximo, hayDatos: deJugadores.length > 0 };
  }, [filtradas]);

  const alternar = (clave) => {
    setAbiertas((antes) => {
      const ahora = new Set(antes);
      if (ahora.has(clave)) ahora.delete(clave);
      else ahora.add(clave);
      return ahora;
    });
  };

  const filas = filtradas.slice(0, 300);

  return (
    <>
      <p className={styles.descripcion}>
        Actividad de los usuarios en la app: páginas visitadas, duración y frecuencia de uso. Las
        visitas del rol administrador no se incluyen en estas estadísticas.
      </p>

      <h2 className={styles.rotulo}>Resumen</h2>
      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Total visitas</div>
          <div className={styles.valorKpi}>{stats.total}</div>
          {stats.desde && <div className={styles.notaKpi}>desde {stats.desde}</div>}
        </div>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Usuarios únicos</div>
          <div className={styles.valorKpi}>{stats.usuarios}</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Páginas distintas</div>
          <div className={styles.valorKpi}>{stats.paginas}</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Duración promedio</div>
          <div className={styles.valorKpi}>
            {stats.promedio}
            <span className={styles.unidadKpi}>seg</span>
          </div>
        </div>
      </div>

      <h2 className={styles.rotulo}>Uso por sección — Jugadores</h2>
      <p className={styles.nota}>
        Agrupado según como lo ve el jugador en su menú. Cada tarjeta suma las visitas de esa
        sección y lo que tiene adentro. Tocá una tarjeta para ver el detalle.
      </p>
      {!jerarquia.hayDatos ? (
        <div className={styles.vacio}>No hay visitas de jugadores registradas en este período.</div>
      ) : (
        <div className={styles.listaJerarquia}>
          {jerarquia.secciones.map((s) => {
            const abierta = abiertas.has(s.clave);
            const pct = Math.round((s.visitas / jerarquia.maximo) * 100);
            const maxHijo = Math.max(1, ...s.hijos.map((h) => h.visitas));
            return (
              <div key={s.clave} className={styles.tarjetaJerarquia}>
                <button type="button" className={styles.cabeceraJerarquia} onClick={() => alternar(s.clave)}>
                  <span className={styles.iconoSeccion}>{s.icono}</span>
                  <span className={styles.infoSeccion}>
                    <span className={styles.nombreSeccion}>{s.etiqueta}</span>
                    <span className={styles.barraTrack}>
                      <span className={styles.barraFill} style={{ width: `${pct}%` }} />
                    </span>
                  </span>
                  <span className={styles.statsSeccion}>
                    <span className={styles.visitasSeccion}>{s.visitas}</span>
                    <span className={styles.tiempoSeccion}>{formatearDuracion(s.segundos)}</span>
                  </span>
                  <Icono
                    nombre="flecha"
                    tamano={16}
                    strokeWidth={2}
                    className={cx(styles.chevron, abierta && styles.chevronAbierto)}
                  />
                </button>
                {abierta && (
                  <div className={styles.hijos}>
                    {s.hijos.map((h) => (
                      <div key={h.path} className={styles.filaHijo}>
                        <span className={styles.nombreHijo}>{h.etiqueta}</span>
                        <span className={styles.barraTrackChica}>
                          <span
                            className={styles.barraFillChica}
                            style={{ width: `${Math.round((h.visitas / maxHijo) * 100)}%` }}
                          />
                        </span>
                        <span className={styles.statsHijo}>
                          {h.visitas} visitas · {formatearDuracion(h.segundos)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <h2 className={styles.rotulo}>Rankings generales</h2>
      <div className={styles.rankings}>
        <div className={styles.tarjetaRanking}>
          <h3 className={styles.tituloRanking}>Páginas más visitadas</h3>
          {topPaginas.length === 0 ? (
            <p className={styles.vacioChico}>Sin datos</p>
          ) : (
            topPaginas.map(([pagina, cantidad]) => (
              <div key={pagina} className={styles.filaRankingItem}>
                <span>{etiquetaDe(pagina)}</span>
                <span className={styles.valorRankingItem}>{cantidad}</span>
              </div>
            ))
          )}
        </div>
        <div className={styles.tarjetaRanking}>
          <h3 className={styles.tituloRanking}>Usuarios más activos</h3>
          {topUsuarios.length === 0 ? (
            <p className={styles.vacioChico}>Sin datos</p>
          ) : (
            topUsuarios.map(([usuario, cantidad]) => (
              <div key={usuario} className={styles.filaRankingItem}>
                <span>{usuario}</span>
                <span className={styles.valorRankingItem}>{cantidad}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <h2 className={styles.rotulo}>Filtros</h2>
      <div className={styles.filtros}>
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={cx(styles.chip, filtro === f.id && styles.chipActivo)}
            onClick={() => setFiltro(f.id)}
          >
            {f.titulo}
          </button>
        ))}
      </div>

      <h2 className={styles.rotulo}>Detalle de visitas</h2>
      <div className={styles.tablaWrap}>
        <div className={styles.scroll}>
          <table>
            <thead>
              <tr>
                <th>Fecha/Hora</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Página</th>
                <th className={styles.num}>Duración</th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.vacioTabla}>No hay visitas registradas</td>
                </tr>
              ) : (
                filas.map((v, indice) => (
                  <tr key={indice}>
                    <td>{formatearFechaHora(v.timestamp)}</td>
                    <td>{v.usuario}</td>
                    <td>{v.rol}</td>
                    <td>{etiquetaDe(v.pagina)}</td>
                    <td className={styles.num}>{v.duracion_seg}s</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtradas.length > filas.length && (
          <div className={styles.pieTabla}>Mostrando los {filas.length} más recientes de {filtradas.length}</div>
        )}
      </div>
    </>
  );
}
