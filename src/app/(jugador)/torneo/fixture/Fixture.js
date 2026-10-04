"use client";

import Link from "next/link";
import { useState } from "react";
import FuenteDatos from "@/components/FuenteDatos";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import { createClient } from "@/lib/supabase/client";
import { obtenerSintesisPartido } from "@/lib/data/torneoDb";
import styles from "./Fixture.module.css";
import SintesisPartido from "./SintesisPartido";

const claveDe = (p) => `${p.dia}|${p.local}|${p.visitante}`;

// Fixture del torneo, copiado de la v1: filtros por zona y equipo, una sección
// plegable por fecha y, en los partidos jugados, la síntesis (formaciones y
// eventos) que se abre al tocar la tarjeta.
//
// Props (vienen de `obtenerFixture`):
//   fechas      [[número de fecha, [partidos]]] en orden
//   equipos     nombres de equipos, para el filtro
//   equipoZona  { equipo: "A" | "B" }
export default function Fixture({ fechas, equipos, equipoZona }) {
  const [zona, setZona] = useState("");
  const [equipo, setEquipo] = useState("");
  // Arrancan cerradas las fechas donde todavía no se jugó nada.
  const [cerradas, setCerradas] = useState(
    () => new Set(fechas.filter(([, ps]) => !ps.some((p) => p.jugado)).map(([num]) => num)),
  );
  const [abierto, setAbierto] = useState(null);
  const [sintesis, setSintesis] = useState({});

  const pasaFiltros = (p, zonaElegida, equipoElegido) => {
    const deLaZona =
      !zonaElegida || equipoZona[p.local] === zonaElegida || equipoZona[p.visitante] === zonaElegida;
    const delEquipo = !equipoElegido || p.local === equipoElegido || p.visitante === equipoElegido;
    return deLaZona && delEquipo;
  };

  const cambiarFiltro = (zonaNueva, equipoNuevo) => {
    setZona(zonaNueva);
    setEquipo(equipoNuevo);
    // Con un filtro activo se abren las fechas que tienen partidos.
    if (zonaNueva || equipoNuevo) {
      setCerradas((antes) => {
        const ahora = new Set(antes);
        for (const [num, partidos] of fechas) {
          if (partidos.some((p) => pasaFiltros(p, zonaNueva, equipoNuevo))) ahora.delete(num);
        }
        return ahora;
      });
    }
  };

  const alternarFecha = (num) => {
    setCerradas((antes) => {
      const ahora = new Set(antes);
      if (ahora.has(num)) ahora.delete(num);
      else ahora.add(num);
      return ahora;
    });
  };

  const alternarSintesis = async (partido) => {
    const clave = claveDe(partido);
    setAbierto((actual) => (actual === clave ? null : clave));
    // Ya cargada (o cargándose): no se pide de nuevo. Si falló, se reintenta.
    if (sintesis[clave] && sintesis[clave].estado !== "error") return;

    setSintesis((antes) => ({ ...antes, [clave]: { estado: "cargando" } }));
    try {
      const datos = await obtenerSintesisPartido(createClient(), partido.partido_id);
      setSintesis((antes) => ({
        ...antes,
        [clave]: datos ? { estado: "listo", datos } : { estado: "vacio" },
      }));
    } catch {
      setSintesis((antes) => ({ ...antes, [clave]: { estado: "error" } }));
    }
  };

  const fechasVisibles = fechas
    .map(([num, partidos]) => [num, partidos.filter((p) => pasaFiltros(p, zona, equipo))])
    .filter(([, partidos]) => partidos.length > 0);

  return (
    <>
      <div className={styles.filtros}>
        <select
          className={styles.selector}
          value={zona}
          onChange={(e) => cambiarFiltro(e.target.value, equipo)}
          aria-label="Filtrar por zona"
        >
          <option value="">Todas las zonas</option>
          <option value="A">Zona A</option>
          <option value="B">Zona B</option>
        </select>
        <select
          className={styles.selector}
          value={equipo}
          onChange={(e) => cambiarFiltro(zona, e.target.value)}
          aria-label="Filtrar por equipo"
        >
          <option value="">Todos los equipos</option>
          {equipos.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </select>
        <Link href="/torneo/posiciones" className={styles.enlace}>
          <Icono nombre="tabla" tamano={14} strokeWidth={2.4} />
          Posiciones
        </Link>
      </div>

      {fechasVisibles.map(([num, partidos]) => {
        const cerrada = cerradas.has(num);
        return (
          <section key={num} className={styles.fecha}>
            <button
              type="button"
              className={styles.cabeceraFecha}
              aria-expanded={!cerrada}
              onClick={() => alternarFecha(num)}
            >
              <span className={styles.tituloFecha}>
                <Icono
                  nombre="flechaAbajo"
                  tamano={14}
                  strokeWidth={2.4}
                  className={cx(styles.flecha, cerrada && styles.plegada)}
                />
                Fecha {num}
              </span>
              <span className={styles.cantidad}>
                {partidos.length} {partidos.length === 1 ? "partido" : "partidos"}
              </span>
            </button>

            <div className={cx(styles.partidos, cerrada && styles.oculto)}>
              {partidos.map((p) => (
                <Partido
                  key={claveDe(p)}
                  partido={p}
                  abierto={abierto === claveDe(p)}
                  sintesis={sintesis[claveDe(p)]}
                  onAlternar={() => alternarSintesis(p)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <FuenteDatos />
    </>
  );
}

function Partido({ partido: p, abierto, sintesis, onAlternar }) {
  const hacoaj = p.es_hacoaj_local || p.es_hacoaj_visit;
  const Cabecera = p.jugado ? "button" : "div";
  const propsBoton = p.jugado
    ? { type: "button", onClick: onAlternar, "aria-expanded": abierto }
    : {};

  return (
    <div className={cx(styles.partido, hacoaj && styles.hacoaj, p.jugado && styles.jugado)}>
      <Cabecera className={styles.cabecera} {...propsBoton}>
        <span className={styles.fechaHora}>
          {p.dia}
          {p.hora && ` · ${p.hora}`}
          {p.arbitro && <span> · {p.arbitro}</span>}
        </span>
        <span className={styles.equipos}>
          <span className={cx(styles.equipo, styles.izquierda, p.es_hacoaj_local && styles.resaltado)}>
            {p.local}
          </span>
          <span className={styles.marcador}>
            {p.jugado ? (
              <span className={styles.jugadoMarcador}>
                {p.goles_local} - {p.goles_visitante}
              </span>
            ) : (
              <span className={styles.pendiente}>vs</span>
            )}
          </span>
          <span className={cx(styles.equipo, styles.derecha, p.es_hacoaj_visit && styles.resaltado)}>
            {p.visitante}
          </span>
        </span>
      </Cabecera>

      {p.jugado && (
        <div className={cx(styles.panel, abierto && styles.panelAbierto)} aria-hidden={!abierto}>
          <div className={styles.panelInterior}>
            {sintesis && <SintesisPartido estado={sintesis.estado} datos={sintesis.datos} />}
          </div>
        </div>
      )}
    </div>
  );
}
