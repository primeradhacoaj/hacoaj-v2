"use client";

import { useState } from "react";
import Aviso from "@/components/Aviso";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import { AVISO_MIGRANDO } from "@/lib/menus";
import { useAviso } from "@/lib/useAviso";
import styles from "./CalendarioPanel.module.css";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const ICONO_EVENTO = { cumple: "🎂", partido: "⚽", testeo: "🏋️" };
const ETIQUETA_TIPO = { cumple: "Cumpleaños", testeo: "Evaluación" };

function claveDe(anio, mes, dia) {
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// Calendario del panel técnico, copiado de la v1 (`usuario/calendario.html`,
// la misma pantalla que en la v1 usan técnico y jugador — acá se deja solo
// en el panel técnico porque es donde la v1 la enlaza): cumpleaños del
// plantel, partidos de Hacoaj y testeos de fuerza/pliegues del mes.
//
// Props: anioInicial, mesInicial, eventosIniciales (ya resueltos en el
// servidor, para no arrancar en blanco); al cambiar de mes se vuelve a pedir
// a /api/calendario.
export default function CalendarioPanel({ anioInicial, mesInicial, eventosIniciales }) {
  const [anio, setAnio] = useState(anioInicial);
  const [mes, setMes] = useState(mesInicial);
  const [eventos, setEventos] = useState(eventosIniciales);
  const [cargando, setCargando] = useState(false);
  const [diaElegido, setDiaElegido] = useState(null);
  const { mensaje, visible, mostrar } = useAviso();

  const hoy = new Date();
  const claveHoy =
    hoy.getFullYear() === anio && hoy.getMonth() + 1 === mes
      ? claveDe(anio, mes, hoy.getDate())
      : null;

  const pedirMes = async (anioNuevo, mesNuevo) => {
    setAnio(anioNuevo);
    setMes(mesNuevo);
    setDiaElegido(null);
    setCargando(true);
    try {
      const resp = await fetch(`/api/calendario?year=${anioNuevo}&month=${mesNuevo}`);
      const datos = await resp.json();
      setEventos(datos.eventos);
    } finally {
      setCargando(false);
    }
  };

  const cambiarMes = (delta) => {
    let mesNuevo = mes + delta;
    let anioNuevo = anio;
    if (mesNuevo > 12) { mesNuevo = 1; anioNuevo++; }
    if (mesNuevo < 1) { mesNuevo = 12; anioNuevo--; }
    pedirMes(anioNuevo, mesNuevo);
  };

  const primerDia = new Date(anio, mes - 1, 1).getDay();
  const inicioSemana = primerDia === 0 ? 6 : primerDia - 1; // lunes primero
  const ultimoDia = new Date(anio, mes, 0).getDate();

  const celdas = [];
  for (let i = 0; i < inicioSemana; i++) celdas.push(null);
  for (let dia = 1; dia <= ultimoDia; dia++) celdas.push(dia);

  const eventosDelDia = diaElegido ? (eventos[claveDe(anio, mes, diaElegido)] ?? []) : [];

  const anios = [];
  for (let y = 2024; y <= hoy.getFullYear() + 1; y++) anios.push(y);

  return (
    <>
      <div className={styles.navegacion}>
        <button type="button" className={styles.botonNav} onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
          <Icono nombre="flechaIzquierda" tamano={16} strokeWidth={2.2} />
        </button>
        <div className={styles.centroNav}>
          <span className={styles.etiquetaMes}>{MESES[mes - 1]}</span>
          <select
            className={styles.selectorAnio}
            value={anio}
            onChange={(e) => pedirMes(Number(e.target.value), mes)}
            aria-label="Año"
          >
            {anios.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button type="button" className={styles.botonNav} onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
          <Icono nombre="flecha" tamano={16} strokeWidth={2.2} />
        </button>
      </div>

      <div className={cx(styles.layout, cargando && styles.cargando)}>
        <div className={styles.columnaGrilla}>
          <div className={styles.tarjeta}>
            <div className={styles.encabezadoDias}>
              {DIAS.map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className={styles.grilla}>
              {celdas.map((dia, indice) => {
                if (dia == null) return <div key={`vacio-${indice}`} className={cx(styles.celda, styles.vacia)} />;
                const clave = claveDe(anio, mes, dia);
                const eventosDia = eventos[clave] ?? [];
                const tipos = new Set(eventosDia.map((e) => e.tipo));
                return (
                  <button
                    type="button"
                    key={dia}
                    className={cx(
                      styles.celda,
                      clave === claveHoy && styles.hoy,
                      eventosDia.length > 0 && styles.conEventos,
                      dia === diaElegido && styles.elegida,
                    )}
                    disabled={eventosDia.length === 0}
                    onClick={() => setDiaElegido(dia === diaElegido ? null : dia)}
                  >
                    {dia}
                    {eventosDia.length > 0 && (
                      <span className={styles.puntos}>
                        {["partido", "cumple", "testeo"].filter((t) => tipos.has(t)).map((t) => (
                          <span key={t} className={cx(styles.punto, styles[`punto${t}`])} />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.columnaPanel}>
          <div className={styles.tarjeta}>
            {diaElegido ? (
              <>
                <div className={styles.fechaPanel}>
                  {diaElegido} de {MESES[mes - 1]} {anio}
                </div>
                {eventosDelDia.map((evento, indice) => (
                  <EventoFila key={indice} evento={evento} />
                ))}
              </>
            ) : (
              <p className={styles.sinSeleccion}>Elegí un día con eventos para verlos acá.</p>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.botonAgregar}
        onClick={() => mostrar(AVISO_MIGRANDO)}
        aria-label="Agregar evento"
        title="Agregar evento"
      >
        <Icono nombre="mas" tamano={22} strokeWidth={2.2} />
      </button>

      <Aviso mensaje={mensaje} visible={visible} />
    </>
  );
}

function EventoFila({ evento }) {
  if (evento.tipo === "partido") {
    const condicionTexto = evento.condicion === "L" ? "Local" : "Visitante";
    const [golesHacoaj, golesRival] = evento.resultado.split("-").map(Number);
    return (
      <div className={styles.filaEvento}>
        <span className={cx(styles.iconoEvento, styles.iconoPartido)}>{ICONO_EVENTO.partido}</span>
        <span className={styles.textoEvento}>
          <span className={styles.tituloEvento}>vs {evento.rival}</span>
          <span className={styles.subEvento}>{condicionTexto}</span>
        </span>
        <span className={cx(styles.insigniaResultado, resultadoClase(golesHacoaj, golesRival))}>
          {evento.resultado}
        </span>
      </div>
    );
  }

  return (
    <div className={styles.filaEvento}>
      <span className={cx(styles.iconoEvento, styles[`icono${evento.tipo}`])}>{ICONO_EVENTO[evento.tipo]}</span>
      <span className={styles.textoEvento}>
        <span className={styles.tituloEvento}>{evento.nombre}</span>
        <span className={styles.subEvento}>{ETIQUETA_TIPO[evento.tipo]}</span>
      </span>
    </div>
  );
}

function resultadoClase(golesHacoaj, golesRival) {
  if (golesHacoaj > golesRival) return styles.ganado;
  if (golesHacoaj < golesRival) return styles.perdido;
  return styles.empatado;
}
