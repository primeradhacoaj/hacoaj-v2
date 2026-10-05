"use client";

import { useState } from "react";
import Aviso from "@/components/Aviso";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import {
  guardarTestsFuerza,
  obtenerUltimoComentario,
  obtenerUltimoPeso,
} from "@/lib/data/cargarDatos";
import { enviarNotificacion } from "@/lib/data/notificaciones";
import { estimarRm, fuerzaRelativa } from "@/lib/estimacionRm";
import { exportarTabla } from "@/lib/exportarEncuestasPlantel";
import { createClient } from "@/lib/supabase/client";
import { useAviso } from "@/lib/useAviso";
import {
  AccionesFila,
  BotonesRegistros,
  fechaCorta,
  FechaSesion,
  hoyIso,
  NuevoJugador,
  SelectorJugador,
  Ventana,
} from "./_componentes/Piezas";
import styles from "./CargarDatos.module.css";

const ETIQUETAS = { sentadilla: "Sentadilla", pecho: "Pecho" };
const redondear = (valor, decimales) => Number(valor.toFixed(decimales));

// Cargar tests de fuerza (copiado de la v1), para sentadilla o press de pecho: se elige la fecha
// de la sesión, se busca al jugador, se confirma su peso (el último pesaje o uno nuevo) y se anota
// la velocidad (VMP) y la carga; el RM estimado y la fuerza relativa se calculan solos. Los
// registros se acumulan en una lista que se guarda toda junta. Se puede cargar a CUALQUIER
// jugador (activo o no) y crear uno nuevo inactivo si no está en la base.
//
// Props: tipo ("sentadilla" | "pecho") y jugadores ([{ id, nombre, activo, foto }]).
export default function CargarFuerza({ tipo, jugadores: jugadoresIniciales }) {
  const etiqueta = ETIQUETAS[tipo];
  const aviso = useAviso();
  const [jugadores, setJugadores] = useState(jugadoresIniciales);
  const [fechaSesion, setFechaSesion] = useState(hoyIso());
  const [notificar, setNotificar] = useState(true); // como en la v1: viene tildado

  const [jugador, setJugador] = useState(null);
  const [ultimoPeso, setUltimoPeso] = useState(null); // { peso, fecha } del último pesaje, o null
  const [modoPeso, setModoPeso] = useState("nuevo"); // "ultimo" | "nuevo"
  const [nuevoPeso, setNuevoPeso] = useState("");
  const [fechaNuevoPeso, setFechaNuevoPeso] = useState(hoyIso());
  const [vmp, setVmp] = useState("");
  const [carga, setCarga] = useState("");
  const [ultimoComentario, setUltimoComentario] = useState("");
  const [modoComentario, setModoComentario] = useState("nuevo"); // "ultimo" | "nuevo"
  const [comentario, setComentario] = useState("");

  const [registros, setRegistros] = useState([]);
  const [nuevoNombre, setNuevoNombre] = useState(null);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // ── Valores calculados del formulario ──
  const usaUltimo = modoPeso === "ultimo" && ultimoPeso;
  const peso = usaUltimo ? ultimoPeso.peso : parseFloat(nuevoPeso) || 0;
  const fechaPeso = usaUltimo ? ultimoPeso.fecha : fechaNuevoPeso;
  const vmpNumero = parseFloat(vmp) || 0;
  const cargaNumero = parseFloat(carga) || 0;
  const rm = estimarRm(tipo, vmpNumero, cargaNumero);
  const frel = fuerzaRelativa(rm, peso);
  const puedeAgregar = Boolean(jugador) && peso > 0 && vmpNumero > 0 && cargaNumero > 0;
  const pendientes = registros.filter((r) => !r.guardado).length;

  // Al elegir un jugador se traen su último peso y su último comentario de este test.
  async function elegirJugador(elegido) {
    setJugador(elegido);
    const supabase = createClient();
    const [pesoPrevio, comentarioPrevio] = await Promise.all([
      obtenerUltimoPeso(supabase, elegido.id).catch(() => null),
      obtenerUltimoComentario(supabase, elegido.id, tipo).catch(() => ""),
    ]);
    setUltimoPeso(pesoPrevio);
    setModoPeso(pesoPrevio ? "ultimo" : "nuevo");
    setUltimoComentario(comentarioPrevio);
    setModoComentario(comentarioPrevio ? "ultimo" : "nuevo");
    setComentario(comentarioPrevio);
  }

  function limpiarFormulario() {
    setJugador(null);
    setUltimoPeso(null);
    setModoPeso("nuevo");
    setNuevoPeso("");
    setFechaNuevoPeso(hoyIso());
    setVmp("");
    setCarga("");
    setUltimoComentario("");
    setModoComentario("nuevo");
    setComentario("");
  }

  function agregar() {
    setRegistros((actuales) => [
      ...actuales,
      {
        jugador,
        peso,
        vmp: vmpNumero,
        carga: cargaNumero,
        rm: redondear(rm, 1),
        frel: redondear(frel, 2),
        fechaTest: fechaSesion,
        fechaPeso,
        comentario: comentario.trim(),
        pesoNuevo: modoPeso === "nuevo",
        guardado: false,
      },
    ]);
    aviso.mostrar(`✓ ${jugador.nombre} agregado a la lista`, "exito");
    limpiarFormulario();
  }

  async function guardarTodo() {
    const lista = registros.filter((r) => !r.guardado);
    if (lista.length === 0) return;

    setGuardando(true);
    const resultado = await guardarTestsFuerza(
      createClient(),
      tipo,
      lista.map((r) => ({
        perfil_id: r.jugador.id,
        peso: r.peso,
        fecha_peso: r.fechaPeso,
        peso_nuevo: r.pesoNuevo,
        vmp: r.vmp,
        carga: r.carga,
        rm: r.rm,
        frel: r.frel,
        fecha_test: r.fechaTest,
        comentario: r.comentario,
      })),
    );
    setGuardando(false);

    if (!resultado.ok) return aviso.mostrar(resultado.error, "error");
    setRegistros((actuales) => actuales.map((r) => ({ ...r, guardado: true })));
    aviso.mostrar(`✓ ${resultado.guardados} registros guardados en la base de datos`, "exito");

    if (notificar) {
      const envio = await enviarNotificacion({
        titulo: "Nuevo test disponible 💪",
        mensaje: `Tu test de ${tipo === "pecho" ? "press de pecho" : "sentadilla"} ya está listo. ¡Chequealo ahora!`,
        url: "/fuerza",
        destinatarios: [...new Set(lista.map((r) => r.jugador.id))],
      });
      if (!envio.ok) aviso.mostrar(`Notificación no enviada: ${envio.error}`, "error");
      else if (envio.enviados > 0) aviso.mostrar(`Notificaciones enviadas a ${envio.enviados} dispositivos`, "exito");
      else aviso.mostrar("Notificación no enviada: ninguno de esos jugadores tiene las notificaciones activadas");
    }
  }

  // ── Edición de un registro de la lista ──
  const edicionVmp = parseFloat(editando?.vmp) || 0;
  const edicionCarga = parseFloat(editando?.carga) || 0;
  const edicionPeso = parseFloat(editando?.peso) || 0;
  const edicionRm = estimarRm(tipo, edicionVmp, edicionCarga);

  function aplicarEdicion() {
    if (!(edicionPeso > 0 && edicionVmp > 0 && edicionCarga > 0)) {
      return aviso.mostrar("Completá peso, VMP y carga", "error");
    }
    setRegistros((actuales) =>
      actuales.map((r, i) =>
        i === editando.indice
          ? {
              ...r,
              peso: edicionPeso,
              vmp: edicionVmp,
              carga: edicionCarga,
              rm: redondear(edicionRm, 1),
              frel: redondear(fuerzaRelativa(edicionRm, edicionPeso), 2),
              comentario: editando.comentario.trim(),
            }
          : r,
      ),
    );
    setEditando(null);
    aviso.mostrar("✓ Registro actualizado", "exito");
  }

  const descargar = () => {
    exportarTabla(
      registros.map((r) => ({
        jugador: r.jugador.nombre,
        peso: r.peso,
        vmp: r.vmp,
        carga: r.carga,
        rm: r.rm,
        frel: r.frel,
        fechaTest: fechaCorta(r.fechaTest),
        fechaPeso: fechaCorta(r.fechaPeso),
        comentario: r.comentario,
      })),
      [
        ["jugador", "Jugador"],
        ["peso", "Peso"],
        ["vmp", `VMP ${etiqueta.toUpperCase()}`],
        ["carga", "Carga Externa"],
        ["rm", "RM Estimado"],
        ["frel", "F. Relativa"],
        ["fechaTest", "Fecha Testeo"],
        ["fechaPeso", "Fecha Peso"],
        ["comentario", "Comentario"],
      ],
      `fuerza_${tipo}_${fechaSesion.replaceAll("-", "")}`,
      `Fuerza ${etiqueta}`,
    );
    aviso.mostrar("✓ Excel descargado", "exito");
  };

  return (
    <div className={styles.contenido}>
      <FechaSesion valor={fechaSesion} alCambiar={setFechaSesion} pista="Se aplica a todos los registros de esta sesión" />

      <div className={styles.tarjeta}>
        <div className={styles.tituloTarjeta}>
          <Icono nombre="mas" tamano={19} strokeWidth={1.7} /> Nuevo registro
        </div>
        <div className={styles.subtituloTarjeta}>Completá los campos y tocá &quot;Siguiente&quot; para agregarlo a la lista.</div>

        <span className={styles.etiqueta}>Jugador</span>
        <SelectorJugador
          jugadores={jugadores}
          elegido={jugador}
          alElegir={elegirJugador}
          alQuitar={limpiarFormulario}
          alCrear={setNuevoNombre}
        />

        {jugador && (
          <>
            {!ultimoPeso && (
              <div className={styles.alerta} role="status">
                <Icono nombre="campana" tamano={16} strokeWidth={2} />
                Este jugador no tiene ningún peso registrado. Ingresá uno nuevo.
              </div>
            )}

            <span className={styles.etiqueta}>Peso</span>
            <div className={styles.alternador}>
              {ultimoPeso && (
                <button
                  type="button"
                  className={cx(styles.opcionAlternador, modoPeso === "ultimo" && styles.opcionActiva)}
                  onClick={() => setModoPeso("ultimo")}
                >
                  Último: {ultimoPeso.peso} kg ({fechaCorta(ultimoPeso.fecha)})
                </button>
              )}
              <button
                type="button"
                className={cx(styles.opcionAlternador, modoPeso === "nuevo" && styles.opcionActiva)}
                onClick={() => setModoPeso("nuevo")}
              >
                Nuevo peso
              </button>
            </div>
            {modoPeso === "nuevo" && (
              <div className={styles.cuadricula2} style={{ marginBottom: 14 }}>
                <div>
                  <label htmlFor="nuevo-peso" className={styles.etiqueta}>
                    Peso (kg)
                  </label>
                  <input
                    id="nuevo-peso"
                    type="number"
                    step="0.1"
                    min="30"
                    max="200"
                    className={styles.campo}
                    placeholder="75.5"
                    value={nuevoPeso}
                    onChange={(e) => setNuevoPeso(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="fecha-nuevo-peso" className={styles.etiqueta}>
                    Fecha pesaje
                  </label>
                  <input
                    id="fecha-nuevo-peso"
                    type="date"
                    className={styles.campo}
                    value={fechaNuevoPeso}
                    onChange={(e) => setFechaNuevoPeso(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className={styles.divisor} />

            <div className={styles.cuadricula2}>
              <div>
                <label htmlFor="vmp" className={styles.etiqueta}>
                  VMP
                </label>
                <input id="vmp" type="number" step="0.01" min="0" className={styles.campo} placeholder="0.45" value={vmp} onChange={(e) => setVmp(e.target.value)} />
              </div>
              <div>
                <label htmlFor="carga" className={styles.etiqueta}>
                  Carga externa (kg)
                </label>
                <input id="carga" type="number" step="0.5" min="0" className={styles.campo} placeholder="80" value={carga} onChange={(e) => setCarga(e.target.value)} />
              </div>
            </div>
            <div className={styles.separacion} />
            <div className={styles.cuadricula3}>
              <div>
                <label className={styles.etiqueta}>RM Estimado</label>
                <input type="text" className={styles.campo} readOnly tabIndex={-1} value={rm > 0 ? rm.toFixed(1) : "—"} />
                <div className={styles.pista}>Calculado</div>
              </div>
              <div>
                <label className={styles.etiqueta}>F. Relativa</label>
                <input type="text" className={styles.campo} readOnly tabIndex={-1} value={frel > 0 ? frel.toFixed(2) : "—"} />
                <div className={styles.pista}>RM / Peso</div>
              </div>
              <div>
                <label className={styles.etiqueta}>Fecha peso</label>
                <input type="text" className={styles.campo} readOnly tabIndex={-1} value={peso > 0 ? fechaCorta(fechaPeso) : "—"} />
              </div>
            </div>

            <div className={styles.divisor} />

            <span className={styles.etiqueta}>Comentario</span>
            <div className={styles.opcionesComentario}>
              {ultimoComentario && (
                <button
                  type="button"
                  className={cx(styles.opcionComentario, modoComentario === "ultimo" && styles.opcionComentarioActiva)}
                  onClick={() => {
                    setModoComentario("ultimo");
                    setComentario(ultimoComentario);
                  }}
                >
                  Último: {ultimoComentario.length > 30 ? `${ultimoComentario.slice(0, 30)}…` : ultimoComentario}
                </button>
              )}
              <button
                type="button"
                className={cx(styles.opcionComentario, modoComentario === "nuevo" && styles.opcionComentarioActiva)}
                onClick={() => {
                  setModoComentario("nuevo");
                  setComentario("");
                }}
              >
                Nuevo
              </button>
            </div>
            <textarea
              className={styles.campo}
              rows={2}
              placeholder="Comentario sobre el testeo (opcional)..."
              style={{ resize: "vertical" }}
              aria-label="Comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </>
        )}

        <button type="button" className={styles.botonSiguiente} disabled={!puedeAgregar} onClick={agregar}>
          <Icono nombre="flecha" tamano={18} strokeWidth={2} /> Siguiente
        </button>
      </div>

      {registros.length > 0 && (
        <div className={styles.tarjeta}>
          <div className={styles.cabeceraRegistros}>
            <div className={styles.tituloTarjeta}>
              <Icono nombre="check" tamano={19} strokeWidth={1.7} /> Registros de esta sesión
            </div>
            <div className={styles.cuentaRegistros}>
              {registros.length} registro{registros.length > 1 ? "s" : ""}
            </div>
          </div>
          <div className={styles.subtituloTarjeta}>Revisá los datos antes de guardar. Podés editar o eliminar cada fila.</div>
          <div className={styles.scrollTabla}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th>Peso</th>
                  <th>VMP</th>
                  <th>Carga</th>
                  <th>RM</th>
                  <th>F.Rel</th>
                  <th>Fecha</th>
                  <th>Comentario</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {registros.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <strong>{r.jugador.nombre}</strong>
                    </td>
                    <td>{r.peso}</td>
                    <td>{r.vmp}</td>
                    <td>{r.carga}</td>
                    <td>{r.rm}</td>
                    <td>{r.frel}</td>
                    <td>{fechaCorta(r.fechaTest)}</td>
                    <td className={styles.comentarioTabla}>{r.comentario || "—"}</td>
                    <td>
                      <AccionesFila
                        guardado={r.guardado}
                        alEditar={() =>
                          setEditando({
                            indice: i,
                            peso: String(r.peso),
                            vmp: String(r.vmp),
                            carga: String(r.carga),
                            comentario: r.comentario,
                          })
                        }
                        alBorrar={() => {
                          setRegistros((actuales) => actuales.filter((_, j) => j !== i));
                          aviso.mostrar("Registro eliminado", "exito");
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <BotonesRegistros
            todosGuardados={pendientes === 0}
            guardando={guardando}
            pendientes={pendientes}
            alGuardar={guardarTodo}
            alDescargar={descargar}
            conNotificar
            notificar={notificar}
            alCambiarNotificar={setNotificar}
          />
        </div>
      )}

      {nuevoNombre !== null && (
        <NuevoJugador
          nombreInicial={nuevoNombre}
          alCancelar={() => setNuevoNombre(null)}
          alCreado={(creado) => {
            setJugadores((actuales) => [...actuales, creado].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
            setNuevoNombre(null);
            aviso.mostrar(`✓ ${creado.nombre} creado como jugador inactivo`, "exito");
            elegirJugador(creado);
          }}
        />
      )}

      {editando && (
        <Ventana
          titulo="Editar registro"
          icono="editar"
          subtitulo='Modificá los valores. Se actualizará en la lista (no se guarda hasta que toques "Guardar todos").'
          alCerrar={() => setEditando(null)}
        >
          <div className={styles.cuadricula2} style={{ marginBottom: 12 }}>
            <div>
              <label className={styles.etiqueta}>Jugador</label>
              <input type="text" className={styles.campo} readOnly tabIndex={-1} value={registros[editando.indice].jugador.nombre} />
            </div>
            <div>
              <label htmlFor="editar-peso" className={styles.etiqueta}>
                Peso (kg)
              </label>
              <input id="editar-peso" type="number" step="0.1" className={styles.campo} value={editando.peso} onChange={(e) => setEditando({ ...editando, peso: e.target.value })} />
            </div>
          </div>
          <div className={styles.cuadricula2} style={{ marginBottom: 12 }}>
            <div>
              <label htmlFor="editar-vmp" className={styles.etiqueta}>
                VMP
              </label>
              <input id="editar-vmp" type="number" step="0.01" className={styles.campo} value={editando.vmp} onChange={(e) => setEditando({ ...editando, vmp: e.target.value })} />
            </div>
            <div>
              <label htmlFor="editar-carga" className={styles.etiqueta}>
                Carga externa (kg)
              </label>
              <input id="editar-carga" type="number" step="0.5" className={styles.campo} value={editando.carga} onChange={(e) => setEditando({ ...editando, carga: e.target.value })} />
            </div>
          </div>
          <div className={styles.cuadricula2} style={{ marginBottom: 12 }}>
            <div>
              <label className={styles.etiqueta}>RM Estimado</label>
              <input type="text" className={styles.campo} readOnly tabIndex={-1} value={edicionRm > 0 ? edicionRm.toFixed(1) : "—"} />
            </div>
            <div>
              <label className={styles.etiqueta}>F. Relativa</label>
              <input type="text" className={styles.campo} readOnly tabIndex={-1} value={fuerzaRelativa(edicionRm, edicionPeso) > 0 ? fuerzaRelativa(edicionRm, edicionPeso).toFixed(2) : "—"} />
            </div>
          </div>
          <div className={styles.grupo}>
            <label htmlFor="editar-comentario" className={styles.etiqueta}>
              Comentario
            </label>
            <textarea id="editar-comentario" className={styles.campo} rows={2} style={{ resize: "vertical" }} value={editando.comentario} onChange={(e) => setEditando({ ...editando, comentario: e.target.value })} />
          </div>
          <div className={styles.botonesVentana}>
            <button type="button" className={cx(styles.botonVentana, styles.botonCancelar)} onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button type="button" className={cx(styles.botonVentana, styles.botonAplicar)} onClick={aplicarEdicion}>
              Aplicar cambios
            </button>
          </div>
        </Ventana>
      )}

      <Aviso mensaje={aviso.mensaje} tipo={aviso.tipo} visible={aviso.visible} />
    </div>
  );
}
