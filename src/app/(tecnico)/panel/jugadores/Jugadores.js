"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Aviso from "@/components/Aviso";
import Icono from "@/components/Icono";
import { useSesion } from "@/components/SesionProvider";
import { cx } from "@/lib/cx";
import { useAviso } from "@/lib/useAviso";
import FichaJugador from "./FichaJugador";
import styles from "./Jugadores.module.css";

// Gestión de jugadores del panel técnico, copiada de la v1: buscador y
// filtros, una tarjeta por jugador y, al tocarla, la ficha completa.
export default function Jugadores({ jugadores, posiciones, historialFuerza, historialPliegues }) {
  const { sesion } = useSesion();
  const esAdmin = sesion.rol === "administrador";
  const { mensaje, visible, mostrar } = useAviso();
  const avisoPronto = () => mostrar("Esta sección se está migrando a la nueva versión");

  const [busqueda, setBusqueda] = useState("");
  const [posicion, setPosicion] = useState("");
  const [estado, setEstado] = useState("");
  const [elegido, setElegido] = useState(null);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return jugadores.filter((j) => {
      if (texto && !j.nombre.toLowerCase().includes(texto)) return false;
      if (posicion && j.posicion !== posicion) return false;
      if (estado && j.estado !== estado) return false;
      return true;
    });
  }, [jugadores, busqueda, posicion, estado]);

  return (
    <>
      <header className={styles.topbar}>
        <Link href="/panel" className={styles.volver}>
          <Icono nombre="flechaIzquierda" tamano={18} strokeWidth={1.7} />
          Volver
        </Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroInterior}>
          <h1>
            Gestión de <span>Jugadores</span>
          </h1>
          <p className={styles.heroTexto}>
            Fichas individuales, métricas de rendimiento y datos personales de todo el plantel.
          </p>
        </div>
      </section>

      <div className={styles.contenido}>
        <div className={styles.toolbar}>
          <div className={styles.buscador}>
            <Icono nombre="buscar" tamano={16} strokeWidth={2} className={styles.iconoBuscar} />
            <input
              type="text"
              placeholder="Buscar jugador…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar jugador"
            />
          </div>
          <select value={posicion} onChange={(e) => setPosicion(e.target.value)} className={styles.selector}>
            <option value="">Todas las posiciones</option>
            {posiciones.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className={styles.selector}>
            <option value="">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
          <span className={styles.contador}>
            {filtrados.length} {filtrados.length === 1 ? "jugador" : "jugadores"}
          </span>
          {esAdmin && (
            <button type="button" className={styles.botonAgregar} onClick={avisoPronto}>
              <Icono nombre="mas" tamano={16} strokeWidth={2} />
              Agregar jugador
            </button>
          )}
        </div>

        {filtrados.length === 0 ? (
          <div className={styles.vacio}>
            <p>No se encontraron jugadores con esos filtros.</p>
          </div>
        ) : (
          <div className={styles.grilla}>
            {filtrados.map((j) => (
              <button
                key={j.jugador_id}
                type="button"
                className={styles.tarjeta}
                onClick={() => setElegido(j)}
              >
                <span className={cx(styles.insignia, j.estado === "Activo" ? styles.activo : styles.inactivo)}>
                  {j.estado}
                </span>
                <span className={styles.avatar}>{iniciales(j.nombre)}</span>
                <span className={styles.info}>
                  <span className={styles.nombre}>{j.nombre}</span>
                  <span className={styles.meta}>
                    {[j.posicion, j.piernaHabil, j.edad ? `${j.edad} años` : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {elegido && (
        <FichaJugador
          jugador={elegido}
          esAdmin={esAdmin}
          historialFuerza={historialFuerza}
          historialPliegues={historialPliegues}
          onCerrar={() => setElegido(null)}
          onAccionPendiente={avisoPronto}
        />
      )}

      <Aviso mensaje={mensaje} visible={visible} />
    </>
  );
}

function iniciales(nombre) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}
