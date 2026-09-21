"use client";

import { useEffect, useRef, useState } from "react";
import { obtenerJugador } from "@/lib/data/torneoDb";
import { calcularEdad, fechaCorta, formatearNombre, iconosDeAparicion, resultadoDe } from "@/lib/torneo";
import InsigniaResultado from "./InsigniaResultado";
import styles from "./HojaJugador.module.css";

// Hoja que sube desde abajo con la ficha de un jugador: datos, resumen del
// torneo y cada partido que jugó. Copiada de la v1 (planteles y jugadores).
//
// Props:
//   jugador   { id, nombre } del jugador elegido, o null si está cerrada
//   onCerrar  se llama al tocar la X, el fondo oscuro o la tecla Escape
export default function HojaJugador({ jugador, onCerrar }) {
  const [cargado, setCargado] = useState(null);
  const botonCerrar = useRef(null);
  const alCerrar = useRef(onCerrar);
  const id = jugador?.id ?? null;

  useEffect(() => {
    alCerrar.current = onCerrar;
  });

  // Pide la ficha cada vez que se elige un jugador.
  useEffect(() => {
    if (id === null) return undefined;
    let vigente = true;
    obtenerJugador(id)
      .then((datos) => vigente && setCargado({ id, datos }))
      .catch(() => vigente && setCargado({ id, datos: null }));
    return () => {
      vigente = false;
    };
  }, [id]);

  // Mientras está abierta: la página de atrás no se mueve, Escape cierra y el foco va a la X.
  useEffect(() => {
    if (id === null) return undefined;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    botonCerrar.current?.focus();
    const alTeclear = (e) => e.key === "Escape" && alCerrar.current();
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", alTeclear);
    };
  }, [id]);

  if (id === null) return null;

  const cargando = cargado?.id !== id;
  const datos = cargado?.id === id ? cargado.datos : null;

  return (
    <div className={styles.fondo} onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className={styles.hoja} role="dialog" aria-modal="true" aria-labelledby="hoja-jugador-nombre">
        <div className={styles.asa} />
        <div className={styles.cabecera}>
          <h3 id="hoja-jugador-nombre">{formatearNombre(jugador.nombre)}</h3>
          <button
            ref={botonCerrar}
            type="button"
            className={styles.cerrar}
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {cargando ? (
          <div className={styles.aviso}>Cargando...</div>
        ) : datos ? (
          <Detalle datos={datos} />
        ) : (
          <div className={styles.aviso}>Error cargando datos</div>
        )}
      </div>
    </div>
  );
}

function Detalle({ datos }) {
  const { jugador: j, resumen: r, apariciones } = datos;
  const edad = j.fecha_nacimiento ? calcularEdad(j.fecha_nacimiento) : "—";
  const porcentajeTitular = r.partidos ? Math.round(((r.titular || 0) / r.partidos) * 100) : 0;
  const minutosPorPartido = r.partidos ? Math.round((r.minutos || 0) / r.partidos) : 0;

  const cifras = [
    [r.partidos || 0, "PJ"],
    [r.titular || 0, "Tit"],
    [r.minutos || 0, "Min"],
    [r.goles || 0, "Gol"],
    [r.amarillas || 0, "Amar"],
    [r.rojas || 0, "Roja"],
    [`${porcentajeTitular}%`, "% Tit"],
    [minutosPorPartido, "Min/PJ"],
  ];

  return (
    <>
      <div className={styles.datos}>
        {j.puesto} · {edad} años · {j.equipo}
      </div>
      <div className={styles.cifras}>
        {cifras.map(([valor, rotulo]) => (
          <div key={rotulo} className={styles.cifra}>
            <div className={styles.valor}>{valor}</div>
            <div className={styles.rotulo}>{rotulo}</div>
          </div>
        ))}
      </div>

      {apariciones.length > 0 && (
        <div className={styles.seccion}>
          <h4>Partidos</h4>
          {apariciones.map((a) => {
            const suEquipo = a.equipo_en_partido || j.equipo;
            const local = a.equipo_local === suEquipo;
            const rival = local ? a.equipo_visitante : a.equipo_local;
            const golesAFavor = local ? a.goles_local : a.goles_visitante;
            const golesEnContra = local ? a.goles_visitante : a.goles_local;
            return (
              <div key={a.partido_id} className={styles.partido}>
                <span className={styles.fecha}>{fechaCorta(a.fecha)}</span>
                <span className={styles.rival}>
                  {rival}
                  {suEquipo !== j.equipo && <small>en {suEquipo}</small>}
                </span>
                <InsigniaResultado resultado={resultadoDe(golesAFavor, golesEnContra)}>
                  {golesAFavor}-{golesEnContra}
                </InsigniaResultado>
                <span className={a.titular ? styles.titular : styles.suplente}>
                  {a.titular ? "TIT" : "SUP"}
                </span>
                <span className={styles.iconos}>
                  {a.minutos_jugados}&apos; {iconosDeAparicion(a)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
