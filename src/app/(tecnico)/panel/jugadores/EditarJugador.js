"use client";

import { useState } from "react";
import { cambiarFoto, editarJugador } from "@/lib/data/gestionJugadores";
import { createClient } from "@/lib/supabase/client";
import CamposJugador from "./CamposJugador";
import styles from "./Gestion.module.css";

const valoresDe = (j) => ({
  nombre: j.nombre,
  rol: j.rol_jugador,
  estado: j.estado === "Activo" ? "activo" : "inactivo",
  posicion: j.posicion,
  piernaHabil: j.piernaHabil,
  fechaNacimiento: j.fechaNacimiento,
  altura: j.altura ?? "",
  usuario: j.usuario,
  contrasena: "",
});

// Pestaña "Editar" de la ficha (solo administrador), copiada de la v1: cambia los datos de la
// persona y, si hace falta, su acceso a la app (renombrar el usuario, restablecer la contraseña o
// dárselo si todavía no tiene).
//
// Props: jugador (el de la lista), esMiPerfil, alGuardado(), alCancelar()
export default function EditarJugador({ jugador: j, esMiPerfil, alGuardado, alCancelar }) {
  const inicial = valoresDe(j);
  const [valores, setValores] = useState(inicial);
  const [archivoFoto, setArchivoFoto] = useState(null);
  const [vistaFoto, setVistaFoto] = useState(j.foto);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo, valor) => {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
    setError("");
  };

  function elegirFoto(archivo) {
    setArchivoFoto(archivo);
    setVistaFoto(URL.createObjectURL(archivo));
  }

  // Solo se manda lo que cambió.
  function cambios() {
    const c = {};
    const nombre = valores.nombre.trim();
    if (nombre !== inicial.nombre) c.nombre = nombre;
    if (valores.rol !== inicial.rol) c.rol = valores.rol;
    if (valores.estado !== inicial.estado) c.estado = valores.estado;
    if (valores.posicion !== inicial.posicion) c.posicion = valores.posicion;
    if (valores.piernaHabil !== inicial.piernaHabil) c.pierna_habil = valores.piernaHabil;
    if (valores.fechaNacimiento !== inicial.fechaNacimiento) c.fecha_nacimiento = valores.fechaNacimiento;
    if (String(valores.altura) !== String(inicial.altura)) c.altura = valores.altura;
    const usuario = valores.usuario.trim();
    if (usuario !== inicial.usuario) c.usuario = usuario;
    if (valores.contrasena) c.contrasena = valores.contrasena;
    return c;
  }

  async function guardar() {
    if (!valores.nombre.trim()) return setError("El nombre es obligatorio");
    const c = cambios();
    if (!j.tieneAcceso && Boolean(c.usuario) !== Boolean(c.contrasena)) {
      return setError("Para dar acceso hacen falta usuario y contraseña");
    }
    if (Object.keys(c).length === 0 && !archivoFoto) return setError("No hay cambios para guardar");

    setGuardando(true);
    const supabase = createClient();
    if (Object.keys(c).length > 0) {
      const resultado = await editarJugador(supabase, j.jugador_id, c);
      if (!resultado.ok) {
        setGuardando(false);
        return setError(resultado.error);
      }
    }
    let avisoFoto = "";
    if (archivoFoto) {
      const foto = await cambiarFoto(supabase, j.jugador_id, archivoFoto, j.fotoPath);
      if (!foto.ok) avisoFoto = ` (la foto no se pudo subir: ${foto.error.toLowerCase()})`;
    }
    setGuardando(false);
    alGuardado(avisoFoto);
  }

  return (
    <div className={styles.formulario}>
      <CamposJugador
        valores={valores}
        alCambiar={cambiar}
        modo="editar"
        tieneAcceso={j.tieneAcceso}
        rolYEstadoFijos={esMiPerfil}
        foto={{ url: vistaFoto }}
        alElegirFoto={elegirFoto}
      />
      {esMiPerfil && (
        <div className={`${styles.pista} ${styles.ancho}`}>Es tu propia cuenta: no podés cambiarte el rol ni el estado.</div>
      )}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      <div className={styles.acciones}>
        <button type="button" className={`${styles.boton} ${styles.botonPrimario}`} onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
        <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={alCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
