"use client";

import { useEffect, useState } from "react";
import Icono from "@/components/Icono";
import { createClient } from "@/lib/supabase/client";
import { cx } from "@/lib/cx";
import {
  obtenerEquipos,
  obtenerPartidosEquipo,
  obtenerSintesisPartido,
  obtenerStatsEquipo,
} from "@/lib/data/torneoDb";
import InsigniaResultado from "../_componentes/InsigniaResultado";
import Pildoras from "../_componentes/Pildoras";
import styles from "./Equipos.module.css";
import SintesisEquipo from "./SintesisEquipo";

const TEMPORADAS = [
  { valor: "2024", texto: "2024" },
  { valor: "2025", texto: "2025" },
  { valor: "2026", texto: "2026" },
  { valor: "todos", texto: "Todos" },
];

// "2026-05-23" → "23/05"
function fechaDiaMes(fechaIso) {
  const partes = (fechaIso || "").split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}` : (fechaIso ?? "");
}

// Estadísticas de un equipo, copiado de la v1: se elige el equipo (Hacoaj de
// entrada) y la temporada, y se ven los números del equipo y sus partidos; al
// tocar un partido se despliega lo que pasó en la cancha.
export default function Equipos() {
  const [equipos, setEquipos] = useState(null);
  const [equipoId, setEquipoId] = useState(null);
  const [temporada, setTemporada] = useState("2026");
  const [cargado, setCargado] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [sintesis, setSintesis] = useState({});

  useEffect(() => {
    let vigente = true;
    obtenerEquipos(createClient())
      .then((lista) => {
        if (!vigente) return;
        setEquipos(lista);
        // Arranca con Hacoaj elegido.
        const hacoaj = lista.find((e) => e.nombre.toLowerCase().includes("hacoaj"));
        if (hacoaj) setEquipoId(hacoaj.equipo_id);
      })
      .catch(() => vigente && setEquipos("error"));
    return () => {
      vigente = false;
    };
  }, []);

  // Trae los números y los partidos cada vez que cambia el equipo o la temporada.
  useEffect(() => {
    if (equipoId === null) return undefined;
    let vigente = true;
    const clave = `${equipoId}-${temporada}`;
    const supabase = createClient();
    Promise.all([obtenerStatsEquipo(supabase, equipoId, temporada), obtenerPartidosEquipo(supabase, equipoId, temporada)])
      .then(([stats, partidos]) => vigente && setCargado({ clave, stats, partidos }))
      .catch(() => vigente && setCargado({ clave, error: true }));
    return () => {
      vigente = false;
    };
  }, [equipoId, temporada]);

  const alternarPartido = async (partidoId) => {
    setAbierto((actual) => (actual === partidoId ? null : partidoId));
    if (sintesis[partidoId] && sintesis[partidoId] !== "error") return;
    try {
      const datos = await obtenerSintesisPartido(createClient(), partidoId);
      setSintesis((antes) => ({ ...antes, [partidoId]: datos }));
    } catch {
      setSintesis((antes) => ({ ...antes, [partidoId]: "error" }));
    }
  };

  const elegirEquipo = (valor) => {
    setEquipoId(valor ? Number(valor) : null);
    setAbierto(null);
  };

  const elegirTemporada = (valor) => {
    setTemporada(valor);
    setAbierto(null);
  };

  if (equipos === "error") return <div className={styles.aviso}>Error cargando datos</div>;

  const resultado = cargado?.clave === `${equipoId}-${temporada}` ? cargado : null;

  return (
    <>
      <div className={styles.selector}>
        <label htmlFor="equipo-elegido">Equipo</label>
        <select
          id="equipo-elegido"
          value={equipoId ?? ""}
          onChange={(e) => elegirEquipo(e.target.value)}
          disabled={equipos === null}
        >
          <option value="">{equipos === null ? "Cargando..." : "Elegir equipo..."}</option>
          {(equipos ?? []).map((equipo) => (
            <option key={equipo.equipo_id} value={equipo.equipo_id}>
              {equipo.nombre}
            </option>
          ))}
        </select>
      </div>

      <Pildoras opciones={TEMPORADAS} activas={[temporada]} onElegir={elegirTemporada} />

      {equipoId !== null &&
        (resultado === null ? (
          <div className={styles.aviso}>Cargando...</div>
        ) : resultado.error ? (
          <div className={styles.aviso}>Error cargando datos</div>
        ) : (
          <>
            <Estadisticas stats={resultado.stats} />
            <ListaPartidos
              partidos={resultado.partidos}
              abierto={abierto}
              sintesis={sintesis}
              onAlternar={alternarPartido}
            />
          </>
        ))}
    </>
  );
}

function Estadisticas({ stats: s }) {
  if (!s.pj) return <div className={styles.aviso}>No hay partidos en esta temporada</div>;

  const porcentaje = (cantidad) => `${((cantidad / s.pj) * 100).toFixed(0)}%`;

  return (
    <div className={styles.tarjeta}>
      <div className={styles.cifras4}>
        <Cifra valor={s.pts} rotulo="Puntos" destacada />
        <Cifra valor={s.pj} rotulo="PJ" />
        <Cifra valor={`${s.pct_pts}%`} rotulo="% Pts" />
        <Cifra valor={s.goles_partido} rotulo="Gol/PJ" />
      </div>

      <div className={styles.barra} role="img" aria-label={`${s.pg} ganados, ${s.pe} empates, ${s.pp} derrotas`}>
        <div className={styles.ganados} style={{ width: porcentaje(s.pg) }} />
        <div className={styles.empates} style={{ width: porcentaje(s.pe) }} />
        <div className={styles.derrotas} style={{ width: porcentaje(s.pp) }} />
      </div>

      <div className={cx(styles.cifras4, styles.separada)}>
        <Cifra valor={s.pg} rotulo="Ganados" tono="ganados" />
        <Cifra valor={s.pe} rotulo="Empates" tono="empates" />
        <Cifra valor={s.pp} rotulo="Derrotas" tono="derrotas" />
        <Cifra valor={`${s.dif >= 0 ? "+" : ""}${s.dif}`} rotulo="Dif gol" />
      </div>

      <div className={cx(styles.cifras3, styles.separada)}>
        <Cifra valor={s.gf} rotulo="Goles a favor" />
        <Cifra valor={s.gc} rotulo="Goles en contra" />
        <Cifra valor={`${s.amarillas} / ${s.rojas}`} rotulo="Amar / Roj" />
      </div>
    </div>
  );
}

function Cifra({ valor, rotulo, destacada = false, tono }) {
  return (
    <div className={cx(styles.cifra, tono && styles[`fondo_${tono}`])}>
      <div className={cx(styles.valor, destacada && styles.destacada, tono && styles[`color_${tono}`])}>
        {valor}
      </div>
      <div className={styles.rotulo}>{rotulo}</div>
    </div>
  );
}

function ListaPartidos({ partidos, abierto, sintesis, onAlternar }) {
  if (partidos.length === 0) return null;

  return (
    <>
      <h2 className={styles.titulo}>Partidos ({partidos.length})</h2>
      {partidos.map((p) => {
        const estaAbierto = abierto === p.partido_id;
        return (
          <div key={p.partido_id} className={styles.partido}>
            <button
              type="button"
              className={styles.cabecera}
              aria-expanded={estaAbierto}
              onClick={() => onAlternar(p.partido_id)}
            >
              <span className={styles.fecha}>{fechaDiaMes(p.fecha)}</span>
              <span className={styles.info}>
                <span className={styles.rival}>{p.rival}</span>
                <span className={styles.condicion}>
                  {p.condicion}
                  {p.estadio && ` · ${p.estadio}`}
                </span>
              </span>
              <InsigniaResultado resultado={p.resultado} grande>
                {p.gf}-{p.gc}
              </InsigniaResultado>
              <Icono
                nombre="flecha"
                tamano={16}
                strokeWidth={2.4}
                className={cx(styles.flecha, estaAbierto && styles.girada)}
              />
            </button>
            {estaAbierto && (
              <div className={styles.sintesis}>
                <SintesisEquipo datos={sintesis[p.partido_id]} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
