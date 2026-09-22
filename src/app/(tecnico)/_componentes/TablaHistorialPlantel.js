"use client";

import { useMemo, useState } from "react";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import { exportarTabla } from "@/lib/exportarEncuestasPlantel";
import styles from "./TablaHistorialPlantel.module.css";

// "dd/mm/aaaa" → Date, para poder ordenar y filtrar por fecha.
function comoFecha(fechaCorta) {
  if (!fechaCorta) return null;
  const [dd, mm, aa] = fechaCorta.split("/").map(Number);
  return new Date(aa, mm - 1, dd);
}

function formatearCelda(valor, columna) {
  if (columna.num) return valor != null ? valor.toFixed(columna.decimales ?? 1) : "—";
  return valor || "—";
}

// Historial completo del plantel en formato planilla, copiado de la v1
// (historial_fuerza_plantel.html / historial_pliegues_plantel.html):
// buscador por jugador, rango de fechas, pestañas (sentadilla/pecho o
// pliegues/pesajes), tabla con encabezado fijo y orden por columna, y
// exportación a Excel de lo que se está viendo.
//
// Props:
//   descripcion   texto chico debajo del título de la pantalla
//   pestanas      [{ id, titulo, columnas, filas, archivo, hoja }]
//                 columnas: [{ key, titulo, num?, decimales?, hl? }]
export default function TablaHistorialPlantel({ descripcion, pestanas }) {
  const [activaId, setActivaId] = useState(pestanas[0].id);
  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [orden, setOrden] = useState({ col: "fecha", dir: -1 });

  const activa = pestanas.find((p) => p.id === activaId) ?? pestanas[0];

  const cambiarPestana = (id) => {
    setActivaId(id);
    setOrden({ col: "fecha", dir: -1 });
  };

  const cambiarOrden = (col) => {
    setOrden((antes) => (antes.col === col ? { col, dir: -antes.dir } : { col, dir: 1 }));
  };

  const filas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const fechaDesde = desde ? new Date(`${desde}T00:00:00`) : null;
    const fechaHasta = hasta ? new Date(`${hasta}T00:00:00`) : null;

    let lista = activa.filas.filter((fila) => {
      if (texto && !fila.jugador.toLowerCase().includes(texto)) return false;
      const fecha = comoFecha(fila.fecha);
      if (fechaDesde && (!fecha || fecha < fechaDesde)) return false;
      if (fechaHasta && (!fecha || fecha > fechaHasta)) return false;
      return true;
    });

    lista = [...lista].sort((a, b) => {
      if (orden.col === "fecha") {
        const fa = comoFecha(a.fecha)?.getTime() ?? -Infinity;
        const fb = comoFecha(b.fecha)?.getTime() ?? -Infinity;
        return (fa - fb) * orden.dir;
      }
      const va = a[orden.col];
      const vb = b[orden.col];
      if (typeof va === "string" || typeof vb === "string") {
        return (va ?? "").toString().localeCompare((vb ?? "").toString()) * orden.dir;
      }
      const na = va ?? -Infinity;
      const nb = vb ?? -Infinity;
      return (na - nb) * orden.dir;
    });

    return lista;
  }, [activa, busqueda, desde, hasta, orden]);

  const rangoFechas = useMemo(() => {
    const fechas = filas.map((f) => f.fecha).filter(Boolean);
    if (!fechas.length) return "";
    const ordenadas = [...fechas].sort((a, b) => comoFecha(a) - comoFecha(b));
    return `Desde ${ordenadas[0]} hasta ${ordenadas[ordenadas.length - 1]}`;
  }, [filas]);

  const exportar = () => {
    exportarTabla(
      filas,
      activa.columnas.map((c) => [c.key, c.titulo]),
      activa.archivo,
      activa.hoja,
    );
  };

  return (
    <>
      {descripcion && <p className={styles.descripcion}>{descripcion}</p>}

      <div className={styles.controles}>
        <div className={styles.buscador}>
          <Icono nombre="buscar" tamano={14} strokeWidth={2} className={styles.iconoBuscar} />
          <input
            type="text"
            placeholder="Buscar jugador…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar jugador"
          />
        </div>
        <label className={styles.campoFecha}>
          <span>Desde</span>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label className={styles.campoFecha}>
          <span>Hasta</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        {pestanas.length > 1 && (
          <div className={styles.pestanas} role="tablist">
            {pestanas.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={p.id === activaId}
                className={cx(styles.pestana, p.id === activaId && styles.pestanaActiva)}
                onClick={() => cambiarPestana(p.id)}
              >
                {p.titulo}
              </button>
            ))}
          </div>
        )}
        <button type="button" className={styles.botonExportar} onClick={exportar}>
          <Icono nombre="descargar" tamano={14} strokeWidth={1.7} />
          Exportar Excel
        </button>
      </div>

      <div className={styles.tarjeta}>
        <div className={styles.info}>
          <span>
            {filas.length} {filas.length === 1 ? "registro" : "registros"}
          </span>
          <span>{rangoFechas}</span>
        </div>
        <div className={styles.scroll}>
          <table>
            <thead>
              <tr>
                {activa.columnas.map((columna) => (
                  <th
                    key={columna.key}
                    className={cx(columna.num && styles.num, columna.hl && styles.hl)}
                    onClick={() => cambiarOrden(columna.key)}
                  >
                    {columna.titulo}
                    {orden.col === columna.key ? (orden.dir > 0 ? " ↑" : " ↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={activa.columnas.length} className={styles.vacio}>
                    Sin registros
                  </td>
                </tr>
              ) : (
                filas.map((fila, indice) => (
                  <tr key={indice}>
                    {activa.columnas.map((columna) => (
                      <td
                        key={columna.key}
                        className={cx(columna.num && styles.num, columna.hl && styles.hl)}
                        title={
                          columna.key === "comentario" && fila.comentario ? fila.comentario : undefined
                        }
                      >
                        {columna.key === "jugador" ? (
                          <strong>{fila.jugador}</strong>
                        ) : columna.key === "comentario" ? (
                          <span className={styles.comentario}>{fila.comentario || "—"}</span>
                        ) : (
                          formatearCelda(fila[columna.key], columna)
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
