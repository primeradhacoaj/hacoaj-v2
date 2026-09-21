// CAPA DE DATOS de usuarios.
//
// Las pantallas no saben de dónde salen los datos: solo llaman a estas
// funciones. Hoy devuelven DATOS DE PRUEBA. Cuando armemos Supabase se cambia
// el interior de cada función y las pantallas no se tocan.
//
// Estos usuarios son ficticios y solo existen para probar el diseño.

const USUARIOS_DE_PRUEBA = [
  {
    usuario: "jugador",
    contrasena: "demo",
    nombre: "Juan Pérez",
    rol: "jugador",
    posicion: "Volante",
    piernaHabil: "Derecha",
  },
  { usuario: "tecnico", contrasena: "demo", nombre: "Cuerpo Técnico", rol: "tecnico" },
  { usuario: "admin", contrasena: "demo", nombre: "Administración", rol: "administrador" },
];

// Intenta iniciar sesión. Devuelve:
//   { ok: true, usuario: { usuario, nombre, rol, posicion, piernaHabil } }
//   { ok: false, error: "mensaje para mostrar" }
// Es `async` a propósito: la versión real va a tardar en responder (red).
export async function iniciarSesion(usuario, contrasena) {
  await new Promise((resolver) => setTimeout(resolver, 400)); // simula la demora

  const encontrado = USUARIOS_DE_PRUEBA.find(
    (u) => u.usuario === usuario && u.contrasena === contrasena,
  );

  if (!encontrado) {
    return { ok: false, error: "Usuario o contraseña incorrectos" };
  }

  return {
    ok: true,
    usuario: {
      usuario: encontrado.usuario,
      nombre: encontrado.nombre,
      rol: encontrado.rol,
      posicion: encontrado.posicion,
      piernaHabil: encontrado.piernaHabil,
    },
  };
}
