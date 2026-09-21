// Ayudas simples sobre la sesión y los roles. Son funciones comunes (sin
// estado), así que se pueden usar tanto desde el servidor como desde el navegador.

// A qué pantalla va cada rol después de iniciar sesión.
export function rutaInicio(rol) {
  return rol === "jugador" ? "/menu" : "/panel";
}

// Nombre del rol para mostrar en pantalla.
export function etiquetaRol(rol) {
  const etiquetas = {
    jugador: "Jugador",
    tecnico: "Cuerpo técnico",
    administrador: "Administrador",
  };
  return etiquetas[rol] ?? rol;
}

// "Juan Pérez" -> "JP"
export function iniciales(nombre) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0].toUpperCase())
    .join("");
}
