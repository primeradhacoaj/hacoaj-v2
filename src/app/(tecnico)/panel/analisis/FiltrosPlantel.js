"use client";

import { anioDeNacimiento, fechaCortaADate, nombreCorto } from "@/lib/analisisPlantel";
import { cx } from "@/lib/cx";
import styles from "./Metricas.module.css";

// Filtros de las pestañas Fuerza y Composición corporal, copiados de la v1:
// un botón "Filtros" (con cuántos hay puestos) que despliega una tarjeta con
// posición, pierna hábil y año de nacimiento (varias opciones a la vez), un
// buscador para elegir jugadores puntuales y, en Fuerza, el rango de fechas de
// la última medición de pecho y de sentadilla.

export const FILTROS_VACIOS = {
  posiciones: [],
  anios: [],
  pierna: "",
  jugadores: [],
  busqueda: "",
  pechoDesde: "",
  pechoHasta: "",
  sentDesde: "",
  sentHasta: "",
};

// "aaaa-mm-dd" (lo que da un <input type="date">) → Date local.
const deInput = (valor) => {
  const [a, m, d] = valor.split("-").map(Number);
  return new Date(a, m - 1, d);
};

// La última medición de la colección cae dentro del rango.
function ultimaEnRango(arr, desde, hasta) {
  if (!desde && !hasta) return true;
  if (!arr?.length) return false;
  const ultima = fechaCortaADate(arr[arr.length - 1].fecha);
  if (!ultima) return false;
  if (desde && ultima < deInput(desde)) return false;
  if (hasta && ultima > deInput(hasta)) return false;
  return true;
}

export function aplicarFiltros(jugadores, f) {
  return jugadores.filter((j) => {
    if (f.jugadores.length && !f.jugadores.includes(j.nombre)) return false;
    if (f.posiciones.length && !f.posiciones.includes(j.posicion)) return false;
    if (f.anios.length && !f.anios.includes(anioDeNacimiento(j.nacimiento))) return false;
    if (f.pierna && (j.piernaHabil || "") !== f.pierna) return false;
    if (!ultimaEnRango(j.fuerzaPecho, f.pechoDesde, f.pechoHasta)) return false;
    if (!ultimaEnRango(j.fuerzaSent, f.sentDesde, f.sentHasta)) return false;
    return true;
  });
}

export function cantidadDeFiltros(f) {
  return [f.jugadores.length, f.posiciones.length, f.anios.length, f.pierna, f.pechoDesde, f.sentDesde, f.pechoHasta, f.sentHasta].filter(
    Boolean,
  ).length;
}

// Botón "Filtros" + tarjeta desplegable.
//
// Props:
//   filtros, setFiltros   estado (forma de FILTROS_VACIOS)
//   abierto, onAlternar   si la tarjeta está desplegada
//   jugadores, posiciones todos los jugadores (para el buscador y los años) y posiciones
//   conFechas             mostrar la columna de fechas (solo en Fuerza)
export default function FiltrosPlantel({ filtros, setFiltros, abierto, onAlternar, jugadores, posiciones, conFechas = false }) {
  const cantidad = cantidadDeFiltros(filtros);
  const anios = [...new Set(jugadores.map((j) => anioDeNacimiento(j.nacimiento)).filter(Boolean))].sort();
  const busqueda = filtros.busqueda.toLowerCase();
  const sugerencias = busqueda
    ? jugadores.filter((j) => j.nombre.toLowerCase().includes(busqueda) && !filtros.jugadores.includes(j.nombre)).slice(0, 6)
    : [];

  const cambiar = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }));
  const alternarEn = (campo, valor) =>
    setFiltros((f) => ({
      ...f,
      [campo]: f[campo].includes(valor) ? f[campo].filter((v) => v !== valor) : [...f[campo], valor],
    }));

  return (
    <>
      <button type="button" className={styles.botonFiltros} onClick={onAlternar} aria-expanded={abierto}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
        </svg>
        Filtros{cantidad > 0 && <span className={styles.cuentaFiltros}>{cantidad}</span>}
      </button>

      {abierto && (
        <div className={cx(styles.card, styles.mb16)}>
          <div className={cx(styles.panelFiltros, conFechas ? styles.filtros3 : styles.filtros2)}>
            <div>
              <div className={styles.rotuloFiltro}>Posición</div>
              <div>
                <Pastilla activa={!filtros.posiciones.length} onClick={() => cambiar("posiciones", [])}>
                  Todas
                </Pastilla>
                {posiciones.map((p) => (
                  <Pastilla key={p} activa={filtros.posiciones.includes(p)} onClick={() => alternarEn("posiciones", p)}>
                    {p}
                  </Pastilla>
                ))}
              </div>

              <div className={cx(styles.rotuloFiltro, styles.separado)}>Pierna hábil</div>
              <div>
                {[
                  ["", "Todas"],
                  ["Derecha", "Derecha"],
                  ["Izquierda", "Izquierda"],
                ].map(([valor, texto]) => (
                  <Pastilla key={texto} activa={filtros.pierna === valor} onClick={() => cambiar("pierna", valor)}>
                    {texto}
                  </Pastilla>
                ))}
              </div>

              <div className={cx(styles.rotuloFiltro, styles.separado)}>Año de nacimiento</div>
              <div>
                <Pastilla activa={!filtros.anios.length} onClick={() => cambiar("anios", [])}>
                  Todos
                </Pastilla>
                {anios.map((a) => (
                  <Pastilla key={a} activa={filtros.anios.includes(a)} onClick={() => alternarEn("anios", a)}>
                    {a}
                  </Pastilla>
                ))}
              </div>
            </div>

            <div>
              <div className={styles.rotuloFiltro}>Jugadores</div>
              <div className={styles.buscador}>
                <input
                  type="text"
                  placeholder="Buscar jugador..."
                  value={filtros.busqueda}
                  onChange={(e) => cambiar("busqueda", e.target.value)}
                  autoComplete="off"
                  aria-label="Buscar jugador"
                />
                {sugerencias.length > 0 && (
                  <div className={styles.sugerencias}>
                    {sugerencias.map((j) => (
                      <button
                        key={j.nombre}
                        type="button"
                        className={styles.sugerencia}
                        onClick={() => setFiltros((f) => ({ ...f, jugadores: [...f.jugadores, j.nombre], busqueda: "" }))}
                      >
                        {j.nombre} <span className={styles.sugerenciaPosicion}>{j.posicion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {filtros.jugadores.length ? (
                <div className={styles.elegidos}>
                  {filtros.jugadores.map((n) => (
                    <button key={n} type="button" className={styles.elegido} onClick={() => alternarEn("jugadores", n)} aria-label={`Quitar a ${n}`}>
                      {nombreCorto(n)} <span>×</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.todos}>Todos los jugadores</div>
              )}
            </div>

            {conFechas && (
              <div>
                <RangoFechas
                  titulo="Fecha medición — Pecho"
                  desde={filtros.pechoDesde}
                  hasta={filtros.pechoHasta}
                  onDesde={(v) => cambiar("pechoDesde", v)}
                  onHasta={(v) => cambiar("pechoHasta", v)}
                />
                <RangoFechas
                  titulo="Fecha medición — Sentadilla"
                  separado
                  desde={filtros.sentDesde}
                  hasta={filtros.sentHasta}
                  onDesde={(v) => cambiar("sentDesde", v)}
                  onHasta={(v) => cambiar("sentHasta", v)}
                />
              </div>
            )}
          </div>
          <div className={styles.pieFiltros}>
            <button type="button" className={styles.limpiar} onClick={() => setFiltros(FILTROS_VACIOS)}>
              Limpiar filtros
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Pastilla({ activa, onClick, children }) {
  return (
    <button type="button" className={cx(styles.pastilla, activa && styles.pastillaActiva)} onClick={onClick} aria-pressed={activa}>
      {children}
    </button>
  );
}

function RangoFechas({ titulo, separado = false, desde, hasta, onDesde, onHasta }) {
  return (
    <>
      <div className={cx(styles.rotuloFiltro, separado && styles.separado)}>{titulo}</div>
      <div className={styles.filaFecha}>
        <label>
          Desde: <input type="date" value={desde} onChange={(e) => onDesde(e.target.value)} />
        </label>
      </div>
      <div className={styles.filaFecha}>
        <label>
          Hasta: <input type="date" value={hasta} onChange={(e) => onHasta(e.target.value)} />
        </label>
      </div>
    </>
  );
}
