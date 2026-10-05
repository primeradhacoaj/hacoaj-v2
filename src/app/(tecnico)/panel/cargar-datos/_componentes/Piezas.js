"use client";

import { useEffect, useRef, useState } from "react";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import { crearJugadorInactivo, normalizarNombre } from "@/lib/data/cargarDatos";
import { createClient } from "@/lib/supabase/client";
import styles from "../CargarDatos.module.css";

// Piezas compartidas por las pantallas de carga de fuerza y de pesos.

const inicialesDe = (nombre) =>
  nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();

export const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// "2026-09-20" -> "20/09/2026"
export const fechaCorta = (iso) => {
  if (!iso) return "—";
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
};

export function Avatar({ jugador, className }) {
  const [fallo, setFallo] = useState(false);
  return (
    <span className={cx(styles.avatar, className)}>
      {inicialesDe(jugador.nombre)}
      {jugador.foto && !fallo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={jugador.foto} alt="" onError={() => setFallo(true)} />
      )}
    </span>
  );
}

// Fecha que se aplica a todos los registros de la sesión.
export function FechaSesion({ valor, alCambiar, pista }) {
  const esHoy = valor === hoyIso();
  return (
    <div className={styles.fechaSesion}>
      <label htmlFor="fecha-sesion" className={styles.etiqueta}>
        <Icono nombre="calendario" tamano={15} strokeWidth={2} /> Fecha de la sesión
      </label>
      <input
        id="fecha-sesion"
        type="date"
        className={styles.entradaFecha}
        value={valor}
        onChange={(e) => alCambiar(e.target.value || hoyIso())}
      />
      <div className={cx(styles.insigniaFecha, !esHoy && styles.insigniaFechaOtra)}>
        <Icono nombre="check" tamano={14} strokeWidth={2} /> {esHoy ? "Hoy" : fechaCorta(valor)}
      </div>
      <div className={styles.pistaFecha}>{pista}</div>
    </div>
  );
}

// Ventana emergente: se cierra con Escape o tocando el fondo.
export function Ventana({ titulo, subtitulo, icono, alCerrar, children }) {
  useEffect(() => {
    const alTeclear = (e) => e.key === "Escape" && alCerrar();
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [alCerrar]);

  return (
    <div className={styles.fondoVentana} onClick={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className={styles.ventana} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className={styles.tituloVentana}>
          {icono && <Icono nombre={icono} tamano={18} strokeWidth={1.7} />} {titulo}
        </div>
        {subtitulo && <div className={styles.subtituloVentana}>{subtitulo}</div>}
        {children}
      </div>
    </div>
  );
}

// Buscador de jugador. Se puede elegir CUALQUIER jugador (activo o no). Si lo que se escribió no
// existe, ofrece crearlo como jugador inactivo (`alCrear` recibe el texto escrito).
export function SelectorJugador({ jugadores, elegido, alElegir, alQuitar, alCrear }) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);

  // Tocar fuera cierra la lista de resultados.
  useEffect(() => {
    const alTocar = (e) => {
      if (!contenedor.current?.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("click", alTocar);
    return () => document.removeEventListener("click", alTocar);
  }, []);

  if (elegido) {
    return (
      <div className={styles.jugadorElegido}>
        <Avatar jugador={elegido} />
        <span className={styles.nombreElegido}>{elegido.nombre}</span>
        {!elegido.activo && <span className={styles.insigniaInactivo}>Inactivo</span>}
        <button type="button" className={styles.quitarJugador} onClick={() => { setTexto(""); alQuitar(); }} aria-label="Cambiar jugador" title="Cambiar jugador">
          <Icono nombre="cerrar" tamano={14} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  const buscado = normalizarNombre(texto);
  const coincidencias = jugadores.filter((j) => normalizarNombre(j.nombre).includes(buscado));
  const hayExacto = jugadores.some((j) => normalizarNombre(j.nombre) === buscado);
  const puedeCrear = buscado.length >= 2 && !hayExacto;

  return (
    <div className={styles.buscador} ref={contenedor}>
      <span className={styles.iconoBusqueda}>
        <Icono nombre="buscar" tamano={16} strokeWidth={2} />
      </span>
      <input
        type="text"
        className={styles.entradaBusqueda}
        placeholder="Buscá por nombre..."
        aria-label="Buscar jugador"
        autoComplete="off"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
      />
      {abierto && buscado.length > 0 && (
        <div className={styles.resultados} role="listbox">
          {coincidencias.map((jugador) => (
            <button
              key={jugador.id}
              type="button"
              className={styles.resultado}
              onClick={() => {
                alElegir(jugador);
                setTexto("");
                setAbierto(false);
              }}
            >
              <Avatar jugador={jugador} />
              {jugador.nombre}
              {!jugador.activo && <span className={styles.insigniaInactivo}>Inactivo</span>}
            </button>
          ))}
          {puedeCrear && (
            <button
              type="button"
              className={cx(styles.resultado, styles.resultadoCrear)}
              onClick={() => {
                alCrear(texto.trim().replace(/\s+/g, " "));
                setTexto("");
                setAbierto(false);
              }}
            >
              <span className={cx(styles.avatar, styles.avatarMas)}>
                <Icono nombre="mas" tamano={14} strokeWidth={2.5} />
              </span>
              Crear jugador nuevo «{texto.trim()}»
            </button>
          )}
          {coincidencias.length === 0 && !puedeCrear && <div className={styles.sinResultados}>No se encontraron jugadores</div>}
        </div>
      )}
    </div>
  );
}

const POSICIONES = ["Arquero", "Central", "Lateral", "Volante", "Delantero"];

// Ventana para crear un jugador INACTIVO y sin login. Lo único obligatorio es el nombre y apellido;
// posición, pierna hábil y fecha de nacimiento son opcionales.
export function NuevoJugador({ nombreInicial, alCancelar, alCreado }) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [posicion, setPosicion] = useState("");
  const [piernaHabil, setPiernaHabil] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function crear() {
    const limpio = nombre.trim().replace(/\s+/g, " ");
    if (limpio.split(" ").length < 2) return setError("Escribí nombre y apellido");

    setGuardando(true);
    setError("");
    const resultado = await crearJugadorInactivo(createClient(), { nombre: limpio, posicion, piernaHabil, fechaNacimiento });
    setGuardando(false);
    if (!resultado.ok) return setError(resultado.error);
    alCreado(resultado.jugador);
  }

  return (
    <Ventana
      titulo="Nuevo jugador"
      icono="mas"
      subtitulo="Se crea como jugador inactivo y sin usuario ni contraseña, solo para poder cargarle datos. Después el administrador le puede dar acceso."
      alCerrar={alCancelar}
    >
      <div className={styles.grupo}>
        <label htmlFor="nuevo-nombre" className={styles.etiqueta}>
          Nombre y apellido *
        </label>
        <input
          id="nuevo-nombre"
          type="text"
          className={styles.campo}
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            setError("");
          }}
          placeholder="Ej: Juan Pérez"
          autoFocus
        />
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
      </div>
      <div className={styles.cuadricula2}>
        <div className={styles.grupo}>
          <label htmlFor="nuevo-posicion" className={styles.etiqueta}>
            Posición (opcional)
          </label>
          <select id="nuevo-posicion" className={styles.campo} value={posicion} onChange={(e) => setPosicion(e.target.value)}>
            <option value="">—</option>
            {POSICIONES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.grupo}>
          <label htmlFor="nuevo-pierna" className={styles.etiqueta}>
            Pierna hábil (opcional)
          </label>
          <select id="nuevo-pierna" className={styles.campo} value={piernaHabil} onChange={(e) => setPiernaHabil(e.target.value)}>
            <option value="">—</option>
            <option value="Derecha">Derecha</option>
            <option value="Izquierda">Izquierda</option>
          </select>
        </div>
      </div>
      <div className={styles.grupo}>
        <label htmlFor="nuevo-nacimiento" className={styles.etiqueta}>
          Fecha de nacimiento (opcional)
        </label>
        <input
          id="nuevo-nacimiento"
          type="date"
          className={styles.campo}
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(e.target.value)}
        />
      </div>
      <div className={styles.botonesVentana}>
        <button type="button" className={cx(styles.botonVentana, styles.botonCancelar)} onClick={alCancelar}>
          Cancelar
        </button>
        <button type="button" className={cx(styles.botonVentana, styles.botonAplicar)} onClick={crear} disabled={guardando}>
          {guardando ? "Creando..." : "Crear jugador"}
        </button>
      </div>
    </Ventana>
  );
}

// Editar / borrar una fila de la lista de la sesión (o la marca de "ya guardado").
export function AccionesFila({ guardado, alEditar, alBorrar }) {
  if (guardado) return <span className={styles.insigniaGuardado}>✓</span>;
  return (
    <>
      <button type="button" className={cx(styles.accionFila, styles.accionEditar)} onClick={alEditar} aria-label="Editar" title="Editar">
        <Icono nombre="editar" tamano={15} strokeWidth={2} />
      </button>
      <button type="button" className={cx(styles.accionFila, styles.accionBorrar)} onClick={alBorrar} aria-label="Eliminar" title="Eliminar">
        <Icono nombre="papelera" tamano={15} strokeWidth={2} />
      </button>
    </>
  );
}

// Botones de abajo de la lista: guardar todo, descargar Excel y avisar a los jugadores cargados.
export function BotonesRegistros({
  todosGuardados,
  guardando,
  pendientes,
  alGuardar,
  alDescargar,
  conNotificar,
  notificar,
  alCambiarNotificar,
}) {
  return (
    <div className={styles.accionesRegistros}>
      <button type="button" className={styles.botonGuardarTodo} onClick={alGuardar} disabled={todosGuardados || guardando}>
        <Icono nombre={todosGuardados ? "check" : "descargar"} tamano={18} strokeWidth={2} />
        {todosGuardados
          ? "¡Todos guardados!"
          : guardando
            ? `Guardando ${pendientes}...`
            : "Guardar todos en la base de datos"}
      </button>
      <button type="button" className={styles.botonDescargar} onClick={alDescargar}>
        <Icono nombre="descargar" tamano={16} strokeWidth={2} /> Descargar Excel
      </button>
      {conNotificar && (
        <label className={styles.notificar}>
          <input type="checkbox" checked={notificar} onChange={(e) => alCambiarNotificar(e.target.checked)} />
          <Icono nombre="campana" tamano={14} strokeWidth={2} />
          <span>Notificar a los jugadores</span>
        </label>
      )}
    </div>
  );
}
