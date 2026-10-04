// CAPA DE DATOS de usuarios: inicio de sesión con Supabase Auth.
//
// El club no usa emails: la gente entra con un USUARIO (por ejemplo
// "fsaroka"). Supabase Auth necesita un email para cada cuenta, así que el
// usuario se convierte por dentro en uno inventado (`usuario@hacoaj.test`).
// Nadie lo ve ni lo usa para nada más; no existe esa casilla. Consecuencia:
// no hay "recuperar contraseña por mail" — el administrador restablece las
// contraseñas (o, si la persona recuerda la actual, la cambia ella misma desde Ajustes).

import { createClient } from "@/lib/supabase/client";

export const DOMINIO_INTERNO = "hacoaj.test";

export function emailDeUsuario(usuario) {
  return `${usuario.trim().toLowerCase()}@${DOMINIO_INTERNO}`;
}

// Intenta iniciar sesión. Devuelve:
//   { ok: true }
//   { ok: false, error: "mensaje para mostrar" }
// Si sale bien no devuelve el usuario: el SesionProvider se entera solo cuando
// Supabase confirma el login, y carga el perfil.
export async function iniciarSesion(usuario, contrasena) {
  const { error } = await createClient().auth.signInWithPassword({
    email: emailDeUsuario(usuario),
    password: contrasena,
  });

  if (error) {
    return { ok: false, error: "Usuario o contraseña incorrectos" };
  }
  return { ok: true };
}

// Largo mínimo que exige Supabase Auth para una contraseña.
export const LARGO_MINIMO_CONTRASENA = 6;

// Cambia la contraseña de quien tiene la sesión abierta. Primero comprueba la contraseña
// actual (así nadie con un teléfono prestado y la sesión abierta puede cambiarla) y recién
// después guarda la nueva. Devuelve:
//   { ok: true }
//   { ok: false, error: "mensaje para mostrar", campo?: "actual" | "nueva" }
export async function cambiarContrasena(contrasenaActual, contrasenaNueva) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { ok: false, error: "Tu sesión venció. Volvé a ingresar." };
  }

  const { error: errorActual } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: contrasenaActual,
  });
  if (errorActual) {
    return { ok: false, error: "La contraseña actual no es correcta", campo: "actual" };
  }

  const { error } = await supabase.auth.updateUser({ password: contrasenaNueva });
  if (error) {
    if (error.code === "same_password") {
      return { ok: false, error: "La nueva contraseña tiene que ser distinta de la actual", campo: "nueva" };
    }
    if (error.code === "weak_password") {
      return { ok: false, error: "La contraseña es muy fácil de adivinar. Probá con otra", campo: "nueva" };
    }
    return { ok: false, error: "No se pudo cambiar la contraseña. Probá de nuevo en un rato" };
  }
  return { ok: true };
}
