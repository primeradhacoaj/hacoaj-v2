"use client";

import { useMemo, useState } from "react";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import { useVistas } from "@/lib/useVistas";
import styles from "./VisorEncuesta.module.css";

// "dd/mm/aaaa" → Date (para comparar contra los <input type="date">, que dan "aaaa-mm-dd").
function aFecha(fechaCorta) {
  const [dd, mm, aa] = fechaCorta.split("/").map(Number);
  return new Date(aa, mm - 1, dd);
}

// Visor de respuestas de una encuesta del plantel (wellness o post partido),
// copiado de la v1: filtros por jugador y rango de fechas, un resumen con
// números y la tabla completa, con exportación a Excel. Qué jugador ya se
// "leyó" se recuerda en este navegador (como en la v1), no en el servidor.
//
// Props:
//   storageKey   clave de localStorage para las respuestas ya vistas
//   filas        [{ jugador, fecha, clave, ...resto }] — `fecha` en "dd/mm/aaaa"
//   columnas     [{ titulo, render(fila) }]
//   estadisticas [{ titulo, valor(filas) }]
//   onExportar   (filasFiltradas) => void
export default function VisorEncuesta({ storageKey, filas, columnas, estadisticas, onExportar }) {
  const [jugador, setJugador] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [estado, setEstado] = useState("");
  const [vistas, marcarComoVistas] = useVistas(storageKey);

  const jugadores = useMemo(
    () => [...new Set(filas.map((f) => f.jugador))].sort((a, b) => a.localeCompare(b, "es")),
    [filas],
  );

  const filtradas = useMemo(() => {
    const desde = fechaDesde ? new Date(fechaDesde) : null;
    const hasta = fechaHasta ? new Date(fechaHasta) : null;
    return filas
      .filter((f) => {
        if (jugador && f.jugador !== jugador) return false;
        const fecha = aFecha(f.fecha);
        if (desde && fecha < desde) return false;
        if (hasta && fecha > hasta) return false;
        const esNuevo = !vistas.has(f.clave);
        if (estado === "nuevo" && !esNuevo) return false;
        if (estado === "visto" && esNuevo) return false;
        return true;
      })
      .sort((a, b) => aFecha(b.fecha) - aFecha(a.fecha));
  }, [filas, jugador, fechaDesde, fechaHasta, estado, vistas]);

  const hayNuevas = filtradas.some((f) => !vistas.has(f.clave));

  const limpiarFiltros = () => {
    setJugador("");
    setFechaDesde("");
    setFechaHasta("");
    setEstado("");
  };

  const marcarTodoLeido = () => {
    marcarComoVistas(filtradas.map((f) => f.clave));
  };

  return (
    <>
      <div className={styles.controles}>
        <Campo etiqueta="Jugador">
          <select value={jugador} onChange={(e) => setJugador(e.target.value)} className={styles.select}>
            <option value="">Todos los jugadores</option>
            {jugadores.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Fecha desde">
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className={styles.fecha}
          />
        </Campo>
        <Campo etiqueta="Fecha hasta">
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className={styles.fecha}
          />
        </Campo>
        <Campo etiqueta="Estado">
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className={styles.fecha}>
            <option value="">Todos</option>
            <option value="nuevo">Nuevos</option>
            <option value="visto">Ya vistos</option>
          </select>
        </Campo>
        <button type="button" className={styles.limpiar} onClick={limpiarFiltros}>
          Limpiar filtros
        </button>
      </div>

      <div className={styles.estadisticas}>
        {estadisticas.map((e) => (
          <div key={e.titulo} className={styles.tarjetaEstadistica}>
            <div className={styles.valorEstadistica}>{e.valor(filtradas)}</div>
            <div className={styles.tituloEstadistica}>{e.titulo}</div>
          </div>
        ))}
        <div className={styles.tarjetaEstadistica}>
          <div className={styles.valorEstadistica}>{filtradas.filter((f) => !vistas.has(f.clave)).length}</div>
          <div className={styles.tituloEstadistica}>Nuevos</div>
        </div>
      </div>

      <div className={styles.tabla}>
        <div className={styles.infoTabla}>
          <span>
            {filtradas.length} {filtradas.length === 1 ? "respuesta" : "respuestas"}
          </span>
          <div className={styles.botonesTabla}>
            {hayNuevas && (
              <button type="button" className={styles.botonIcono} onClick={marcarTodoLeido}>
                <Icono nombre="check" tamano={14} strokeWidth={2} />
                Marcar todo como leído
              </button>
            )}
            <button type="button" className={styles.botonIcono} onClick={() => onExportar(filtradas)}>
              <Icono nombre="descargar" tamano={14} strokeWidth={2} />
              Descargar Excel
            </button>
          </div>
        </div>

        <div className={styles.scroll}>
          {filtradas.length === 0 ? (
            <p className={styles.vacio}>No hay respuestas para estos filtros.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Estado</th>
                  {columnas.map((c) => (
                    <th key={c.titulo}>{c.titulo}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((f) => {
                  const esNuevo = !vistas.has(f.clave);
                  return (
                    <tr key={f.clave} className={cx(esNuevo && styles.filaNueva)}>
                      <td>{esNuevo ? <span className={styles.insigniaNuevo}>Nuevo</span> : "Visto"}</td>
                      {columnas.map((c) => (
                        <td key={c.titulo}>{c.render(f)}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
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
