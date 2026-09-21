// Datos fijos y validaciones de las encuestas (post partido y wellness).
// Copian las listas y la lógica de la v1.

// ── Post partido ─────────────────────────────────────────────────────────────

export const OPCIONES_LLEGADA = ["Mal", "Bien", "Muy bien"];
export const OPCIONES_EMOCIONAL = ["Baja", "Media", "Alta"];
export const OPCIONES_FISICA = ["Baja", "Media", "Alta", "Muy alta"];

export const CATEGORIAS = [
  "AIFA",
  "Primera Escobar",
  "Sub 21 Escobar",
  "Promocional Amateur",
  "Faccma",
  "Juveniles",
  "Macabeadas",
  "Otro",
];

export const TIPOS_GOLPE = [
  "Golpe/contusión",
  "Esguince o dobladura",
  "Molestia o sobrecarga",
  "Otro",
];

export const LADOS = ["Derecho", "Izquierdo", "Ambos"];

// Zonas del cuerpo. Las que están de a pares piden el lado (derecho/izquierdo).
export const ZONAS_CON_LADO = [
  "Hombro",
  "Brazo",
  "Mano",
  "Aductor",
  "Cuádriceps",
  "Isquiotibial",
  "Gemelo",
  "Pantorrilla",
  "Psoas",
  "Glúteo",
  "Rodilla",
  "Tobillo",
];
export const ZONAS_SIN_LADO = ["Cabeza", "Cuello", "Espalda", "Lumbar", "Abdominal"];
export const TODAS_LAS_ZONAS = [...ZONAS_CON_LADO, ...ZONAS_SIN_LADO];

// Pasa a minúsculas y quita los acentos, para buscar sin importar cómo se escriba.
function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Zonas que coinciden con lo que el jugador va escribiendo (siempre con "Otro" al final).
export function filtrarZonas(consulta) {
  const buscada = normalizar(consulta);
  return [...TODAS_LAS_ZONAS, "Otro"].filter((zona) => normalizar(zona).includes(buscada));
}

// Revisa un golpe o molestia antes de agregarlo a la lista.
// Devuelve { golpe } si está bien, o { error } con qué falta: "tipo", "zona" o "lado".
export function validarGolpe({ tipo, tipoOtro, zona, zonaOtro, lado, comentario }) {
  if (!tipo) return { error: "tipo" };

  let tipoGolpe = tipo;
  let ubicacion = "";
  let ladoGolpe = "";

  if (tipo === "Otro") {
    // "Otro": se describe con texto libre y no lleva zona ni lado
    tipoGolpe = tipoOtro.trim();
    if (!tipoGolpe) return { error: "tipo" };
  } else {
    ubicacion = zona;
    if (!ubicacion) return { error: "zona" };

    if (ubicacion === "Otro") {
      ubicacion = zonaOtro.trim();
      if (!ubicacion) return { error: "zona" };
    } else if (ZONAS_CON_LADO.includes(ubicacion)) {
      ladoGolpe = lado;
      if (!ladoGolpe) return { error: "lado" };
    }
  }

  return {
    golpe: {
      tipo_golpe: tipoGolpe,
      ubicacion_golpe: ubicacion,
      lado_golpe: ladoGolpe,
      comentario_lesion: comentario.trim(),
    },
  };
}

// "2026-08-15" (formato del campo de fecha) -> "15/08/2026"
export function fechaParaGuardar(fechaIso) {
  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}/${mes}/${anio}`;
}

// ── Wellness ─────────────────────────────────────────────────────────────────

// Cada pregunta se responde del 1 al 10. `textos[n]` describe el valor n.
export const ESCALAS_WELLNESS = [
  {
    nombre: "sueno",
    pregunta: "😴 ¿Cómo dormiste?",
    extremos: ["Muy mal", "Excelente"],
    textos: ["", "Pésimo", "Muy mal", "Mal", "Regular-", "Regular", "Aceptable", "Bien", "Muy bien", "Excelente", "Perfecto"],
  },
  {
    nombre: "estres",
    pregunta: "😰 Nivel de estrés",
    extremos: ["Nada", "Muchísimo"],
    textos: ["", "Nada", "Muy poco", "Poco", "Algo", "Moderado", "Notable", "Alto", "Muy alto", "Extremo", "Máximo"],
  },
  {
    nombre: "fatiga",
    pregunta: "🥵 Nivel de fatiga",
    extremos: ["Descansado", "Agotado"],
    textos: ["", "Descansado", "Muy bien", "Bien", "Normal", "Algo cansado", "Cansado", "Bastante", "Muy cansado", "Agotado", "Destruido"],
  },
  {
    nombre: "dolor",
    pregunta: "💪 Dolor muscular",
    extremos: ["Sin dolor", "Mucho dolor"],
    textos: ["", "Sin dolor", "Casi nada", "Leve", "Algo", "Moderado", "Notable", "Alto", "Muy alto", "Intenso", "Insoportable"],
  },
];
