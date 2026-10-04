"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Icono from "@/components/Icono";
import PanelVacio from "@/components/PanelVacio";
import { useSesion } from "@/components/SesionProvider";
import SectionLabel from "@/components/SectionLabel";
import { cx } from "@/lib/cx";
import { obtenerEstadisticasJugador } from "@/lib/data/partidos";
import { createClient } from "@/lib/supabase/client";
import { fechaLarga } from "@/lib/torneo";
import styles from "./MisEstadisticas.module.css";

// Estadísticas del jugador en el torneo, copiado de la v1: resumen general
// (participación, minutos, producción ofensiva o defensiva, disciplina) y una
// tarjeta por cada partido de Hacoaj con lo que hizo en él.
export default function MisEstadisticas() {
  const { sesion } = useSesion();
  const [cargado, setCargado] = useState(null);
  const { nombre, posicion } = sesion;

  useEffect(() => {
    let vigente = true;
    obtenerEstadisticasJugador(createClient(), posicion)
      .then((datos) => vigente && setCargado({ nombre, datos }))
      .catch(() => vigente && setCargado({ nombre, datos: { resumen: null, partidos: [] } }));
    return () => {
      vigente = false;
    };
  }, [nombre, posicion]);

  if (cargado?.nombre !== nombre) return <div className={styles.cargando}>Cargando...</div>;

  const { resumen, partidos } = cargado.datos;
  if (!resumen) {
    return (
      <PanelVacio
        icono="partidos"
        titulo="Próximamente"
        mensaje="Acá vas a poder ver tus goles, asistencias, minutos jugados y más datos del Promocional 2026."
      />
    );
  }

  return (
    <>
      <SectionLabel nota="Promocional 2026">Resumen general</SectionLabel>

      <Grupo titulo="Participación" primero>
        <Tarjeta valor={resumen.partidos_hacoaj} rotulo="Partidos Hacoaj" ancha azul />
        <Tarjeta valor={resumen.partidos_jugados} rotulo="Partidos jugados" dorada />
        <Tarjeta valor={resumen.citaciones} rotulo="Citaciones" />
        <Tarjeta valor={resumen.titularidades} rotulo="Titularidades" />
        <Tarjeta valor={resumen.desde_banco} rotulo="Desde el banco" />
      </Grupo>

      <Grupo titulo="Minutos">
        <Tarjeta valor={`${resumen.minutos_totales}'`} rotulo="Minutos totales" dorada ancha />
        <Tarjeta valor={`${resumen.minutos_titular}'`} rotulo="Como titular" />
        <Tarjeta valor={`${resumen.minutos_suplente}'`} rotulo="Como suplente" />
        <Tarjeta valor={`${resumen.promedio_minutos}'`} rotulo="Promedio por partido" ancha />
      </Grupo>

      {resumen.es_arquero ? (
        <Grupo titulo="Rendimiento defensivo">
          <Tarjeta valor={resumen.goles_recibidos} rotulo="Goles recibidos" />
          <Tarjeta valor={resumen.goles_recibidos_pp} rotulo="Goles recibidos/partido" dorada />
        </Grupo>
      ) : (
        <Grupo titulo="Producción ofensiva">
          <Tarjeta valor={resumen.goles} rotulo="Goles" dorada />
          <Tarjeta valor={resumen.asistencias} rotulo="Asistencias" />
        </Grupo>
      )}

      <Grupo titulo="Disciplina">
        <Tarjeta valor={resumen.amarillas} rotulo="Amarillas" color="amarillo" />
        <Tarjeta valor={resumen.rojas} rotulo="Rojas" color="rojo" />
      </Grupo>

      <SectionLabel nota={`${partidos.length} partidos`} separada={24}>
        Partidos detallados
      </SectionLabel>
      <div className={styles.lista}>
        {partidos.map((p) => (
          <PartidoJugado key={p.fecha_raw} partido={p} />
        ))}
      </div>
    </>
  );
}

function Grupo({ titulo, primero = false, children }) {
  return (
    <>
      <div className={cx(styles.grupo, !primero && styles.grupoSeparado)}>{titulo}</div>
      <div className={styles.grilla}>{children}</div>
    </>
  );
}

function Tarjeta({ valor, rotulo, ancha, dorada, azul, color }) {
  return (
    <div className={cx(styles.tarjeta, ancha && styles.ancha, dorada && styles.dorada, azul && styles.azul)}>
      <div className={cx(styles.valor, color && styles[color])}>{valor}</div>
      <div className={styles.rotulo}>{rotulo}</div>
    </div>
  );
}

const CLASE_RESULTADO = { "score-win": styles.gano, "score-draw": styles.empato, "score-loss": styles.perdio };

function PartidoJugado({ partido: p }) {
  return (
    <Link href={`/torneo/partidos/${p.fecha_raw}`} className={styles.partido}>
      <div className={styles.encabezado}>
        <span className={styles.fecha}>{fechaLarga(p.fecha_raw)}</span>
        <span className={cx(styles.condicion, p.condicion === "Local" ? styles.local : styles.visitante)}>
          {p.condicion}
        </span>
      </div>
      <div className={styles.cuerpo}>
        <div className={styles.filaRival}>
          <span className={styles.rival}>vs {p.rival}</span>
          <span className={cx(styles.marcador, CLASE_RESULTADO[p.resultado_clase])}>
            {p.goles_hacoaj}
            <span className={styles.guion}>-</span>
            {p.goles_rival}
          </span>
          <Icono nombre="flecha" tamano={16} strokeWidth={2.4} className={styles.flecha} />
        </div>
        <div className={styles.etiquetas}>
          {!p.citado ? (
            <span className={cx(styles.etiqueta, styles.noCitado)}>No citado</span>
          ) : (
            <>
              <span className={cx(styles.etiqueta, styles.posicion)}>{p.posicion}</span>
              {p.minutos > 0 && (
                <span className={cx(styles.etiqueta, p.titular ? styles.titular : styles.suplente)}>
                  {p.titular ? "Titular" : "Suplente"}
                </span>
              )}
              <span className={cx(styles.etiqueta, styles.minutos)}>{p.minutos}&apos;</span>
              {p.goles > 0 && (
                <span className={cx(styles.etiqueta, styles.gol)}>
                  {p.goles} gol{p.goles > 1 ? "es" : ""}
                </span>
              )}
              {p.asistencias > 0 && (
                <span className={cx(styles.etiqueta, styles.asistencia)}>{p.asistencias} asist.</span>
              )}
              {p.amarillas > 0 && (
                <span className={cx(styles.etiqueta, styles.amarilla)}>
                  {p.amarillas} amarilla{p.amarillas > 1 ? "s" : ""}
                </span>
              )}
              {p.rojas > 0 && (
                <span className={cx(styles.etiqueta, styles.roja)}>
                  {p.rojas} roja{p.rojas > 1 ? "s" : ""}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
