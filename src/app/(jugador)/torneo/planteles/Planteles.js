"use client";

import { useCallback, useEffect, useState } from "react";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import { createClient } from "@/lib/supabase/client";
import { obtenerEquipos, obtenerPlantel } from "@/lib/data/torneoDb";
import { calcularEdad, formatearNombre } from "@/lib/torneo";
import HojaJugador from "../_componentes/HojaJugador";
import styles from "./Planteles.module.css";

const ORDEN_PUESTOS = ["Arquero", "Defensor", "Volante", "Delantero", "Entrenador", "Otro"];
const PLURALES = {
  Arquero: "Arqueros",
  Defensor: "Defensores",
  Volante: "Volantes",
  Delantero: "Delanteros",
  Entrenador: "Entrenadores",
};

// Planteles de todos los equipos, copiado de la v1: buscador, un desplegable
// por equipo con sus jugadores agrupados por puesto, y la ficha del jugador
// al tocarlo.
export default function Planteles() {
  const [equipos, setEquipos] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(null);
  const [planteles, setPlanteles] = useState({});
  const [jugador, setJugador] = useState(null);
  const cerrarHoja = useCallback(() => setJugador(null), []);

  useEffect(() => {
    let vigente = true;
    obtenerEquipos(createClient())
      .then((lista) => vigente && setEquipos(lista))
      .catch(() => vigente && setEquipos("error"));
    return () => {
      vigente = false;
    };
  }, []);

  const alternarEquipo = async (equipo) => {
    const id = equipo.equipo_id;
    setAbierto((actual) => (actual === id ? null : id));
    if (planteles[id] && planteles[id] !== "error") return;
    try {
      const lista = await obtenerPlantel(createClient(), id);
      setPlanteles((antes) => ({ ...antes, [id]: lista }));
    } catch {
      setPlanteles((antes) => ({ ...antes, [id]: "error" }));
    }
  };

  if (equipos === null) return <div className={styles.aviso}>Cargando planteles...</div>;
  if (equipos === "error") return <div className={styles.aviso}>Error cargando equipos</div>;

  // Busca por nombre de equipo o, en los planteles ya abiertos, por jugador.
  const texto = busqueda.toLowerCase().trim();
  const visibles = equipos.filter((equipo) => {
    if (!texto || equipo.nombre.toLowerCase().includes(texto)) return true;
    const plantel = planteles[equipo.equipo_id];
    return Array.isArray(plantel) && plantel.some((j) => j.nombre_completo.toLowerCase().includes(texto));
  });

  return (
    <>
      <div className={styles.buscador}>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar equipo o jugador..."
          aria-label="Buscar equipo o jugador"
        />
      </div>

      {visibles.length === 0 && <div className={styles.aviso}>No se encontraron equipos</div>}

      {visibles.map((equipo) => {
        const estaAbierto = abierto === equipo.equipo_id;
        return (
          <div key={equipo.equipo_id} className={cx(styles.equipo, estaAbierto && styles.abierto)}>
            <button
              type="button"
              className={styles.cabecera}
              aria-expanded={estaAbierto}
              onClick={() => alternarEquipo(equipo)}
            >
              <span className={styles.nombre}>{equipo.nombre}</span>
              <Icono nombre="flecha" tamano={18} strokeWidth={2.4} className={styles.flecha} />
            </button>
            {estaAbierto && (
              <div className={styles.cuerpo}>
                <Plantel plantel={planteles[equipo.equipo_id]} onElegir={setJugador} />
              </div>
            )}
          </div>
        );
      })}

      <HojaJugador jugador={jugador} onCerrar={cerrarHoja} />
    </>
  );
}

function Plantel({ plantel, onElegir }) {
  if (!plantel) return <div className={styles.cargando}>Cargando plantel...</div>;
  if (plantel === "error") return <div className={styles.cargando}>Error cargando plantel</div>;

  const porPuesto = {};
  for (const j of plantel) {
    const puesto = j.puesto || "Otro";
    (porPuesto[puesto] ??= []).push(j);
  }

  return ORDEN_PUESTOS.filter((puesto) => porPuesto[puesto]).map((puesto) => {
    const grupo = porPuesto[puesto];
    const rotulo = grupo.length > 1 ? (PLURALES[puesto] ?? `${puesto}s`) : puesto;
    return (
      <div key={puesto}>
        <div className={styles.grupo}>
          {rotulo} ({grupo.length})
        </div>
        {grupo.map((j) => (
          <button
            key={j.jugador_id}
            type="button"
            className={styles.jugador}
            onClick={() => onElegir({ id: j.jugador_id, nombre: j.nombre_completo })}
          >
            <span className={styles.columnaNombre}>
              <span className={styles.nombreJugador}>{formatearNombre(j.nombre_completo)}</span>
              <span className={styles.detalle}>
                {j.fecha_nacimiento ? `${calcularEdad(j.fecha_nacimiento)} años` : ""}
              </span>
            </span>
            <span className={styles.estadisticas}>
              {[
                [j.partidos, "PJ"],
                [j.minutos, "Min"],
                [j.goles, "Gol"],
              ].map(([valor, rotuloEst]) => (
                <span key={rotuloEst} className={styles.estadistica}>
                  <span className={styles.valor}>{valor}</span>
                  <span className={styles.rotulo}>{rotuloEst}</span>
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>
    );
  });
}
