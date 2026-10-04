"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icono from "@/components/Icono";
import { useSesion } from "@/components/SesionProvider";
import TextField from "@/components/TextField";
import { iniciarSesion } from "@/lib/data/usuarios";
import { cx } from "@/lib/cx";
import { rutaInicio } from "@/lib/sesion";
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

  const { sesion } = useSesion();
  const router = useRouter();

  // Apenas hay una sesión (recién iniciada o ya guardada de antes), pasa al
  // menú que le corresponde a su rol.
  useEffect(() => {
    if (sesion) router.replace(rutaInicio(sesion.rol));
  }, [sesion, router]);

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

    // 3) Mostrar el error. Si salió bien no hay nada más que hacer acá: el
    //    SesionProvider se entera del login y el efecto de arriba redirige.
    if (!resultado.ok) {
      setErrorGeneral(resultado.error);
    }
  }

  if (sesion) {
    return (
      <p className={styles.texto} role="status">
        Ingresando…
      </p>
    );
  }

  return (
    <div className={styles.contenedor}>
      <div className={styles.encabezado}>
        <h2 className={styles.titulo}>Bienvenido</h2>
        <p className={styles.texto}>Ingresá con tus credenciales del club</p>
      </div>

      {errorGeneral && (
        <div className={styles.errorGeneral} role="alert">
          <Icono nombre="alerta" tamano={16} strokeWidth={2.4} />
          <span>{errorGeneral}</span>
        </div>
      )}

      <form className={styles.formulario} onSubmit={manejarEnvio} noValidate>
        <TextField
          id="usuario"
          label="Usuario"
          icono="usuario"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          error={errores.usuario}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          placeholder="Tu usuario"
          disabled={cargando}
        />

        <TextField
          id="contrasena"
          label="Contraseña"
          icono="candado"
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
              aria-label={verContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <Icono
                nombre={verContrasena ? "ojoTachado" : "ojo"}
                tamano={18}
                strokeWidth={2}
              />
            </button>
          }
        />

        <button
          type="submit"
          className={cx(styles.botonLogin, cargando && styles.cargando)}
          disabled={cargando}
        >
          {cargando ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              <span className={styles.soloLectores}>Ingresando…</span>
            </>
          ) : (
            "Ingresar"
          )}
        </button>
      </form>
    </div>
  );
}
