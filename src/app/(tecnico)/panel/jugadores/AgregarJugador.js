"use client";

import { useEffect, useState } from "react";
import Icono from "@/components/Icono";
import { agregarJugador, cambiarFoto } from "@/lib/data/gestionJugadores";
import { createClient } from "@/lib/supabase/client";
import CamposJugador from "./CamposJugador";
import ficha from "./FichaJugador.module.css";
import styles from "./Gestion.module.css";

const VALORES_INICIALES = {
  nombre: "",
  rol: "jugador",
  estado: "activo",
  posicion: "",
  piernaHabil: "",
  fechaNacimiento: "",
  altura: "",
  usuario: "",
  contrasena: "",
};

// Ventana "Agregar jugador" (solo administrador), copiada de la v1. Un jugador puede crearse con o
// sin acceso a la app; técnico y administrador necesitan usuario y contraseña; el staff no tiene.
//
// Props: alCerrar(), alAgregado(nombre)
export default function AgregarJugador({ alCerrar, alAgregado }) {
  const [valores, setValores] = useState(VALORES_INICIALES);
  const [archivoFoto, setArchivoFoto] = useState(null);
  const [vistaFoto, setVistaFoto] = useState(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const alTeclear = (e) => e.key === "Escape" && alCerrar();
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [alCerrar]);

  const cambiar = (campo, valor) => {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
    setError("");
  };

  function elegirFoto(archivo) {
    setArchivoFoto(archivo);
    setVistaFoto(URL.createObjectURL(archivo));
  }

  async function guardar() {
    const nombre = valores.nombre.trim();
    const exigeAcceso = valores.rol === "tecnico" || valores.rol === "administrador";
    const esStaff = valores.rol === "staff";
    if (!nombre) return setError("El nombre es obligatorio");
    if (!esStaff && exigeAcceso && (!valores.usuario.trim() || !valores.contrasena)) {
      return setError("Un técnico o administrador necesita usuario y contraseña");
    }
    if (!esStaff && Boolean(valores.usuario.trim()) !== Boolean(valores.contrasena)) {
      return setError("Para dar acceso hacen falta usuario y contraseña");
    }

    setGuardando(true);
    const supabase = createClient();
    const resultado = await agregarJugador(supabase, {
      nombre,
      rol: valores.rol,
      estado: valores.estado,
      posicion: esStaff ? "" : valores.posicion,
      pierna_habil: esStaff ? "" : valores.piernaHabil,
      fecha_nacimiento: valores.fechaNacimiento,
      usuario: esStaff ? "" : valores.usuario,
      contrasena: esStaff ? "" : valores.contrasena,
    });
    if (!resultado.ok) {
      setGuardando(false);
      return setError(resultado.error);
    }

    // La foto se sube con la persona ya creada; si falla, no se pierde el alta.
    let avisoFoto = "";
    if (archivoFoto) {
      const foto = await cambiarFoto(supabase, resultado.id, archivoFoto, null);
      if (!foto.ok) avisoFoto = ` (la foto no se pudo subir: ${foto.error.toLowerCase()})`;
    }
    alAgregado(nombre, avisoFoto);
  }

  return (
    <div className={ficha.fondo} style={{ zIndex: 300 }} onClick={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className={`${ficha.modal} ${styles.ventanaEstrecha}`} role="dialog" aria-modal="true" aria-labelledby="agregar-titulo">
        <div className={`${ficha.cabecera} ${styles.cabeceraAgregar}`}>
          <button type="button" className={ficha.cerrar} onClick={alCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" tamano={16} strokeWidth={2} />
          </button>
          <div className={styles.iconoCabecera}>
            <Icono nombre="mas" tamano={28} strokeWidth={1.7} />
          </div>
          <div className={styles.textoCabecera}>
            <h2 id="agregar-titulo">Agregar jugador</h2>
            <div className={styles.metaCabecera}>Completá los datos de la nueva persona</div>
          </div>
        </div>
        <div className={ficha.cuerpo}>
          <div className={styles.formulario}>
            <CamposJugador
              valores={valores}
              alCambiar={cambiar}
              modo="agregar"
              foto={{ url: vistaFoto }}
              alElegirFoto={elegirFoto}
            />
            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}
            <div className={styles.acciones}>
              <button type="button" className={`${styles.boton} ${styles.botonPrimario}`} onClick={guardar} disabled={guardando}>
                {guardando ? "Agregando..." : "Agregar jugador"}
              </button>
              <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={alCerrar}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
