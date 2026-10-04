"use client";

import { useCallback, useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import { createClient } from "@/lib/supabase/client";
import { obtenerEquipos, obtenerRankings } from "@/lib/data/torneoDb";
import { formatearNombre } from "@/lib/torneo";
import HojaJugador from "../_componentes/HojaJugador";
import Pildoras from "../_componentes/Pildoras";
import styles from "./Jugadores.module.css";

const TEMPORADAS = [
  { valor: "2024", texto: "2024" },
  { valor: "2025", texto: "2025" },
  { valor: "2026", texto: "2026" },
  { valor: "todos", texto: "Todos" },
];

// Cada pestaña: qué jugadores se ven, cómo se ordenan y qué columnas tiene.
// `tipo` "principal" es el número grande; "secundario", el chico y gris.
const PESTANAS = [
  {
    clave: "goles",
    titulo: "Goleadores",
    vacio: "No hay goleadores",
    grilla: "36px 1fr 50px",
    filtro: (p) => p.goles > 0,
    orden: (a, b) => b.goles - a.goles || b.minutos - a.minutos,
    columnas: [{ titulo: "Goles", valor: (p) => p.goles, tipo: "principal" }],
  },
  {
    clave: "minutos",
    titulo: "Minutos",
    vacio: "Sin datos",
    grilla: "36px 1fr 60px 50px",
    orden: (a, b) => b.minutos - a.minutos,
    columnas: [
      { titulo: "Min", valor: (p) => p.minutos, tipo: "principal" },
      { titulo: "PJ", valor: (p) => p.partidos, tipo: "secundario" },
    ],
  },
  {
    clave: "tarjetas",
    titulo: "Tarjetas",
    vacio: "Sin tarjetas",
    grilla: "36px 1fr 42px 42px",
    filtro: (p) => p.amarillas > 0 || p.rojas > 0,
    orden: (a, b) => b.amarillas + b.rojas * 3 - (a.amarillas + a.rojas * 3),
    columnas: [
      { titulo: "🟨", valor: (p) => p.amarillas, tipo: "principal" },
      { titulo: "🟥", valor: (p) => p.rojas, tipo: "roja" },
    ],
  },
  {
    clave: "general",
    titulo: "General",
    vacio: "Sin datos",
    grilla: "36px 1fr 36px 36px 50px",
    orden: (a, b) => b.partidos - a.partidos || b.minutos - a.minutos,
    columnas: [
      { titulo: "PJ", valor: (p) => p.partidos, tipo: "secundario" },
      { titulo: "Gol", valor: (p) => p.goles, tipo: "secundario" },
      { titulo: "Min", valor: (p) => p.minutos, tipo: "secundario" },
    ],
  },
];

const MAXIMO_FILAS = 50;

// Rankings de jugadores del torneo, copiado de la v1: filtro por equipo,
// temporadas (se pueden elegir varias) y cuatro pestañas. Al tocar un jugador
// se abre su ficha.
export default function Jugadores() {
  const [equipos, setEquipos] = useState([]);
  const [equipo, setEquipo] = useState("todos");
  const [temporadas, setTemporadas] = useState(["2026"]);
  const [pestana, setPestana] = useState("goles");
  const [cargado, setCargado] = useState(null);
  const [jugador, setJugador] = useState(null);
  const cerrarHoja = useCallback(() => setJugador(null), []);

  useEffect(() => {
    let vigente = true;
    obtenerEquipos(createClient()).then((lista) => vigente && setEquipos(lista));
    return () => {
      vigente = false;
    };
  }, []);

  // Trae el ranking cada vez que cambia el equipo o las temporadas.
  const clave = `${equipo}|${temporadas.join(",")}`;
  useEffect(() => {
    let vigente = true;
    obtenerRankings(createClient(), { equipo, temporadas })
      .then((datos) => vigente && setCargado({ clave, datos }))
      .catch(() => vigente && setCargado({ clave, error: true }));
    return () => {
      vigente = false;
    };
  }, [clave, equipo, temporadas]);

  // "Todos" borra las otras temporadas; elegir una suelta "Todos"; nunca queda vacío.
  const elegirTemporada = (valor) => {
    if (valor === "todos") {
      setTemporadas(["todos"]);
      return;
    }
    const sinTodos = temporadas.filter((t) => t !== "todos");
    const nuevas = sinTodos.includes(valor) ? sinTodos.filter((t) => t !== valor) : [...sinTodos, valor];
    setTemporadas(nuevas.length > 0 ? nuevas : ["2026"]);
  };

  const actual = PESTANAS.find((p) => p.clave === pestana);
  const resultado = cargado?.clave === clave ? cargado : null;

  return (
    <>
      <div className={styles.filtros}>
        <div className={styles.grupo}>
          <label htmlFor="filtro-equipo">Equipo</label>
          <select id="filtro-equipo" value={equipo} onChange={(e) => setEquipo(e.target.value)}>
            <option value="todos">Todos los equipos</option>
            {equipos.map((e) => (
              <option key={e.equipo_id} value={e.equipo_id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Pildoras opciones={TEMPORADAS} activas={temporadas} onElegir={elegirTemporada} />

      <div className={styles.pestanas} role="tablist" aria-label="Ranking">
        {PESTANAS.map((p) => (
          <button
            key={p.clave}
            type="button"
            role="tab"
            aria-selected={p.clave === pestana}
            className={cx(styles.pestana, p.clave === pestana && styles.activa)}
            onClick={() => setPestana(p.clave)}
          >
            {p.titulo}
          </button>
        ))}
      </div>

      {resultado === null ? (
        <div className={styles.aviso}>Cargando...</div>
      ) : resultado.error ? (
        <div className={styles.aviso}>Error cargando datos</div>
      ) : resultado.datos.length === 0 ? (
        <div className={styles.aviso}>No hay datos para estos filtros</div>
      ) : (
        <Ranking pestana={actual} datos={resultado.datos} onElegir={setJugador} />
      )}

      <HojaJugador jugador={jugador} onCerrar={cerrarHoja} />
    </>
  );
}

function Ranking({ pestana, datos, onElegir }) {
  const filas = datos.filter(pestana.filtro ?? (() => true)).sort(pestana.orden);
  if (filas.length === 0) return <div className={styles.aviso}>{pestana.vacio}</div>;

  const estiloGrilla = { gridTemplateColumns: pestana.grilla };

  return (
    <div className={styles.tarjeta}>
      <div className={styles.cabecera} style={estiloGrilla}>
        <span>#</span>
        <span>Jugador</span>
        {pestana.columnas.map((c) => (
          <span key={c.titulo} className={styles.centrado}>
            {c.titulo}
          </span>
        ))}
      </div>
      {filas.slice(0, MAXIMO_FILAS).map((p, indice) => (
        <button
          key={p.jugador_id}
          type="button"
          className={styles.fila}
          style={estiloGrilla}
          onClick={() => onElegir({ id: p.jugador_id, nombre: p.nombre_completo })}
        >
          <span className={cx(styles.puesto, indice < 3 && styles.podio)}>{indice + 1}</span>
          <span className={styles.quien}>
            <span className={styles.nombre}>{formatearNombre(p.nombre_completo)}</span>
            <span className={styles.equipo}>{p.equipo}</span>
          </span>
          {pestana.columnas.map((c) => (
            <span key={c.titulo} className={styles[c.tipo]}>
              {c.valor(p)}
            </span>
          ))}
        </button>
      ))}
    </div>
  );
}
