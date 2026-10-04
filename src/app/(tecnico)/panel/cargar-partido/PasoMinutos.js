"use client";

import { Fragment, useState } from "react";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import {
  agregarCambio,
  cambiarAsistenciaDeGol,
  cambiarEstadistica,
  cambiarMinutoDeGol,
  cambiarMinutos,
  cuposDeAsistencia,
  deshacerCambio,
  minutoDeIngreso,
  POSICIONES,
  suplentesDisponibles,
} from "@/lib/cargarPartido";
import styles from "./CargarPartido.module.css";

const nombreCorto = (nombre) => nombre.split(" ")[0];

// Paso 3: minutos, goles, asistencias y tarjetas de cada jugador, y los cambios. Cada fila es un
// puesto de la cancha; con "Cambiar" se registra quién entró y la fila se encadena (el que
// entra juega lo que le queda del partido).
//
// Props:
//   jugadores, cadenas (ver src/lib/cargarPartido.js), banco, capitanId, golesHacoaj
//   alCambiar(cadenas)   alAvisar(texto, tipo)   alVolver()   alGuardar()   guardando
export default function PasoMinutos({
  jugadores,
  cadenas,
  banco,
  capitanId,
  golesHacoaj,
  alCambiar,
  alAvisar,
  alVolver,
  alGuardar,
  guardando,
}) {
  const [cambioAbierto, setCambioAbierto] = useState(null); // índice de la cadena con el formulario abierto
  const [suplenteElegido, setSuplenteElegido] = useState("");
  const [posicionElegida, setPosicionElegida] = useState("");

  const porId = new Map(jugadores.map((j) => [j.id, j]));
  const disponibles = suplentesDisponibles(cadenas, banco);
  const { cupo, usadas } = cuposDeAsistencia(cadenas);

  function abrirCambio(indice) {
    setCambioAbierto(indice);
    setSuplenteElegido("");
    setPosicionElegida("");
  }

  function confirmarCambio(indice) {
    if (!suplenteElegido) return alAvisar("Seleccioná un suplente", "error");
    if (!posicionElegida) return alAvisar("Seleccioná la posición del suplente", "error");
    alCambiar(agregarCambio(cadenas, indice, suplenteElegido, posicionElegida));
    setCambioAbierto(null);
  }

  function estadistica(si, ci, campo, valor) {
    const resultado = cambiarEstadistica(cadenas, si, ci, campo, valor, golesHacoaj);
    alCambiar(resultado.cadenas);
    if (resultado.error) alAvisar(resultado.error, "error");
  }

  return (
    <>
      <div className={styles.tarjeta}>
        <div className={styles.tituloTarjeta}>
          <Icono nombre="calendario" tamano={18} strokeWidth={1.7} /> Minutos y estadísticas
        </div>
        <div className={styles.subtituloTarjeta}>
          Registrá minutos, goles, asistencias y tarjetas. Usá &quot;Cambiar&quot; para registrar sustituciones.
        </div>
        <div className={styles.scrollTabla}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Pos</th>
                <th>Min</th>
                <th>Gol</th>
                <th>Asi</th>
                <th>TA</th>
                <th>TR</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cadenas.map((cadena, si) =>
                cadena.map((entrada, ci) => {
                  const jugador = porId.get(entrada.id);
                  const esTitular = ci === 0;
                  const esUltima = ci === cadena.length - 1;
                  const salio = !esUltima;

                  // Asistidores que se pueden elegir para un gol: los que declararon asistencias y
                  // todavía tienen alguna sin usar en otro gol (el propio goleador no).
                  const asistidoresPara = (elegido) =>
                    [...cupo.keys()].filter(
                      (id) => id !== entrada.id && cupo.get(id) - (usadas.get(id) ?? 0) + (id === elegido ? 1 : 0) > 0,
                    );

                  return (
                    <Fragment key={entrada.id}>
                      <tr className={cx(!esTitular && styles.filaSuplente, salio && styles.filaSalio)}>
                        <td>
                          <span className={styles.nombreEntrada}>{jugador.nombre}</span>
                          {capitanId === entrada.id && <span className={styles.marcaCapitan}> (C)</span>}
                          {!esTitular && (
                            <span className={styles.infoCambio}>
                              {" "}
                              ↑ por {nombreCorto(porId.get(cadena[ci - 1].id).nombre)} min {minutoDeIngreso(cadena, ci)}&apos;
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={styles.insigniaPosicion}>{entrada.pos}</span>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="120"
                            className={styles.entradaMinutos}
                            aria-label={`Minutos de ${jugador.nombre}`}
                            value={entrada.min}
                            onChange={(e) => alCambiar(cambiarMinutos(cadenas, si, ci, e.target.value))}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className={styles.entradaEstadistica}
                            aria-label={`Goles de ${jugador.nombre}`}
                            value={entrada.goles}
                            onChange={(e) => estadistica(si, ci, "goles", e.target.value)}
                          />
                          {Array.from({ length: entrada.goles }, (_, gi) => (
                            <Fragment key={gi}>
                              <div className={styles.datoGol}>
                                <span className={styles.rotuloGol}>Min{entrada.goles > 1 ? ` ${gi + 1}` : ""}:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="120"
                                  className={styles.entradaMinutoGol}
                                  placeholder="opc."
                                  title="Minuto del gol (opcional: si no te acordás, dejalo vacío)"
                                  aria-label={`Minuto del gol ${gi + 1} de ${jugador.nombre}`}
                                  value={entrada.minutoGol[gi] ?? ""}
                                  onChange={(e) => alCambiar(cambiarMinutoDeGol(cadenas, si, ci, gi, e.target.value))}
                                />
                              </div>
                              {cupo.size > 0 && (
                                <div className={styles.datoGol}>
                                  <span className={styles.rotuloGol}>Asist{entrada.goles > 1 ? ` ${gi + 1}` : ""}:</span>
                                  <select
                                    className={styles.selectAsistencia}
                                    aria-label={`Asistencia del gol ${gi + 1} de ${jugador.nombre}`}
                                    value={entrada.asistenciaDe[gi] ?? ""}
                                    onChange={(e) => alCambiar(cambiarAsistenciaDeGol(cadenas, si, ci, gi, e.target.value))}
                                  >
                                    <option value="">Sin asist.</option>
                                    {asistidoresPara(entrada.asistenciaDe[gi]).map((id) => (
                                      <option key={id} value={id}>
                                        {porId.get(id).nombre}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </Fragment>
                          ))}
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className={styles.entradaEstadistica}
                            aria-label={`Asistencias de ${jugador.nombre}`}
                            value={entrada.asistencias}
                            onChange={(e) => estadistica(si, ci, "asistencias", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            className={styles.casilla}
                            aria-label={`Tarjeta amarilla de ${jugador.nombre}`}
                            checked={Boolean(entrada.ta)}
                            onChange={(e) => estadistica(si, ci, "ta", e.target.checked ? 1 : 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            className={styles.casilla}
                            aria-label={`Tarjeta roja de ${jugador.nombre}`}
                            checked={Boolean(entrada.tr)}
                            onChange={(e) => estadistica(si, ci, "tr", e.target.checked ? 1 : 0)}
                          />
                        </td>
                        <td>
                          {salio ? (
                            <span className={styles.infoCambio}>→ {nombreCorto(porId.get(cadena[ci + 1].id).nombre)}</span>
                          ) : (
                            <>
                              {disponibles.length > 0 && (
                                <button type="button" className={styles.botonCambiar} onClick={() => abrirCambio(si)}>
                                  Cambiar
                                </button>
                              )}
                              {!esTitular && (
                                <button type="button" className={styles.botonDeshacer} onClick={() => alCambiar(deshacerCambio(cadenas, si))}>
                                  Deshacer
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                      {esUltima && cambioAbierto === si && (
                        <tr className={styles.formularioCambio}>
                          <td colSpan={8}>
                            <div className={styles.camposCambio}>
                              <select
                                aria-label="Suplente que entra"
                                value={suplenteElegido}
                                onChange={(e) => setSuplenteElegido(e.target.value)}
                              >
                                <option value="">Suplente...</option>
                                {disponibles.map((id) => (
                                  <option key={id} value={id}>
                                    {porId.get(id).nombre}
                                  </option>
                                ))}
                              </select>
                              <select
                                aria-label="Posición del suplente"
                                value={posicionElegida}
                                onChange={(e) => setPosicionElegida(e.target.value)}
                              >
                                <option value="">Pos...</option>
                                {POSICIONES.map((pos) => (
                                  <option key={pos} value={pos}>
                                    {pos}
                                  </option>
                                ))}
                              </select>
                              <button type="button" className={styles.confirmarCambio} onClick={() => confirmarCambio(si)} aria-label="Confirmar cambio">
                                ✓
                              </button>
                              <button type="button" className={styles.cancelarCambio} onClick={() => setCambioAbierto(null)} aria-label="Cancelar cambio">
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.navegacion}>
        <button type="button" className={styles.botonSecundario} onClick={alVolver}>
          Atrás
        </button>
        <button type="button" className={styles.botonPrimario} onClick={alGuardar} disabled={guardando}>
          <Icono nombre="descargar" tamano={18} strokeWidth={2} />
          {guardando ? "Guardando..." : "Guardar partido"}
        </button>
      </div>
    </>
  );
}
