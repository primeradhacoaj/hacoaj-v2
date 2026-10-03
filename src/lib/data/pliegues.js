// CAPA DE DATOS de pliegues del jugador, leída de la tabla `pliegues` de
// Supabase. Las pantallas llaman a estas funciones sin saber de dónde salen
// los datos.
//
// La forma de la respuesta es la misma que devolvía `/api/mi-pliegue` en la v1
// (con los mismos nombres de campo, como "pl tricipital").
//
// No se filtra por jugador a mano: las políticas RLS de la base ya hacen que
// un jugador reciba únicamente sus propios pliegues.

import { createClient } from "@/lib/supabase/client";

const COLUMNAS =
  "fecha, peso, talla, imc, pl_tricipital, pl_subescapular, pl_supraespinal, pl_abdominal, pl_muslo, pl_pantorrilla, sumatoria_6, peso_ideal, comentario";

// "2026-08-15" -> "15/08/2026" (el formato que usa toda la pantalla)
function fechaCorta(iso) {
  if (!iso) return "";
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

async function leerPliegues({ soloElUltimo = false } = {}) {
  let consulta = createClient()
    .from("pliegues")
    .select(COLUMNAS)
    .order("fecha", { ascending: false });
  if (soloElUltimo) consulta = consulta.limit(1);

  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return data;
}

// Devuelve la última medición de pliegues del jugador, o `pliegue: null` con un
// mensaje si todavía no tiene ninguna.
export async function obtenerMiPliegue() {
  let filas;
  try {
    filas = await leerPliegues({ soloElUltimo: true });
  } catch (error) {
    return { status: "error", message: error.message };
  }

  if (filas.length === 0) {
    return {
      status: "success",
      message: "Todavía no tenés mediciones de pliegues cargadas.",
      pliegue: null,
    };
  }

  const p = filas[0];
  return {
    status: "success",
    message: null,
    pliegue: {
      Peso: p.peso,
      Talla: p.talla, // en centímetros
      IMC: p.imc,
      "pl tricipital": p.pl_tricipital,
      "pl subescapular": p.pl_subescapular,
      "pl supraespinal": p.pl_supraespinal,
      "pl abdominal": p.pl_abdominal,
      "pl muslo": p.pl_muslo,
      "pl pantorrilla": p.pl_pantorrilla,
      "sumatoria 6 pl": p.sumatoria_6,
      "Peso ideal": p.peso_ideal,
      "Fecha pliegue": fechaCorta(p.fecha),
      Comentario: p.comentario ?? "",
    },
  };
}

// Devuelve TODAS las mediciones de pliegues del jugador, de la más nueva a la
// más vieja (mismos nombres de campo que `/api/mis-pliegues` de la v1). Si no
// hay ninguna, devuelve una lista vacía y un mensaje.
export async function obtenerMisPliegues() {
  let filas;
  try {
    filas = await leerPliegues();
  } catch (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "success",
    message: filas.length === 0 ? "Todavía no tenés mediciones de pliegues cargadas." : null,
    pliegues: filas.map((p) => ({
      "Fecha pliegue": fechaCorta(p.fecha),
      Peso: p.peso,
      "sumatoria 6 pl": p.sumatoria_6,
    })),
  };
}
