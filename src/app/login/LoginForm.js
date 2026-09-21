"use client";

import { useState } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import TextField from "@/components/TextField";
import { iniciarSesion } from "@/lib/data/usuarios";
import styles from "./LoginForm.module.css";

// Formulario de login. Es un componente de CLIENTE porque guarda estado
// (lo que el usuario escribe, los errores, si está cargando) y reacciona a
// eventos (escribir, enviar).
export default function LoginForm() {
  // Cada useState guarda un dato de la pantalla. Cuando cambia, React
  // vuelve a dibujar lo que depende de él.
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [verContrasena, setVerContrasena] = useState(false);
  const [errores, setErrores] = useState({}); // errores por campo
  const [errorGeneral, setErrorGeneral] = useState(""); // usuario/clave incorrectos
  const [cargando, setCargando] = useState(false);
  const [sesion, setSesion] = useState(null); // quién inició sesión (o null)

  async function manejarEnvio(evento) {
    evento.preventDefault(); // evita que el navegador recargue la página

    const usuarioLimpio = usuario.trim();
    const contrasenaLimpia = contrasena.trim();

    // 1) Validación: campos obligatorios
    const nuevosErrores = {};
    if (!usuarioLimpio) nuevosErrores.usuario = "Ingresá tu usuario";
    if (!contrasenaLimpia) nuevosErrores.contrasena = "Ingresá tu contraseña";
    setErrores(nuevosErrores);
    setErrorGeneral("");
    if (Object.keys(nuevosErrores).length > 0) return;

    // 2) Pedir el inicio de sesión
    setCargando(true);
    const resultado = await iniciarSesion(usuarioLimpio, contrasenaLimpia);
    setCargando(false);

    // 3) Mostrar el resultado
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
      return;
    }
    setSesion(resultado.usuario);
  }

  function cerrarSesion() {
    setSesion(null);
    setUsuario("");
    setContrasena("");
    setVerContrasena(false);
  }

  // Sesión iniciada (temporal: en el paso 4 acá se pasa al menú principal)
  if (sesion) {
    return (
      <div className={styles.exito}>
        <Badge tono="exito">Sesión iniciada</Badge>
        <h2 className={styles.titulo}>Hola, {sesion.nombre}</h2>
        <p className={styles.texto}>
          Ingresaste como <strong>{sesion.rol}</strong>. En el próximo paso, acá
          vas a ver el menú de tu rol.
        </p>
        <Button variante="secundario" bloque onClick={cerrarSesion}>
          Cerrar sesión
        </Button>
      </div>
    );
  }

  return (
    <form className={styles.formulario} onSubmit={manejarEnvio} noValidate>
      <div>
        <h2 className={styles.titulo}>Bienvenido</h2>
        <p className={styles.texto}>Ingresá con tus credenciales del club</p>
      </div>

      {errorGeneral && (
        <p className={styles.errorGeneral} role="alert">
          {errorGeneral}
        </p>
      )}

      <TextField
        id="usuario"
        label="Usuario"
        value={usuario}
        onChange={(e) => setUsuario(e.target.value)}
        error={errores.usuario}
        autoComplete="username"
        autoCapitalize="none"
        placeholder="Tu usuario"
        disabled={cargando}
      />

      <TextField
        id="contrasena"
        label="Contraseña"
        type={verContrasena ? "text" : "password"}
        value={contrasena}
        onChange={(e) => setContrasena(e.target.value)}
        error={errores.contrasena}
        autoComplete="current-password"
        placeholder="Tu contraseña"
        disabled={cargando}
        accion={
          <button
            type="button"
            className={styles.verBoton}
            onClick={() => setVerContrasena(!verContrasena)}
            aria-pressed={verContrasena}
          >
            {verContrasena ? "Ocultar" : "Ver"}
          </button>
        }
      />

      <Button type="submit" bloque disabled={cargando}>
        {cargando ? "Ingresando…" : "Ingresar"}
      </Button>

      <p className={styles.ayuda}>
        Versión de prueba: usuarios <strong>jugador</strong>,{" "}
        <strong>tecnico</strong> o <strong>admin</strong>, con contraseña{" "}
        <strong>demo</strong>.
      </p>
    </form>
  );
}
