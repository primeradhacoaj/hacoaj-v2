"use client";

import { useEffect, useRef, useState } from "react";
import Icono from "@/components/Icono";
import { cx } from "@/lib/cx";
import { exportarFichaJugador } from "@/lib/exportarFichaJugador";
import EditarJugador from "./EditarJugador";
import styles from "./FichaJugador.module.css";

const PESTANAS_BASE = [
  { clave: "info", titulo: "Información" },
  { clave: "fuerza", titulo: "Fuerza" },
  { clave: "pliegues", titulo: "Pliegues" },
  { clave: "pesos", titulo: "Pesos" },
];

// "dd/mm/aaaa" → más nuevo primero.
function porFechaDesc(a, b) {
  const [da, ma, aa] = a.fecha.split("/").map(Number);
  const [db, mb, ab] = b.fecha.split("/").map(Number);
  return new Date(ab, mb - 1, db) - new Date(aa, ma - 1, da);
}

function valorOGuion(valor) {
  return valor === "" || valor == null ? "—" : valor;
}

// Ficha completa de un jugador, copiada de la v1: datos personales y el
// historial de fuerza, pliegues y pesos, con exportación a Excel. El
// administrador además puede editar a la persona (y su acceso a la app) y
// eliminarla.
export default function FichaJugador({
  jugador: j,
  esAdmin,
  esMiPerfil,
  historialFuerza,
  historialPliegues,
  onCerrar,
  onGuardado,
  onEliminar,
}) {
  const [pestana, setPestana] = useState("info");
  const botonCerrar = useRef(null);
  const alCerrar = useRef(onCerrar);

  useEffect(() => {
    alCerrar.current = onCerrar;
  });

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    botonCerrar.current?.focus();
    const alTeclear = (e) => e.key === "Escape" && alCerrar.current();
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", alTeclear);
    };
  }, []);

  const sentadilla = historialFuerza.sentadilla.filter((r) => r.jugador === j.nombre).sort(porFechaDesc);
  const pecho = historialFuerza.pecho.filter((r) => r.jugador === j.nombre).sort(porFechaDesc);
  const pliegues = historialPliegues.pliegues.filter((r) => r.jugador === j.nombre).sort(porFechaDesc);
  const pesos = historialPliegues.pesos.filter((r) => r.jugador === j.nombre).sort(porFechaDesc);

  const pestanas = esAdmin ? [...PESTANAS_BASE, { clave: "editar", titulo: "Editar" }] : PESTANAS_BASE;

  const infoItems = [
    ["Posición", j.posicion],
    ["Pierna hábil", j.piernaHabil],
    ["Edad", j.edad ? `${j.edad} años` : null],
    ["Altura", j.altura ? `${j.altura} cm` : null],
    ["Último peso", j.peso ? `${j.peso} kg` : null],
    ["Nacimiento", j.nacimiento],
  ];

  return (
    <div className={styles.fondo} onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="ficha-nombre">
        <div className={styles.cabecera}>
          <button ref={botonCerrar} type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" tamano={16} strokeWidth={2} />
          </button>
          <div className={styles.avatar}>
            {iniciales(j.nombre)}
            {j.foto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={j.foto} alt="" className={styles.foto} />
            )}
          </div>
          <div>
            <h2 id="ficha-nombre">{j.nombre}</h2>
            <div className={styles.metaCabecera}>
              {[j.posicion, j.piernaHabil, j.edad ? `${j.edad} años` : null, j.altura ? `${j.altura} cm` : null]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        </div>

        <div className={styles.cuerpo}>
          <div className={styles.tabs} role="tablist" aria-label="Ficha del jugador">
            {pestanas.map((p) => (
              <button
                key={p.clave}
                type="button"
                role="tab"
                aria-selected={p.clave === pestana}
                className={cx(styles.tab, p.clave === pestana && styles.tabActiva)}
                onClick={() => setPestana(p.clave)}
              >
                {p.titulo}
              </button>
            ))}
          </div>

          {pestana === "info" && (
            <div>
              <div className={styles.infoGrilla}>
                {infoItems.map(([etiqueta, valor]) => (
                  <div key={etiqueta} className={styles.infoItem}>
                    <div className={styles.infoEtiqueta}>{etiqueta}</div>
                    <div className={cx(styles.infoValor, !valor && styles.infoVacio)}>
                      {valor || "Sin datos"}
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.acciones}>
                <button
                  type="button"
                  className={styles.botonDescargar}
                  onClick={() => exportarFichaJugador({ jugador: j, sentadilla, pecho, pliegues, pesos })}
                >
                  <Icono nombre="descargar" tamano={16} strokeWidth={2} />
                  Descargar Excel
                </button>
                {esAdmin && !esMiPerfil && (
                  <button type="button" className={styles.botonEliminar} onClick={onEliminar}>
                    Eliminar jugador
                  </button>
                )}
              </div>
            </div>
          )}

          {pestana === "fuerza" && (
            <>
              <TablaHistorial
                titulo="Sentadilla"
                filas={sentadilla}
                columnas={[
                  ["fecha", "Fecha"],
                  ["peso", "Peso"],
                  ["carga", "Carga"],
                  ["vmp", "VMP"],
                  ["rm", "RM"],
                  ["fRelativa", "F.Rel"],
                  ["comentario", "Comentario"],
                ]}
              />
              <TablaHistorial
                titulo="Press de pecho"
                filas={pecho}
                columnas={[
                  ["fecha", "Fecha"],
                  ["peso", "Peso"],
                  ["carga", "Carga"],
                  ["vmp", "VMP"],
                  ["rm", "RM"],
                  ["fRelativa", "F.Rel"],
                  ["comentario", "Comentario"],
                ]}
              />
            </>
          )}

          {pestana === "pliegues" && (
            <TablaHistorial
              filas={pliegues}
              columnas={[
                ["fecha", "Fecha"],
                ["peso", "Peso"],
                ["talla", "Talla"],
                ["imc", "IMC"],
                ["plTricipital", "Tricipital"],
                ["plSubescapular", "Subescap."],
                ["plSupraespinal", "Supraespinal"],
                ["plAbdominal", "Abdominal"],
                ["plMuslo", "Muslo"],
                ["plPantorrilla", "Pantorrilla"],
                ["sumatoria6", "Σ 6 pl."],
                ["pesoIdeal", "P. Ideal"],
                ["comentario", "Comentario"],
              ]}
            />
          )}

          {pestana === "pesos" && (
            <TablaHistorial
              filas={pesos}
              columnas={[
                ["fecha", "Fecha"],
                ["peso", "Peso (kg)"],
              ]}
            />
          )}

          {pestana === "editar" && (
            <EditarJugador
              jugador={j}
              esMiPerfil={esMiPerfil}
              alGuardado={(extra) => {
                setPestana("info");
                onGuardado(extra);
              }}
              alCancelar={() => setPestana("info")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TablaHistorial({ titulo, filas, columnas }) {
  return (
    <div className={styles.seccionHistorial}>
      {titulo && <div className={styles.tituloHistorial}>{titulo}</div>}
      <div className={styles.tablaContenedor}>
        <table>
          <thead>
            <tr>
              {columnas.map(([, etiqueta]) => (
                <th key={etiqueta}>{etiqueta}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.length > 0 ? (
              filas.map((fila, indice) => (
                <tr key={`${fila.fecha}-${indice}`}>
                  {columnas.map(([clave]) => (
                    <td key={clave}>{valorOGuion(fila[clave])}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnas.length} className={styles.sinRegistros}>
                  Sin registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
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
