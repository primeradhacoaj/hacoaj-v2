// CAPA DE DATOS de usuarios: inicio de sesión con Supabase Auth.
//
// El club no usa emails: la gente entra con un USUARIO (por ejemplo
// "fsaroka"). Supabase Auth necesita un email para cada cuenta, así que el
// usuario se convierte por dentro en uno inventado (`usuario@hacoaj.test`).
// Nadie lo ve ni lo usa para nada más; no existe esa casilla. Consecuencia:
// no hay "recuperar contraseña por mail" — el administrador restablece las
// contraseñas.

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
