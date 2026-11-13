// Cálculos del Dashboard de análisis del panel técnico: promedios del último
// registro de cada jugador, comparación contra el primer registro
// ("baseline"), series para los gráficos de evolución, rankings y alertas.
// Trabajan sobre jugadores ya armados con su historial
// (`obtenerJugadoresConHistorial`, en `src/lib/data/plantel.js`).

// "dd/mm/aaaa" → Date.
export function fechaCortaADate(fechaCorta) {
  if (!fechaCorta) return null;
  const [dd, mm, aa] = fechaCorta.split("/").map(Number);
  const fecha = new Date(aa, mm - 1, dd);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// Promedio del último registro de cada jugador (el más nuevo) en una
// colección ("fuerzaSent", "fuerzaPecho", "pliegues") y campo.
export function promedioUltimoRegistro(jugadores, coleccion, campo) {
  let suma = 0;
  let cantidad = 0;
  for (const j of jugadores) {
    const arr = j[coleccion] || [];
    if (arr.length === 0) continue;
    const valor = arr[arr.length - 1][campo];
    if (valor != null && valor !== 0) {
      suma += valor;
      cantidad++;
    }
  }
  return cantidad > 0 ? { promedio: suma / cantidad, cantidad } : { promedio: null, cantidad: 0 };
}

// Promedio del primer registro de cada jugador (el más viejo, "baseline").
export function promedioPrimerRegistro(jugadores, coleccion, campo) {
  let suma = 0;
  let cantidad = 0;
  for (const j of jugadores) {
    const arr = j[coleccion] || [];
    if (arr.length === 0) continue;
    const valor = arr[0][campo];
    if (valor != null && valor !== 0) {
      suma += valor;
      cantidad++;
    }
  }
  return cantidad > 0 ? suma / cantidad : null;
}

// Serie de promedios del plantel: la posición 0 promedia el primer registro
// de cada jugador que tenga al menos 1, la posición 1 el segundo, etc. Sirve
// para el mini-gráfico ("sparkline") de evolución.
export function serieDePromedios(jugadores, coleccion, campo) {
  const largoMaximo = Math.max(0, ...jugadores.map((j) => (j[coleccion] || []).length));
  const serie = [];
  for (let indice = 0; indice < largoMaximo; indice++) {
    let suma = 0;
    let cantidad = 0;
    for (const j of jugadores) {
      const registro = (j[coleccion] || [])[indice];
      if (registro && registro[campo] != null) {
        suma += registro[campo];
        cantidad++;
      }
    }
    serie.push(cantidad > 0 ? suma / cantidad : null);
  }
  return serie;
}

// Los jugadores con mejor fuerza relativa (último registro), de mayor a menor.
export function topPorFuerzaRelativa(jugadores, coleccion, cantidad = 5) {
  const lista = [];
  for (const j of jugadores) {
    const arr = j[coleccion] || [];
    if (arr.length === 0) continue;
    const ultimo = arr[arr.length - 1];
    if (ultimo.fRelativa != null && ultimo.fRelativa !== 0) {
      lista.push({ nombre: j.nombre, posicion: j.posicion, fRelativa: ultimo.fRelativa, rm: ultimo.rm, fecha: ultimo.fecha });
    }
  }
  return lista.sort((a, b) => b.fRelativa - a.fRelativa).slice(0, cantidad);
}

// Jugadores sin medir sentadilla o pecho hace más de 2 meses (o nunca).
export function medicionesVencidas(jugadores) {
  const DOS_MESES_MS = 60 * 24 * 60 * 60 * 1000;
  const ahora = new Date();
  const alertas = [];

  for (const j of jugadores) {
    const ultimaFecha = (coleccion) => {
      const arr = j[coleccion] || [];
      return arr.length ? fechaCortaADate(arr[arr.length - 1].fecha) : null;
    };
    const ultimaSent = ultimaFecha("fuerzaSent");
    const ultimaPecho = ultimaFecha("fuerzaPecho");
    const vencidaSent = !ultimaSent || ahora - ultimaSent > DOS_MESES_MS;
    const vencidaPecho = !ultimaPecho || ahora - ultimaPecho > DOS_MESES_MS;
    if (!vencidaSent && !vencidaPecho) continue;

    const detalles = [];
    if (vencidaSent) {
      const dias = ultimaSent ? Math.floor((ahora - ultimaSent) / (24 * 60 * 60 * 1000)) : null;
      detalles.push(`Sentadilla ${dias ? `(hace ${dias}d)` : "(sin registro)"}`);
    }
    if (vencidaPecho) {
      const dias = ultimaPecho ? Math.floor((ahora - ultimaPecho) / (24 * 60 * 60 * 1000)) : null;
      detalles.push(`Pecho ${dias ? `(hace ${dias}d)` : "(sin registro)"}`);
    }
    alertas.push({ nombre: j.nombre, detalle: detalles.join(" · ") });
  }
  return alertas;
}

// Cambios de fuerza relativa entre el último registro y el anterior, de cada
// jugador que tenga al menos 2 mediciones.
export function cambiosFuerzaRelativa(jugadores, coleccion) {
  const cambios = [];
  for (const j of jugadores) {
    const arr = j[coleccion] || [];
    if (arr.length < 2) continue;
    const actual = arr[arr.length - 1].fRelativa;
    const anterior = arr[arr.length - 2].fRelativa;
    if (actual != null && anterior != null && anterior !== 0) {
      cambios.push({ nombre: j.nombre, actual, anterior, delta: actual - anterior });
    }
  }
  return cambios;
}

// Cuántos jugadores hay por posición.
export function distribucionPorPosicion(jugadores) {
  const cuenta = new Map();
  for (const j of jugadores) cuenta.set(j.posicion, (cuenta.get(j.posicion) ?? 0) + 1);
  return cuenta;
}

// Promedio del plantel por fecha de medición (para el gráfico de evolución):
// una posición por cada fecha distinta que aparezca en los registros de
// cualquier jugador, ordenadas cronológicamente.
export function evolucionPorFecha(jugadores, coleccion, campo) {
  const porFecha = new Map();
  for (const j of jugadores) {
    for (const r of j[coleccion] || []) {
      const valor = r[campo];
      if (!r.fecha || valor == null || valor === 0) continue;
      const actual = porFecha.get(r.fecha) ?? { suma: 0, cantidad: 0 };
      actual.suma += valor;
      actual.cantidad += 1;
      porFecha.set(r.fecha, actual);
    }
  }
  return [...porFecha.entries()]
    .sort(([a], [b]) => fechaCortaADate(a) - fechaCortaADate(b))
    .map(([fecha, { suma, cantidad }]) => ({ fecha, valor: suma / cantidad, cantidad }));
}

// Registros de una colección que son de este año calendario.
export function delAnioActual(arr) {
  const anio = new Date().getFullYear();
  return (arr ?? []).filter((r) => fechaCortaADate(r.fecha)?.getFullYear() === anio);
}

// Promedio del último registro DE ESTE AÑO de cada jugador (p. ej. Σ6
// pliegues o peso, que se cargan más seguido y solo interesa lo reciente).
export function promedioAnioActual(jugadores, coleccion, campo) {
  let suma = 0;
  let cantidad = 0;
  for (const j of jugadores) {
    const delAnio = delAnioActual(j[coleccion]);
    if (delAnio.length === 0) continue;
    const valor = delAnio[delAnio.length - 1][campo];
    if (valor != null && valor !== 0) {
      suma += valor;
      cantidad++;
    }
  }
  return cantidad > 0 ? { promedio: suma / cantidad, cantidad } : { promedio: null, cantidad: 0 };
}

// Evolución del promedio del plantel por fecha, usando solo los registros de
// este año.
export function evolucionAnioActual(jugadores, coleccion, campo) {
  const soloEsteAnio = jugadores.map((j) => ({ ...j, [coleccion]: delAnioActual(j[coleccion]) }));
  return evolucionPorFecha(soloEsteAnio, coleccion, campo);
}

// ── Ayudas de presentación del dashboard (copiadas de la v1) ──────────────

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

// "dd/mm/aaaa" → "12-mar" (como `fmtDate` de la v1, que usaba el formato corto
// de es-AR del navegador: "02-sept"). Sin fecha: "—".
export function fechaDiaMes(fechaCorta) {
  const fecha = fechaCortaADate(fechaCorta);
  if (!fecha) return fechaCorta || "—";
  return `${String(fecha.getDate()).padStart(2, "0")}-${MESES_CORTOS[fecha.getMonth()]}`;
}

// "Juan Pérez García" → "Juan P."
export function nombreCorto(nombre) {
  const partes = nombre.split(" ");
  return `${partes[0]} ${(partes[1] || "")[0] ?? ""}.`;
}

// Color de fondo del círculo con iniciales: un azul distinto por persona,
// calculado del nombre igual que en la v1 (siempre el mismo para cada uno).
export function colorAvatar(nombre) {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  const tono = 210 + (hash % 40) - 20;
  const saturacion = 35 + (hash % 20);
  const luz = 38 + (hash % 18);
  return `hsl(${tono},${saturacion}%,${luz}%)`;
}

// Año de nacimiento de "dd/mm/aaaa" (si el año no se conoce, la ficha trae "dd/mm": null).
export function anioDeNacimiento(nacimiento) {
  const partes = (nacimiento || "").split("/");
  return partes.length === 3 ? Number(partes[2]) || null : null;
}

// Recta de tendencia (mínimos cuadrados) de puntos { x, y }: y = pendiente·x + ordenada.
export function regresionLineal(puntos) {
  const n = puntos.length;
  let sumaX = 0;
  let sumaY = 0;
  let sumaXY = 0;
  let sumaX2 = 0;
  for (const p of puntos) {
    sumaX += p.x;
    sumaY += p.y;
    sumaXY += p.x * p.y;
    sumaX2 += p.x * p.x;
  }
  const pendiente = (n * sumaXY - sumaX * sumaY) / (n * sumaX2 - sumaX * sumaX);
  const ordenada = (sumaY - pendiente * sumaX) / n;
  return { pendiente, ordenada, valorEn: (x) => pendiente * x + ordenada };
}
