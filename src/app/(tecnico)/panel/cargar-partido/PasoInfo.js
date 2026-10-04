"use client";

import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import { ESTADISTICAS } from "@/lib/cargarPartido";
import { useState } from "react";
import styles from "./CargarPartido.module.css";

// Paso 1: fecha, condición, rival, resultado y (opcional) estadísticas del partido.
export default function PasoInfo({ info, alCambiar, rivales, alContinuar }) {
  const [estadisticasAbiertas, setEstadisticasAbiertas] = useState(false);

  const cambiar = (campo) => (e) => alCambiar({ ...info, [campo]: e.target.value });
  const cambiarEstadistica = (campo) => (e) =>
    alCambiar({ ...info, estadisticas: { ...info.estadisticas, [campo]: e.target.value } });

  return (
    <div className={styles.tarjeta}>
      <div className={styles.tituloTarjeta}>
        <Icono nombre="calendario" tamano={18} strokeWidth={1.7} /> Información del partido
      </div>
      <div className={styles.subtituloTarjeta}>Completá los datos básicos del partido.</div>

      <div className={cx(styles.fila, styles.grupo)}>
        <div>
          <label htmlFor="partido-fecha" className={styles.etiqueta}>
            Fecha
          </label>
          <input id="partido-fecha" type="date" className={styles.campo} value={info.fecha} onChange={cambiar("fecha")} />
        </div>
        <div>
          <span className={styles.etiqueta}>Condición</span>
          <div className={styles.condicion} role="group" aria-label="Condición">
            {["Local", "Visitante"].map((condicion) => (
              <button
                key={condicion}
                type="button"
                className={cx(styles.botonCondicion, info.condicion === condicion && styles.botonCondicionActivo)}
                aria-pressed={info.condicion === condicion}
                onClick={() => alCambiar({ ...info, condicion })}
              >
                {condicion}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.grupo}>
        <label htmlFor="partido-rival" className={styles.etiqueta}>
          Rival
        </label>
        <select id="partido-rival" className={styles.campo} value={info.rival} onChange={cambiar("rival")}>
          <option value="">Seleccionar rival...</option>
          {rivales.map((rival) => (
            <option key={rival} value={rival}>
              {rival}
            </option>
          ))}
        </select>
      </div>

      <span className={styles.etiqueta} style={{ marginTop: 14 }}>
        Resultado
      </span>
      <div className={styles.filaResultado}>
        <div className={cx(styles.grupo, styles.centrado)}>
          <label htmlFor="partido-goles-hacoaj" className={cx(styles.etiqueta, styles.centrado)}>
            Hacoaj
          </label>
          <input
            id="partido-goles-hacoaj"
            type="number"
            min="0"
            max="99"
            className={cx(styles.campo, styles.marcador)}
            value={info.golesHacoaj}
            onChange={cambiar("golesHacoaj")}
          />
        </div>
        <div className={styles.guion}>-</div>
        <div className={cx(styles.grupo, styles.centrado)}>
          <label htmlFor="partido-goles-rival" className={cx(styles.etiqueta, styles.centrado)}>
            Rival
          </label>
          <input
            id="partido-goles-rival"
            type="number"
            min="0"
            max="99"
            className={cx(styles.campo, styles.marcador)}
            value={info.golesRival}
            onChange={cambiar("golesRival")}
          />
        </div>
      </div>

      <button
        type="button"
        className={styles.alternarEstadisticas}
        aria-expanded={estadisticasAbiertas}
        onClick={() => setEstadisticasAbiertas((abiertas) => !abiertas)}
      >
        <Icono nombre="analytics" tamano={16} strokeWidth={2} />
        Estadísticas del partido (opcional)
        <span className={cx(styles.flechaEstadisticas, estadisticasAbiertas && styles.flechaAbierta)}>
          <Icono nombre="flechaAbajo" tamano={14} strokeWidth={2.5} />
        </span>
      </button>

      {estadisticasAbiertas && (
        <div className={styles.camposEstadisticas}>
          {ESTADISTICAS.map((seccion) => (
            <div key={seccion.seccion}>
              <div className={styles.rotuloSeccion}>{seccion.seccion}</div>
              {seccion.pares.map(([aFavor, enContra, nombre]) => (
                <div key={aFavor} className={styles.fila}>
                  {[
                    [aFavor, "a favor"],
                    [enContra, "en contra"],
                  ].map(([campo, lado]) => (
                    <div key={campo} className={styles.grupo}>
                      <label htmlFor={`estadistica-${campo}`} className={styles.etiqueta}>
                        {nombre} ({lado})
                      </label>
                      <input
                        id={`estadistica-${campo}`}
                        type="number"
                        min="0"
                        className={styles.campo}
                        placeholder="—"
                        value={info.estadisticas[campo]}
                        onChange={cambiarEstadistica(campo)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <button type="button" className={styles.botonPrimario} onClick={alContinuar}>
        Continuar con la formación
        <Icono nombre="flecha" tamano={18} strokeWidth={2} />
      </button>
    </div>
  );
}
