"use client";

import { useState } from "react";
import Aviso from "@/components/Aviso";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import { guardarPesos } from "@/lib/data/cargarDatos";
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
} from "../_componentes/Piezas";
import styles from "../CargarDatos.module.css";

// Cargar pesajes (copiado de la v1): se elige la fecha de la sesión, se busca al jugador y se
// anota su peso; los pesajes se acumulan en una lista que se guarda toda junta. Se puede cargar a
// CUALQUIER jugador (activo o no) y crear uno nuevo inactivo si no está en la base.
//
// Props: jugadores ([{ id, nombre, activo, foto }]).
export default function CargarPesos({ jugadores: jugadoresIniciales }) {
  const aviso = useAviso();
  const [jugadores, setJugadores] = useState(jugadoresIniciales);
  const [fecha, setFecha] = useState(hoyIso());
  const [jugador, setJugador] = useState(null);
  const [peso, setPeso] = useState("");
  const [registros, setRegistros] = useState([]); // { jugador, peso, fecha, guardado }
  const [nuevoNombre, setNuevoNombre] = useState(null); // abre la ventana de "Nuevo jugador"
  const [editando, setEditando] = useState(null); // { indice, peso }
  const [guardando, setGuardando] = useState(false);

  const pesoNumero = parseFloat(peso) || 0;
  const puedeAgregar = Boolean(jugador) && pesoNumero > 0;
  const pendientes = registros.filter((r) => !r.guardado).length;

  function agregar() {
    setRegistros((actuales) => [...actuales, { jugador, peso: pesoNumero, fecha, guardado: false }]);
    aviso.mostrar(`✓ ${jugador.nombre} agregado a la lista`, "exito");
    setJugador(null);
    setPeso("");
  }

  async function guardarTodo() {
    const pendientesLista = registros.filter((r) => !r.guardado);
    if (pendientesLista.length === 0) return;

    setGuardando(true);
    const resultado = await guardarPesos(
      createClient(),
      pendientesLista.map((r) => ({ perfil_id: r.jugador.id, fecha: r.fecha, peso: r.peso })),
    );
    setGuardando(false);

    if (!resultado.ok) return aviso.mostrar(resultado.error, "error");
    setRegistros((actuales) => actuales.map((r) => ({ ...r, guardado: true })));
    aviso.mostrar(`✓ ${resultado.guardados} pesajes guardados en la base de datos`, "exito");
  }

  function aplicarEdicion() {
    const nuevoPeso = parseFloat(editando.peso);
    if (!(nuevoPeso > 0)) return aviso.mostrar("Ingresá un peso válido", "error");
    setRegistros((actuales) => actuales.map((r, i) => (i === editando.indice ? { ...r, peso: nuevoPeso } : r)));
    setEditando(null);
    aviso.mostrar("✓ Pesaje actualizado", "exito");
  }

  const descargar = () => {
    exportarTabla(
      registros.map((r) => ({ jugador: r.jugador.nombre, peso: r.peso, fecha: fechaCorta(r.fecha) })),
      [
        ["jugador", "Jugador"],
        ["peso", "Peso"],
        ["fecha", "Fecha peso"],
      ],
      `pesos_${fecha.replaceAll("-", "")}`,
      "Pesos",
    );
    aviso.mostrar("✓ Excel descargado", "exito");
  };

  return (
    <div className={styles.contenido}>
      <FechaSesion valor={fecha} alCambiar={setFecha} pista="Se aplica a todos los pesajes de esta sesión" />

      <div className={styles.tarjeta}>
        <div className={styles.tituloTarjeta}>
          <Icono nombre="mas" tamano={19} strokeWidth={1.7} /> Nuevo pesaje
        </div>
        <div className={styles.subtituloTarjeta}>Buscá al jugador, ingresá el peso y tocá &quot;Siguiente&quot; para agregarlo a la lista.</div>

        <span className={styles.etiqueta}>Jugador</span>
        <SelectorJugador
          jugadores={jugadores}
          elegido={jugador}
          alElegir={setJugador}
          alQuitar={() => setJugador(null)}
          alCrear={setNuevoNombre}
        />

        {jugador && (
          <div className={styles.grupo}>
            <label htmlFor="peso" className={styles.etiqueta}>
              Peso (kg)
            </label>
            <input
              id="peso"
              type="number"
              step="0.1"
              min="30"
              max="200"
              className={styles.campo}
              placeholder="75.5"
              autoFocus
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
            />
          </div>
        )}

        <button type="button" className={styles.botonSiguiente} disabled={!puedeAgregar} onClick={agregar}>
          <Icono nombre="flecha" tamano={18} strokeWidth={2} /> Siguiente
        </button>
      </div>

      {registros.length > 0 && (
        <div className={styles.tarjeta}>
          <div className={styles.cabeceraRegistros}>
            <div className={styles.tituloTarjeta}>
              <Icono nombre="check" tamano={19} strokeWidth={1.7} /> Pesajes de esta sesión
            </div>
            <div className={styles.cuentaRegistros}>
              {registros.length} pesaje{registros.length > 1 ? "s" : ""}
            </div>
          </div>
          <div className={styles.subtituloTarjeta}>Revisá los datos antes de guardar. Podés editar o eliminar cada fila.</div>
          <div className={styles.scrollTabla}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th>Peso (kg)</th>
                  <th>Fecha</th>
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
                    <td>{fechaCorta(r.fecha)}</td>
                    <td>
                      <AccionesFila
                        guardado={r.guardado}
                        alEditar={() => setEditando({ indice: i, peso: String(r.peso) })}
                        alBorrar={() => {
                          setRegistros((actuales) => actuales.filter((_, j) => j !== i));
                          aviso.mostrar("Pesaje eliminado", "exito");
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
          />
        </div>
      )}

      {nuevoNombre !== null && (
        <NuevoJugador
          nombreInicial={nuevoNombre}
          alCancelar={() => setNuevoNombre(null)}
          alCreado={(creado) => {
            setJugadores((actuales) => [...actuales, creado].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
            setJugador(creado);
            setNuevoNombre(null);
            aviso.mostrar(`✓ ${creado.nombre} creado como jugador inactivo`, "exito");
          }}
        />
      )}

      {editando && (
        <Ventana
          titulo="Editar pesaje"
          icono="editar"
          subtitulo='Modificá el peso. Se actualizará en la lista (no se guarda hasta que toques "Guardar todos").'
          alCerrar={() => setEditando(null)}
        >
          <div className={styles.cuadricula2}>
            <div>
              <label className={styles.etiqueta}>Jugador</label>
              <input type="text" className={styles.campo} readOnly tabIndex={-1} value={registros[editando.indice].jugador.nombre} />
            </div>
            <div>
              <label htmlFor="editar-peso" className={styles.etiqueta}>
                Peso (kg)
              </label>
              <input
                id="editar-peso"
                type="number"
                step="0.1"
                className={styles.campo}
                value={editando.peso}
                onChange={(e) => setEditando({ ...editando, peso: e.target.value })}
              />
            </div>
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
