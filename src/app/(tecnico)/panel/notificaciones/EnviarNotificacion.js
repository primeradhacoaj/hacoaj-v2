"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import IconoPanel from "@/components/IconoPanel";
import { useSesion } from "@/components/SesionProvider";
import { enviarNotificacion } from "@/lib/data/notificaciones";
import {
  DESTINOS,
  LARGO_MAXIMO_MENSAJE,
  LARGO_MAXIMO_TITULO,
  PLANTILLAS,
} from "@/lib/notificaciones";
import { cx } from "@/lib/cx";
import styles from "./Notificaciones.module.css";

function fechaCorta(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Pantalla "Enviar notificación" del panel (tecnico/enviar_notificacion.html de la v1): armar el aviso,
// elegir a quiénes y enviarlo. Les llega como notificación del celular y, al tocarla, abre la app.
export default function EnviarNotificacion({ jugadores }) {
  const router = useRouter();
  const { sesion } = useSesion();
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [url, setUrl] = useState(DESTINOS[0].url);
  const [modo, setModo] = useState("todos"); // "todos" | "elegir"
  const [elegidos, setElegidos] = useState(() => new Set());
  const [busqueda, setBusqueda] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { tipo: "exito" | "error" | "aviso", texto }

  const dispositivos = jugadores.reduce((suma, j) => suma + j.dispositivos, 0);
  const suscriptos = jugadores.filter((j) => j.dispositivos > 0);
  const filtrados = jugadores.filter((j) => {
    const q = busqueda.trim().toLowerCase();
    return !q || j.nombre.toLowerCase().includes(q) || (j.usuario ?? "").toLowerCase().includes(q);
  });
  const elegidosSinAviso = jugadores.filter((j) => elegidos.has(j.id) && j.dispositivos === 0).length;

  function alternar(id) {
    setElegidos((actuales) => {
      const nuevos = new Set(actuales);
      if (nuevos.has(id)) nuevos.delete(id);
      else nuevos.add(id);
      return nuevos;
    });
  }

  function usarPlantilla(p) {
    setTitulo(p.titulo);
    setMensaje(p.mensaje);
    setUrl(p.url);
  }

  let textoBoton = "Enviar a todos los jugadores";
  if (modo === "elegir") {
    if (elegidos.size === 0) textoBoton = "Elegí al menos un jugador";
    else if (elegidos.size === 1) textoBoton = `Enviar a ${jugadores.find((j) => elegidos.has(j.id))?.nombre ?? "1 jugador"}`;
    else textoBoton = `Enviar a ${elegidos.size} jugadores`;
  }

  async function enviar() {
    if (!titulo.trim() || !mensaje.trim()) {
      return setResultado({ tipo: "error", texto: "Completá el título y el mensaje." });
    }
    if (modo === "elegir") {
      if (elegidos.size === 0) return setResultado({ tipo: "error", texto: "Elegí al menos un jugador." });
      if (elegidosSinAviso === elegidos.size) {
        return setResultado({
          tipo: "error",
          texto: "Ningún jugador elegido tiene las notificaciones activadas. No se puede enviar el aviso.",
        });
      }
    }

    setEnviando(true);
    setResultado(null);
    const respuesta = await enviarNotificacion({
      titulo,
      mensaje,
      url,
      destinatarios: modo === "todos" ? "todos" : [...elegidos],
    });
    setEnviando(false);

    if (!respuesta.ok) return setResultado({ tipo: "error", texto: `Error: ${respuesta.error}` });
    if (respuesta.enviados === 0) {
      return setResultado({ tipo: "error", texto: "No se pudo enviar a ningún dispositivo." });
    }
    const partes = [`Enviado a ${respuesta.enviados} dispositivo(s).`];
    if (respuesta.fallidos) partes.push(`${respuesta.fallidos} fallaron.`);
    if (respuesta.sinAviso) partes.push(`${respuesta.sinAviso} jugador(es) sin notificaciones activadas no lo recibieron.`);
    setResultado({ tipo: respuesta.fallidos || respuesta.sinAviso ? "aviso" : "exito", texto: partes.join(" ") });
    router.refresh(); // actualiza el conteo (se descartan los dispositivos que ya no existen)
  }

  return (
    <>
      <p className={styles.descripcion}>
        Enviá un aviso a los jugadores que tengan las notificaciones activadas. Les llega como notificación del
        celular y, al tocarla, se abre la app.
      </p>

      <div className={styles.contador}>
        <IconoPanel nombre="campana" tamano={18} />
        <span>
          <strong>{dispositivos}</strong> dispositivos suscriptos
        </span>
      </div>

      <div className={styles.tarjeta}>
        <div className={styles.rotulo}>Plantillas rápidas</div>
        <div className={styles.plantillas}>
          {PLANTILLAS.map((p) => (
            <button key={p.nombre} type="button" className={styles.plantilla} onClick={() => usarPlantilla(p)}>
              {p.nombre}
            </button>
          ))}
        </div>

        <div className={styles.grupo}>
          <label className={styles.rotulo} htmlFor="notif-titulo">
            Título
          </label>
          <input
            id="notif-titulo"
            className={styles.campo}
            type="text"
            maxLength={LARGO_MAXIMO_TITULO}
            placeholder="Ej: ¡Nuevas mediciones disponibles!"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>

        <div className={styles.grupo}>
          <label className={styles.rotulo} htmlFor="notif-mensaje">
            Mensaje
          </label>
          <textarea
            id="notif-mensaje"
            className={cx(styles.campo, styles.texto)}
            maxLength={LARGO_MAXIMO_MENSAJE}
            placeholder="Ej: Entrá a la app para ver tus resultados de fuerza."
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
          />
        </div>

        <div className={styles.grupo}>
          <label className={styles.rotulo} htmlFor="notif-url">
            Al tocar la notificación, abrir…
          </label>
          <select id="notif-url" className={styles.campo} value={url} onChange={(e) => setUrl(e.target.value)}>
            {DESTINOS.map((d) => (
              <option key={d.url} value={d.url}>
                {d.texto}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.grupo}>
          <div className={styles.rotulo}>Destinatarios</div>
          <div className={styles.opciones}>
            <button
              type="button"
              className={cx(styles.opcion, modo === "todos" && styles.opcionActiva)}
              onClick={() => setModo("todos")}
            >
              Todos los jugadores
            </button>
            <button
              type="button"
              className={cx(styles.opcion, modo === "elegir" && styles.opcionActiva)}
              onClick={() => setModo("elegir")}
            >
              Elegir jugadores
            </button>
          </div>

          {modo === "elegir" && (
            <div className={styles.selector}>
              <input
                className={cx(styles.campo, styles.buscador)}
                type="text"
                placeholder="Buscar jugador…"
                aria-label="Buscar jugador"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <div className={styles.lista}>
                {filtrados.length === 0 && <div className={styles.vacio}>No hay jugadores activos.</div>}
                {filtrados.map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    role="checkbox"
                    aria-checked={elegidos.has(j.id)}
                    className={cx(styles.jugador, elegidos.has(j.id) && styles.jugadorElegido)}
                    onClick={() => alternar(j.id)}
                  >
                    <span className={styles.casilla} />
                    <span className={styles.jugadorNombre}>{j.nombre}</span>
                    {j.usuario && <span className={styles.jugadorUsuario}>@{j.usuario}</span>}
                    {j.dispositivos > 0 ? (
                      <span className={cx(styles.insignia, styles.conAviso)}>{j.dispositivos} disp.</span>
                    ) : (
                      <span className={cx(styles.insignia, styles.sinAviso)}>Sin suscripción</span>
                    )}
                  </button>
                ))}
              </div>
              {elegidos.size > 0 && (
                <div className={styles.cuenta}>
                  <strong>{elegidos.size}</strong> seleccionado(s)
                  {elegidosSinAviso > 0 && ` — ${elegidosSinAviso} sin suscripción (no recibirán el aviso)`}
                </div>
              )}
            </div>
          )}
        </div>

        <button type="button" className={styles.enviar} onClick={enviar} disabled={enviando}>
          <IconoPanel nombre="enviar" tamano={18} />
          {enviando ? "Enviando…" : textoBoton}
        </button>

        {resultado && (
          <div className={cx(styles.resultado, styles[resultado.tipo])} role="status">
            {resultado.texto}
          </div>
        )}
      </div>

      <h2 className={styles.titulo}>Jugadores suscriptos</h2>
      {sesion?.rol === "administrador" ? (
        <div className={cx(styles.tarjeta, styles.sinRelleno)}>
          {suscriptos.length === 0 ? (
            <div className={styles.vacio}>Ningún jugador suscripto todavía.</div>
          ) : (
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th>Usuario</th>
                  <th>Dispositivos</th>
                  <th>Suscripto desde</th>
                </tr>
              </thead>
              <tbody>
                {suscriptos.map((j) => (
                  <tr key={j.id}>
                    <td>{j.nombre}</td>
                    <td>{j.usuario ?? "—"}</td>
                    <td>{j.dispositivos}</td>
                    <td>{fechaCorta(j.desde)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className={cx(styles.tarjeta, styles.nota)}>
          <IconoPanel nombre="info" tamano={20} />
          <span>
            El detalle de jugadores suscriptos lo ve solo el administrador. Podés ver el total de dispositivos
            conectados en el contador de arriba.
          </span>
        </div>
      )}
    </>
  );
}
