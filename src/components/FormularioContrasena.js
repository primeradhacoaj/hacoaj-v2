"use client";

import { useState } from "react";
import Aviso from "@/components/Aviso";
import Button from "@/components/Button";
import TextField from "@/components/TextField";
import { cambiarContrasena, LARGO_MINIMO_CONTRASENA } from "@/lib/data/usuarios";
import { useAviso } from "@/lib/useAviso";
import styles from "./FormularioContrasena.module.css";

// Formulario para que cada persona cambie su propia contraseña: contraseña actual,
// la nueva y repetir la nueva. Lo usan Ajustes del jugador y Configuración del panel.
export default function FormularioContrasena() {
  const aviso = useAviso();
  const [valores, setValores] = useState({ actual: "", nueva: "", repetir: "" });
  const [errores, setErrores] = useState({});
  const [mostrar, setMostrar] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (e) => {
    setValores((antes) => ({ ...antes, [campo]: e.target.value }));
    setErrores((antes) => ({ ...antes, [campo]: "" }));
  };

  async function enviar(e) {
    e.preventDefault();
    const nuevosErrores = {};
    if (!valores.actual) nuevosErrores.actual = "Ingresá tu contraseña actual";
    if (valores.nueva.length < LARGO_MINIMO_CONTRASENA) {
      nuevosErrores.nueva = `Tiene que tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres`;
    } else if (valores.nueva === valores.actual) {
      nuevosErrores.nueva = "Tiene que ser distinta de la actual";
    }
    if (valores.repetir !== valores.nueva) nuevosErrores.repetir = "Las contraseñas no coinciden";
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setGuardando(true);
    const resultado = await cambiarContrasena(valores.actual, valores.nueva);
    setGuardando(false);

    if (!resultado.ok) {
      if (resultado.campo) setErrores({ [resultado.campo]: resultado.error });
      else aviso.mostrar(resultado.error, "error");
      return;
    }
    setValores({ actual: "", nueva: "", repetir: "" });
    aviso.mostrar("Contraseña actualizada", "exito");
  }

  const tipo = mostrar ? "text" : "password";

  return (
    <form className={styles.formulario} onSubmit={enviar} noValidate>
      <TextField
        id="contrasena-actual"
        label="Contraseña actual"
        type={tipo}
        icono="candado"
        value={valores.actual}
        onChange={cambiar("actual")}
        error={errores.actual}
        autoComplete="current-password"
        disabled={guardando}
      />
      <TextField
        id="contrasena-nueva"
        label="Contraseña nueva"
        type={tipo}
        icono="candado"
        value={valores.nueva}
        onChange={cambiar("nueva")}
        error={errores.nueva}
        autoComplete="new-password"
        disabled={guardando}
      />
      <TextField
        id="contrasena-repetir"
        label="Repetir contraseña nueva"
        type={tipo}
        icono="candado"
        value={valores.repetir}
        onChange={cambiar("repetir")}
        error={errores.repetir}
        autoComplete="new-password"
        disabled={guardando}
      />

      <label className={styles.mostrar}>
        <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} />
        Mostrar contraseñas
      </label>

      <Button type="submit" bloque disabled={guardando}>
        {guardando ? "Guardando..." : "Cambiar contraseña"}
      </Button>

      <Aviso mensaje={aviso.mensaje} tipo={aviso.tipo} visible={aviso.visible} />
    </form>
  );
}
