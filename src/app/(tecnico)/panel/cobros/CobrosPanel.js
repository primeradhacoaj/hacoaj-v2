"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import IconoPanel from "@/components/IconoPanel";
import { cx } from "@/lib/cx";
import { ESTADOS_COBRO, TEXTO_ESTADO, formatearPesos, mensajeDeCobro } from "@/lib/cobros";
import { cancelarCobro, generarCobros, guardarConcepto } from "@/lib/data/cobros";
import { createClient } from "@/lib/supabase/client";
import styles from "./Cobros.module.css";

function fechaCorta(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const CONCEPTO_VACIO = { id: null, nombre: "", descripcion: "", precio: "", stock: "", activo: true };

// Cobros del plantel (solo administrador): conceptos con precio, links de pago de Mercado Pago por jugador y el
// estado de cada pago. El estado lo actualiza el webhook de Mercado Pago, no esta pantalla.
export default function CobrosPanel({ conceptos, pedidos, jugadores, configurado }) {
  const router = useRouter();

  // Conceptos
  const [editando, setEditando] = useState(null); // null = cerrado · objeto = formulario abierto
  const [guardando, setGuardando] = useState(false);
  const [errorConcepto, setErrorConcepto] = useState("");

  // Nuevo cobro
  const activos = conceptos.filter((c) => c.activo);
  const [conceptoId, setConceptoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [modo, setModo] = useState("todos"); // "todos" | "elegir"
  const [elegidos, setElegidos] = useState(() => new Set());
  const [busqueda, setBusqueda] = useState("");
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState(null); // { tipo: "exito" | "error" | "aviso", texto }
  const [generados, setGenerados] = useState([]);

  // Pedidos
  const [filtro, setFiltro] = useState("todos");
  const [copiado, setCopiado] = useState(null);

  const conceptoElegido = activos.find((c) => c.id === conceptoId) ?? activos[0] ?? null;
  const destinatarios = modo === "todos" ? jugadores.map((j) => j.id) : [...elegidos];
  const unidades = Number(cantidad);
  const filtrados = jugadores.filter((j) => !busqueda.trim() || j.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));

  const cobrado = pedidos.filter((p) => p.estado === "pagado").reduce((suma, p) => suma + p.monto, 0);
  const porCobrar = pedidos.filter((p) => p.estado === "pendiente").reduce((suma, p) => suma + p.monto, 0);
  const cantidadDe = (estado) => pedidos.filter((p) => p.estado === estado).length;
  const visibles = filtro === "todos" ? pedidos : pedidos.filter((p) => p.estado === filtro);

  function alternar(id) {
    setElegidos((actuales) => {
      const nuevos = new Set(actuales);
      if (nuevos.has(id)) nuevos.delete(id);
      else nuevos.add(id);
      return nuevos;
    });
  }

  async function copiar(id, texto) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(id);
      setTimeout(() => setCopiado((actual) => (actual === id ? null : actual)), 2000);
    } catch {
      setResultado({ tipo: "error", texto: "No se pudo copiar. Copialo a mano desde el link." });
    }
  }

  async function guardar(evento) {
    evento.preventDefault();
    setGuardando(true);
    setErrorConcepto("");
    const respuesta = await guardarConcepto(createClient(), {
      id: editando.id,
      nombre: editando.nombre,
      descripcion: editando.descripcion,
      precio: Number(editando.precio),
      stock: editando.stock,
      activo: editando.activo,
    });
    setGuardando(false);
    if (!respuesta.ok) return setErrorConcepto(respuesta.error);
    setEditando(null);
    router.refresh();
  }

  async function generar() {
    if (!conceptoElegido) return setResultado({ tipo: "error", texto: "Primero creá un concepto." });
    if (destinatarios.length === 0) return setResultado({ tipo: "error", texto: "Elegí al menos un jugador." });
    if (!Number.isInteger(unidades) || unidades < 1) {
      return setResultado({ tipo: "error", texto: "La cantidad tiene que ser un número entero desde 1." });
    }

    setGenerando(true);
    setResultado(null);
    setGenerados([]);
    const respuesta = await generarCobros({ conceptoId: conceptoElegido.id, perfilIds: destinatarios, cantidad: unidades });
    setGenerando(false);

    if (!respuesta.ok) return setResultado({ tipo: "error", texto: `Error: ${respuesta.error}` });
    setGenerados(respuesta.pedidos);
    setElegidos(new Set());
    if (respuesta.pedidos.length === 0) {
      setResultado({ tipo: "error", texto: "Mercado Pago no pudo generar los links de pago. Revisá las credenciales y probá de nuevo." });
    } else if (respuesta.fallidos.length > 0) {
      const nombres = respuesta.fallidos.map((f) => f.jugador).join(", ");
      setResultado({ tipo: "aviso", texto: `Se generaron ${respuesta.pedidos.length} links. No se pudo generar el de: ${nombres}.` });
    } else {
      setResultado({ tipo: "exito", texto: `Se generaron ${respuesta.pedidos.length} links de pago.` });
    }
    router.refresh();
  }

  async function cancelar(pedido) {
    if (!window.confirm(`¿Cancelar el cobro de ${pedido.concepto?.nombre} a ${pedido.jugador?.nombre}?`)) return;
    const respuesta = await cancelarCobro(createClient(), pedido.id);
    if (!respuesta.ok) return setResultado({ tipo: "error", texto: respuesta.error });
    router.refresh();
  }

  let textoBoton = `Generar links de pago (${destinatarios.length})`;
  if (modo === "todos") textoBoton = `Generar para todos los jugadores (${jugadores.length})`;
  else if (elegidos.size === 0) textoBoton = "Elegí al menos un jugador";

  return (
    <>
      <p className={styles.descripcion}>
        Cobrá cuotas, camisetas o lo que haga falta con Mercado Pago. Generás un link por jugador, se lo mandás y
        el estado del pago se actualiza solo. Esta sección la ve únicamente el administrador.
      </p>

      {!configurado && (
        <div className={cx(styles.resultado, styles.aviso)} role="alert">
          Mercado Pago todavía no está configurado en el servidor (faltan las variables{" "}
          <code>MP_ACCESS_TOKEN</code> y <code>MP_WEBHOOK_SECRET</code>). No se pueden generar links de pago.
        </div>
      )}

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Cobrado</div>
          <div className={styles.valorKpi}>{formatearPesos(cobrado)}</div>
          <div className={styles.notaKpi}>{cantidadDe("pagado")} pagos</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.etiquetaKpi}>Por cobrar</div>
          <div className={styles.valorKpi}>{formatearPesos(porCobrar)}</div>
          <div className={styles.notaKpi}>{cantidadDe("pendiente")} pendientes</div>
        </div>
      </div>

      {/* ── Conceptos ─────────────────────────────────────────────── */}
      <div className={styles.encabezadoSeccion}>
        <h2 className={styles.titulo}>Conceptos</h2>
        {!editando && (
          <button type="button" className={styles.secundario} onClick={() => setEditando({ ...CONCEPTO_VACIO })}>
            + Nuevo concepto
          </button>
        )}
      </div>

      {editando && (
        <form className={cx(styles.tarjeta, styles.formulario)} onSubmit={guardar}>
          <div className={styles.fila2}>
            <div className={styles.grupo}>
              <label className={styles.rotulo} htmlFor="cobro-nombre">Nombre</label>
              <input
                id="cobro-nombre"
                className={styles.campo}
                type="text"
                maxLength={80}
                required
                placeholder="Ej: Cuota noviembre"
                value={editando.nombre}
                onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
              />
            </div>
            <div className={styles.grupo}>
              <label className={styles.rotulo} htmlFor="cobro-precio">Precio ($)</label>
              <input
                id="cobro-precio"
                className={styles.campo}
                type="number"
                min="1"
                step="0.01"
                required
                placeholder="15000"
                value={editando.precio}
                onChange={(e) => setEditando({ ...editando, precio: e.target.value })}
              />
            </div>
          </div>
          <div className={styles.grupo}>
            <label className={styles.rotulo} htmlFor="cobro-descripcion">Descripción (opcional)</label>
            <input
              id="cobro-descripcion"
              className={styles.campo}
              type="text"
              maxLength={200}
              value={editando.descripcion ?? ""}
              onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
            />
          </div>
          <div className={styles.fila2}>
            <div className={styles.grupo}>
              <label className={styles.rotulo} htmlFor="cobro-stock">Stock (vacío = sin control)</label>
              <input
                id="cobro-stock"
                className={styles.campo}
                type="number"
                min="0"
                step="1"
                placeholder="Sin stock"
                value={editando.stock ?? ""}
                onChange={(e) => setEditando({ ...editando, stock: e.target.value })}
              />
            </div>
            <div className={styles.grupo}>
              <span className={styles.rotulo}>Estado</span>
              <div className={styles.opciones}>
                <button
                  type="button"
                  className={cx(styles.opcion, editando.activo && styles.opcionActiva)}
                  onClick={() => setEditando({ ...editando, activo: true })}
                >
                  Activo
                </button>
                <button
                  type="button"
                  className={cx(styles.opcion, !editando.activo && styles.opcionActiva)}
                  onClick={() => setEditando({ ...editando, activo: false })}
                >
                  Desactivado
                </button>
              </div>
            </div>
          </div>
          {errorConcepto && <div className={cx(styles.resultado, styles.error)} role="alert">{errorConcepto}</div>}
          <div className={styles.acciones}>
            <button type="button" className={styles.secundario} onClick={() => setEditando(null)}>Cancelar</button>
            <button type="submit" className={styles.primario} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar concepto"}
            </button>
          </div>
        </form>
      )}

      <div className={cx(styles.tarjeta, styles.sinRelleno)}>
        {conceptos.length === 0 ? (
          <div className={styles.vacio}>Todavía no hay conceptos. Creá el primero para empezar a cobrar.</div>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th className={styles.num}>Precio</th>
                  <th className={styles.num}>Stock</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {conceptos.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.nombre}</strong>
                      {c.descripcion && <div className={styles.detalle}>{c.descripcion}</div>}
                    </td>
                    <td className={styles.num}>{formatearPesos(c.precio)}</td>
                    <td className={styles.num}>{c.stock ?? "—"}</td>
                    <td>
                      <span className={cx(styles.insignia, c.activo ? styles.pagado : styles.cancelado)}>
                        {c.activo ? "Activo" : "Desactivado"}
                      </span>
                    </td>
                    <td className={styles.num}>
                      <button
                        type="button"
                        className={styles.enlace}
                        onClick={() => setEditando({ ...c, precio: String(c.precio), stock: c.stock ?? "" })}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Nuevo cobro ───────────────────────────────────────────── */}
      <h2 className={styles.titulo}>Nuevo cobro</h2>
      <div className={styles.tarjeta}>
        {activos.length === 0 ? (
          <div className={styles.vacio}>Creá un concepto activo para poder cobrarlo.</div>
        ) : (
          <>
            <div className={styles.fila2}>
              <div className={styles.grupo}>
                <label className={styles.rotulo} htmlFor="cobro-concepto">Concepto</label>
                <select
                  id="cobro-concepto"
                  className={styles.campo}
                  value={conceptoElegido?.id ?? ""}
                  onChange={(e) => setConceptoId(e.target.value)}
                >
                  {activos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} — {formatearPesos(c.precio)}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.grupo}>
                <label className={styles.rotulo} htmlFor="cobro-cantidad">Cantidad por jugador</label>
                <input
                  id="cobro-cantidad"
                  className={styles.campo}
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.grupo}>
              <div className={styles.rotulo}>Jugadores</div>
              <div className={styles.opciones}>
                <button
                  type="button"
                  className={cx(styles.opcion, modo === "todos" && styles.opcionActiva)}
                  onClick={() => setModo("todos")}
                >
                  Todos los activos
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
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {conceptoElegido && destinatarios.length > 0 && Number.isInteger(unidades) && unidades > 0 && (
              <div className={styles.total}>
                {destinatarios.length} × {formatearPesos(conceptoElegido.precio * unidades)} ={" "}
                <strong>{formatearPesos(conceptoElegido.precio * unidades * destinatarios.length)}</strong>
              </div>
            )}

            <button
              type="button"
              className={styles.enviar}
              onClick={generar}
              disabled={generando || !configurado || (modo === "elegir" && elegidos.size === 0)}
            >
              <IconoPanel nombre="enviar" tamano={18} />
              {generando ? "Generando…" : textoBoton}
            </button>
          </>
        )}

        {resultado && (
          <div className={cx(styles.resultado, styles[resultado.tipo])} role="status">
            {resultado.texto}
          </div>
        )}

        {generados.length > 0 && (
          <div className={styles.generados}>
            <div className={styles.rotulo}>Links generados</div>
            {generados.map((g) => (
              <div key={g.id} className={styles.generado}>
                <span className={styles.generadoNombre}>{g.jugador}</span>
                <span className={styles.generadoMonto}>{formatearPesos(g.monto)}</span>
                <button type="button" className={styles.secundario} onClick={() => copiar(g.id, g.link)}>
                  {copiado === g.id ? "¡Copiado!" : "Copiar link"}
                </button>
                <a
                  className={styles.secundario}
                  href={`https://wa.me/?text=${encodeURIComponent(mensajeDeCobro(g))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pedidos ───────────────────────────────────────────────── */}
      <h2 className={styles.titulo}>Cobros</h2>
      <div className={styles.filtros}>
        {[{ id: "todos", texto: "Todos" }, ...ESTADOS_COBRO].map((f) => (
          <button
            key={f.id}
            type="button"
            className={cx(styles.chip, filtro === f.id && styles.chipActivo)}
            onClick={() => setFiltro(f.id)}
          >
            {f.texto}
            {f.id !== "todos" && ` (${cantidadDe(f.id)})`}
          </button>
        ))}
      </div>
      <div className={cx(styles.tarjeta, styles.sinRelleno)}>
        {visibles.length === 0 ? (
          <div className={styles.vacio}>No hay cobros para mostrar.</div>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Jugador</th>
                  <th>Concepto</th>
                  <th className={styles.num}>Monto</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p.id}>
                    <td>{fechaCorta(p.creado_en)}</td>
                    <td>{p.jugador?.nombre ?? "—"}</td>
                    <td>
                      {p.concepto?.nombre ?? "—"}
                      {p.cantidad > 1 && <span className={styles.detalle}> × {p.cantidad}</span>}
                    </td>
                    <td className={styles.num}>{formatearPesos(p.monto)}</td>
                    <td>
                      <span className={cx(styles.insignia, styles[p.estado])}>{TEXTO_ESTADO[p.estado]}</span>
                      {p.estado === "pagado" && <div className={styles.detalle}>{fechaCorta(p.pagado_en)}</div>}
                    </td>
                    <td className={styles.num}>
                      {p.estado === "pendiente" && (
                        <>
                          {p.link_pago && (
                            <button type="button" className={styles.enlace} onClick={() => copiar(p.id, p.link_pago)}>
                              {copiado === p.id ? "¡Copiado!" : "Copiar link"}
                            </button>
                          )}
                          <button type="button" className={cx(styles.enlace, styles.peligro)} onClick={() => cancelar(p)}>
                            Cancelar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
