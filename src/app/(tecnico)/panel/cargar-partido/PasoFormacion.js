"use client";

import { useEffect, useRef, useState } from "react";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import { CANTIDAD_SUPLENTES } from "@/lib/cargarPartido";
import { FORMACIONES } from "@/lib/formaciones";
import Avatar from "./Avatar";
import styles from "./CargarPartido.module.css";

const nombreCorto = (nombre) => nombre.split(" ")[0];
const clave = (tipo, indice) => `${tipo}:${indice}`;

// Paso 2: elegir el esquema y ubicar a los 11 titulares en la cancha y a los suplentes en el
// banco. Un jugador se ubica tocándolo y tocando el lugar, arrastrándolo, o tocando el lugar y
// buscándolo en la ventana. Tocar un lugar ocupado saca al jugador.
//
// Props:
//   jugadores, formacion, puestos ([{ pos, x, y, jugadorId }]), banco ([id|null] × 9), capitanId
//   alElegirFormacion(formacion), alUbicar(tipo, indice, jugadorId|null), alElegirCapitan(id)
//   alVolver(), alContinuar()
export default function PasoFormacion({
  jugadores,
  formacion,
  puestos,
  banco,
  capitanId,
  alElegirFormacion,
  alUbicar,
  alElegirCapitan,
  alVolver,
  alContinuar,
}) {
  const [seleccionado, setSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [fantasma, setFantasma] = useState(null); // { jugadorId, x, y }
  const [objetivo, setObjetivo] = useState(null); // clave del lugar sobre el que se arrastra
  const [ventana, setVentana] = useState(null); // { tipo, indice } del lugar que se está llenando
  const [busquedaVentana, setBusquedaVentana] = useState("");

  const porId = new Map(jugadores.map((j) => [j.id, j]));
  const ubicados = new Set([...puestos.map((p) => p.jugadorId), ...banco].filter(Boolean));
  const titulares = puestos.filter((p) => p.jugadorId);
  const suplentes = banco.filter(Boolean);
  const disponibles = jugadores.filter((j) => !ubicados.has(j.id)).length;

  // Escape cierra la ventana de búsqueda.
  const cerrarVentana = () => setVentana(null);
  useEffect(() => {
    if (!ventana) return undefined;
    const alTeclear = (e) => e.key === "Escape" && setVentana(null);
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [ventana]);

  function ubicar(tipo, indice, jugadorId) {
    alUbicar(tipo, indice, jugadorId);
    setSeleccionado(null);
  }

  // Tocar un lugar: ocupado → saca al jugador; vacío con jugador elegido → lo ubica; vacío sin
  // jugador elegido → abre la ventana para buscarlo.
  function tocarLugar(tipo, indice, jugadorActual) {
    if (jugadorActual) {
      alUbicar(tipo, indice, null);
    } else if (seleccionado) {
      ubicar(tipo, indice, seleccionado);
    } else {
      setBusquedaVentana("");
      setVentana({ tipo, indice });
    }
  }

  // Arrastrar un jugador de la lista a un lugar vacío (o tocarlo para elegirlo).
  const bajoElPuntero = (x, y) => document.elementFromPoint(x, y)?.closest("[data-destino]")?.dataset.destino ?? null;

  function empezarArrastre(e, jugadorId) {
    if (ubicados.has(jugadorId)) return;
    e.preventDefault();
    const x0 = e.clientX;
    const y0 = e.clientY;
    let arrastrando = false;

    const mover = (ev) => {
      if (!arrastrando && (Math.abs(ev.clientX - x0) > 8 || Math.abs(ev.clientY - y0) > 8)) arrastrando = true;
      if (!arrastrando) return;
      setFantasma({ jugadorId, x: ev.clientX, y: ev.clientY });
      setObjetivo(bajoElPuntero(ev.clientX, ev.clientY));
    };

    const soltar = (ev) => {
      document.removeEventListener("pointermove", mover);
      document.removeEventListener("pointerup", soltar);
      setFantasma(null);
      setObjetivo(null);
      if (!arrastrando) {
        setSeleccionado((actual) => (actual === jugadorId ? null : jugadorId));
        return;
      }
      const destino = bajoElPuntero(ev.clientX, ev.clientY);
      if (destino) {
        const [tipo, indice] = destino.split(":");
        ubicar(tipo, Number(indice), jugadorId);
      } else {
        setSeleccionado(null);
      }
    };

    document.addEventListener("pointermove", mover);
    document.addEventListener("pointerup", soltar);
  }

  const texto = busqueda.toLowerCase().trim();
  const visibles = jugadores.filter((j) => !texto || j.nombre.toLowerCase().includes(texto));
  const textoVentana = busquedaVentana.toLowerCase().trim();
  const libres = jugadores.filter((j) => !ubicados.has(j.id) && (!textoVentana || j.nombre.toLowerCase().includes(textoVentana)));
  const lugarResaltado = (tipo, indice) => (seleccionado || fantasma) && !ubicadoEn(tipo, indice) && (!fantasma || objetivo === clave(tipo, indice));
  const ubicadoEn = (tipo, indice) => (tipo === "cancha" ? puestos[indice].jugadorId : banco[indice]);

  return (
    <>
      <div className={styles.tarjeta}>
        <div className={styles.tituloTarjeta}>
          <Icono nombre="posiciones" tamano={18} strokeWidth={1.7} /> Formación
        </div>
        <div className={styles.subtituloTarjeta}>
          Seleccioná la formación y luego arrastrá o tocá los jugadores para ubicarlos en la cancha y en el banco.
        </div>

        <div className={styles.formaciones}>
          {Object.keys(FORMACIONES).map((nombre) => (
            <button
              key={nombre}
              type="button"
              className={cx(styles.botonFormacion, formacion === nombre && styles.botonFormacionActivo)}
              aria-pressed={formacion === nombre}
              onClick={() => {
                setSeleccionado(null);
                alElegirFormacion(nombre);
              }}
            >
              {nombre}
            </button>
          ))}
        </div>

        <div className={styles.contador}>
          <span>
            Titulares: <strong>{titulares.length}/11</strong>
          </span>
          <span>
            Suplentes: <strong>{suplentes.length}/{CANTIDAD_SUPLENTES}</strong>
          </span>
        </div>

        {titulares.length > 0 && (
          <div className={styles.capitan}>
            <Icono nombre="estrella" tamano={18} strokeWidth={1.5} />
            <label htmlFor="capitan">Capitán</label>
            <select id="capitan" value={capitanId} onChange={(e) => alElegirCapitan(e.target.value)}>
              <option value="">Seleccionar capitán...</option>
              {titulares.map((p) => (
                <option key={p.jugadorId} value={p.jugadorId}>
                  {porId.get(p.jugadorId).nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className={styles.armado}>
        <div>
          <div className={styles.contenedorCancha}>
            <div className={styles.cancha}>
              <div className={styles.lineaMedia} />
              <div className={styles.circuloCentral} />
              <div className={styles.areaArriba} />
              <div className={styles.areaAbajo} />
              <div className={styles.arcoArriba} />
              <div className={styles.arcoAbajo} />
              <div className={styles.puntoCentral} />
              {puestos.map((puesto, indice) => {
                const jugador = puesto.jugadorId ? porId.get(puesto.jugadorId) : null;
                return (
                  <button
                    key={indice}
                    type="button"
                    className={cx(
                      styles.puesto,
                      jugador ? styles.puestoLleno : styles.puestoVacio,
                      lugarResaltado("cancha", indice) && styles.resaltado,
                    )}
                    style={{ left: `${puesto.x}%`, top: `${puesto.y}%` }}
                    data-destino={jugador ? undefined : clave("cancha", indice)}
                    aria-label={jugador ? `${puesto.pos}: ${jugador.nombre} (tocar para sacar)` : `Puesto ${puesto.pos} vacío`}
                    onClick={() => tocarLugar("cancha", indice, puesto.jugadorId)}
                  >
                    {jugador ? (
                      <>
                        <Avatar jugador={jugador} className={styles.avatarPuesto} />
                        <span className={styles.etiquetaPuesto}>{puesto.pos}</span>
                        <span className={styles.nombrePuesto}>{nombreCorto(jugador.nombre)}</span>
                        {capitanId === jugador.id && <span className={styles.insigniaCapitan}>C</span>}
                      </>
                    ) : (
                      <span className={styles.etiquetaPuestoVacio}>{puesto.pos}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.banco}>
            <div className={styles.tituloBanco}>
              <Icono nombre="jugadores" tamano={14} strokeWidth={2} /> Banco de suplentes ({CANTIDAD_SUPLENTES})
            </div>
            <div className={styles.lugaresBanco}>
              {banco.map((id, indice) => {
                const jugador = id ? porId.get(id) : null;
                return (
                  <button
                    key={indice}
                    type="button"
                    className={cx(
                      styles.lugarBanco,
                      jugador && styles.lugarBancoLleno,
                      lugarResaltado("banco", indice) && styles.lugarBancoResaltado,
                    )}
                    data-destino={jugador ? undefined : clave("banco", indice)}
                    aria-label={jugador ? `Suplente ${indice + 1}: ${jugador.nombre} (tocar para sacar)` : `Suplente ${indice + 1} vacío`}
                    onClick={() => tocarLugar("banco", indice, id)}
                  >
                    {jugador ? (
                      <>
                        <Avatar jugador={jugador} className={styles.avatarBanco} />
                        <span className={styles.nombreBanco}>{nombreCorto(jugador.nombre)}</span>
                      </>
                    ) : (
                      `Suplente ${indice + 1}`
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.listaJugadores}>
          <div className={styles.tituloLista}>
            Jugadores <span className={styles.cuentaLista}>{disponibles} disponibles</span>
          </div>
          <input
            type="text"
            className={styles.buscador}
            placeholder="Buscar jugador..."
            aria-label="Buscar jugador"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <div className={styles.lista}>
            {visibles.map((jugador) => {
              const ubicado = ubicados.has(jugador.id);
              return (
                <button
                  key={jugador.id}
                  type="button"
                  className={cx(
                    styles.tarjetaJugador,
                    ubicado && styles.jugadorUbicado,
                    seleccionado === jugador.id && styles.jugadorElegido,
                  )}
                  disabled={ubicado}
                  aria-pressed={seleccionado === jugador.id}
                  onPointerDown={(e) => empezarArrastre(e, jugador.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSeleccionado((actual) => (actual === jugador.id ? null : jugador.id));
                    }
                  }}
                >
                  <Avatar jugador={jugador} />
                  <span className={styles.nombreJugador}>{jugador.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.navegacion} style={{ marginTop: 20 }}>
        <button type="button" className={styles.botonSecundario} onClick={alVolver}>
          Atrás
        </button>
        <button type="button" className={styles.botonPrimario} disabled={titulares.length < 11} onClick={alContinuar}>
          Continuar con minutos y cambios <Icono nombre="flecha" tamano={18} strokeWidth={2} />
        </button>
      </div>

      {fantasma && porId.get(fantasma.jugadorId) && (
        <div className={styles.fantasma} style={{ left: fantasma.x - 50, top: fantasma.y - 20 }}>
          <Avatar jugador={porId.get(fantasma.jugadorId)} />
          <span className={styles.nombreJugador}>{porId.get(fantasma.jugadorId).nombre}</span>
        </div>
      )}

      {ventana && (
        <>
          <div className={styles.fondoVentana} onClick={cerrarVentana} />
          <div className={styles.ventana} role="dialog" aria-modal="true" aria-label="Asignar jugador">
            <div className={styles.cabeceraVentana}>
              <div>
                <div className={styles.tituloVentana}>Asignar jugador</div>
                <div className={styles.puestoVentana}>
                  {ventana.tipo === "cancha" ? `Posición: ${puestos[ventana.indice].pos}` : `Suplente ${ventana.indice + 1}`}
                </div>
              </div>
              <button type="button" className={styles.cerrarVentana} onClick={cerrarVentana} aria-label="Cerrar">
                &times;
              </button>
            </div>
            <input
              type="text"
              className={styles.buscadorVentana}
              placeholder="Buscar por nombre..."
              aria-label="Buscar por nombre"
              autoFocus
              value={busquedaVentana}
              onChange={(e) => setBusquedaVentana(e.target.value)}
            />
            <div className={styles.listaVentana}>
              {libres.length === 0 ? (
                <div className={styles.vacioVentana}>No hay jugadores disponibles</div>
              ) : (
                libres.map((jugador) => (
                  <button
                    key={jugador.id}
                    type="button"
                    className={styles.itemVentana}
                    onClick={() => {
                      ubicar(ventana.tipo, ventana.indice, jugador.id);
                      cerrarVentana();
                    }}
                  >
                    <Avatar jugador={jugador} />
                    <span>{jugador.nombre}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
