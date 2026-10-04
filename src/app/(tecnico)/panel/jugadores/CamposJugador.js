"use client";

import { cx } from "@/lib/cx";
import styles from "./Gestion.module.css";

const POSICIONES = ["Arquero", "Central", "Lateral", "Volante", "Mediocampista", "Delantero"];
const PIERNAS = ["Derecha", "Izquierda", "Ambidiestro"];
const ROLES = [
  ["jugador", "Jugador"],
  ["tecnico", "Técnico"],
  ["administrador", "Administrador"],
  ["staff", "Staff"],
];

const iniciales = (nombre) =>
  nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();

// Campos del formulario de un jugador, compartidos por "Agregar" y "Editar" (copiados de la v1).
//
// Props:
//   valores        { nombre, rol, estado, posicion, piernaHabil, fechaNacimiento, altura, usuario, contrasena }
//   alCambiar      (campo, valor) => void
//   modo           "agregar" | "editar"
//   tieneAcceso    (editar) si la persona ya tiene login
//   rolYEstadoFijos  no se puede cambiar el rol ni el estado (es la propia cuenta)
//   foto           { url, nombre } para la vista previa
//   alElegirFoto   (archivo) => void
export default function CamposJugador({ valores, alCambiar, modo, tieneAcceso, rolYEstadoFijos, foto, alElegirFoto }) {
  const cambiar = (campo) => (e) => alCambiar(campo, e.target.value);
  const esStaff = valores.rol === "staff";
  const exigeAcceso = valores.rol === "tecnico" || valores.rol === "administrador";
  // Si el valor guardado no está en la lista (dato viejo), igual se muestra.
  const posiciones = valores.posicion && !POSICIONES.includes(valores.posicion) ? [...POSICIONES, valores.posicion] : POSICIONES;
  const piernas = valores.piernaHabil && !PIERNAS.includes(valores.piernaHabil) ? [...PIERNAS, valores.piernaHabil] : PIERNAS;

  return (
    <>
      <div className={cx(styles.campo, styles.ancho)}>
        <span className={styles.etiqueta}>Foto</span>
        <div className={styles.foto}>
          <div className={styles.fotoVista}>
            {iniciales(valores.nombre || "?")}
            {foto.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto.url} alt="" />
            )}
          </div>
          <label className={styles.elegirFoto}>
            {foto.url ? "Cambiar foto" : "Elegir foto"}
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && alElegirFoto(e.target.files[0])} />
          </label>
        </div>
      </div>

      <div className={styles.campo}>
        <label htmlFor="jug-nombre">Nombre completo *</label>
        <input id="jug-nombre" type="text" value={valores.nombre} onChange={cambiar("nombre")} placeholder="Ej: Juan Pérez" />
      </div>
      <div className={styles.campo}>
        <label htmlFor="jug-rol">Rol</label>
        <select id="jug-rol" value={valores.rol} onChange={cambiar("rol")} disabled={rolYEstadoFijos}>
          {ROLES.map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
      </div>

      {!esStaff && (
        <>
          <div className={styles.campo}>
            <label htmlFor="jug-posicion">Posición</label>
            <select id="jug-posicion" value={valores.posicion} onChange={cambiar("posicion")}>
              <option value="">Sin definir</option>
              {posiciones.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor="jug-pierna">Pierna hábil</label>
            <select id="jug-pierna" value={valores.piernaHabil} onChange={cambiar("piernaHabil")}>
              <option value="">Sin definir</option>
              {piernas.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className={styles.campo}>
        <label htmlFor="jug-nacimiento">Fecha de nacimiento</label>
        <input id="jug-nacimiento" type="date" value={valores.fechaNacimiento} onChange={cambiar("fechaNacimiento")} />
      </div>
      {modo === "editar" && !esStaff ? (
        <div className={styles.campo}>
          <label htmlFor="jug-altura">Altura (cm)</label>
          <input id="jug-altura" type="number" min="140" max="220" step="0.1" value={valores.altura} onChange={cambiar("altura")} />
        </div>
      ) : (
        <div />
      )}

      <div className={styles.campo}>
        <label htmlFor="jug-estado">Estado</label>
        <select id="jug-estado" value={valores.estado} onChange={cambiar("estado")} disabled={rolYEstadoFijos}>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>
      <div />

      {!esStaff && (
        <div className={styles.acceso}>
          <div className={styles.tituloAcceso}>
            Acceso a la app
            {modo === "editar" && (
              <span className={cx(styles.estadoAcceso, tieneAcceso ? styles.conAcceso : styles.sinAcceso)}>
                {tieneAcceso ? "Tiene acceso" : "Sin acceso"}
              </span>
            )}
          </div>
          <div className={styles.campo}>
            <label htmlFor="jug-usuario">Usuario{exigeAcceso ? " *" : ""}</label>
            <input id="jug-usuario" type="text" value={valores.usuario} onChange={cambiar("usuario")} placeholder="Ej: jperez" autoComplete="off" />
          </div>
          <div className={styles.campo}>
            <label htmlFor="jug-contrasena">
              {modo === "editar" && tieneAcceso ? "Nueva contraseña" : `Contraseña${exigeAcceso ? " *" : ""}`}
            </label>
            <input
              id="jug-contrasena"
              type="text"
              value={valores.contrasena}
              onChange={cambiar("contrasena")}
              placeholder={modo === "editar" && tieneAcceso ? "Vacío = no cambiarla" : "Contraseña inicial"}
              autoComplete="off"
            />
          </div>
          <div className={cx(styles.pista, styles.ancho)}>
            {modo === "editar" && tieneAcceso
              ? "Cambiar el usuario o la contraseña le cierra las sesiones abiertas. La contraseña actual no se puede ver."
              : exigeAcceso
                ? "Un técnico o administrador necesita usuario y contraseña para entrar."
                : "Opcional: sin usuario y contraseña no puede entrar a la app (se le puede dar acceso después)."}
          </div>
        </div>
      )}
    </>
  );
}
