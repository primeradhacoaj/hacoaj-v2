// Funciones chicas que comparten las pantallas de estadísticas del torneo
// (planteles, equipos, jugadores).

// "FERREYRA, MATÍAS ARIEL" → "Matías Ferreyra" (primer nombre + apellido).
export function formatearNombre(nombreCompleto) {
  if (!nombreCompleto) return "—";
  if (!nombreCompleto.includes(",")) return nombreCompleto;
  const [apellido, nombres = ""] = nombreCompleto.split(",");
  const primero = nombres.trim().split(" ")[0];
  const mayus = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  return `${primero ? `${mayus(primero)} ` : ""}${mayus(apellido.trim())}`;
}

// Edad en años a partir de "AAAA-MM-DD".
export function calcularEdad(fechaNacimiento) {
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const todaviaNoCumplio =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (todaviaNoCumplio) edad--;
  return edad;
}

// "2026-05-23" → "23-05-26"
export function fechaCorta(fechaIso) {
  if (!fechaIso) return "";
  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}-${mes}-${anio.slice(2)}`;
}

// Resultado desde el punto de vista de un equipo: "V" (ganó), "E" o "D".
export function resultadoDe(golesAFavor, golesEnContra) {
  if (golesAFavor > golesEnContra) return "V";
  if (golesAFavor < golesEnContra) return "D";
  return "E";
}

// Los emojis de tarjeta y gol que usa la v1 en las listas de partidos.
export function iconosDeAparicion(aparicion) {
  let iconos = "";
  if (aparicion.goles > 1) iconos += `${aparicion.goles}x⚽ `;
  else if (aparicion.goles === 1) iconos += "⚽ ";
  if (aparicion.amarilla) iconos += "🟨 ";
  if (aparicion.roja) iconos += "🟥 ";
  return iconos;
}

// Nombre sin acentos, en minúsculas y con las palabras ordenadas:
// "VILLALBA, JORGE ANIBAL" y "Jorge Anibal Villalba" dan lo mismo.
export function normalizarNombre(nombre) {
  let limpio = (nombre ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  if (limpio.includes(",")) {
    const [apellido, nombres] = limpio.split(",");
    limpio = `${nombres.trim()} ${apellido.trim()}`;
  }
  return limpio.split(/\s+/).sort().join(" ");
}

// ¿Son la misma persona? Compara nombre y apellido sin importar el orden ni los
// segundos nombres: "Jorge Villalba" coincide con "VILLALBA, JORGE ANIBAL".
export function nombresCoinciden(a, b) {
  const palabrasA = normalizarNombre(a).split(" ");
  const palabrasB = normalizarNombre(b).split(" ");
  const [corto, largo] = palabrasA.length <= palabrasB.length ? [palabrasA, palabrasB] : [palabrasB, palabrasA];
  return corto.length > 0 && corto[0] !== "" && corto.every((palabra) => largo.includes(palabra));
}

// "2026-05-23" → "23/05/2026"
export function fechaLarga(fechaIso) {
  if (!fechaIso) return "—";
  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}/${mes}/${anio}`;
}
