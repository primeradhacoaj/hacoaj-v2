// CAPA DE DATOS de fuerza del jugador, leída de la tabla `fuerza_tests` de
// Supabase. Las pantallas llaman a estas funciones sin saber de dónde salen
// los datos.
//
// La forma de la respuesta es la misma que devolvía `/api/mi-fuerza` en la v1
// (con los mismos nombres de campo, como "VMP PECHO"), para reutilizar la
// lógica de la pantalla tal cual.
//
// No se filtra por jugador a mano: las políticas RLS de la base ya hacen que
// un jugador reciba únicamente sus propios tests.

import { createClient } from "@/lib/supabase/client";

const COLUMNAS = "tipo, fecha_test, peso, carga_externa, vmp, rm_estimado, f_relativa, fecha_peso, comentario";

// "2026-09-20" -> "20/09/2026" (el formato que usa toda la pantalla)
function fechaCorta(iso) {
  if (!iso) return "";
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

// Un test de la base -> el registro con los nombres de campo de la v1.
function comoRegistroV1(test) {
  if (test.tipo === "pecho") {
    return {
      "Fecha Pecho": fechaCorta(test.fecha_test),
      Peso: test.peso,
      "Fecha peso": fechaCorta(test.fecha_peso),
      PC: test.peso,
      "C EXTERNA PECHO": test.carga_externa,
      "VMP PECHO": test.vmp,
      "RM ESTIMADO PECHO": test.rm_estimado,
      "F RELATIVA (1,3) PECHO": test.f_relativa,
      Comentario: test.comentario ?? "",
    };
  }
  return {
    "Fecha Sent": fechaCorta(test.fecha_test),
    Peso: test.peso,
    "Fecha peso": fechaCorta(test.fecha_peso),
    PC: test.peso,
    "C EXTERNA SENT": test.carga_externa,
    "VMP SENTADILLA": test.vmp,
    "RM ESTIMADO SENT": test.rm_estimado,
    "F RELATIVA (1,8/2) SENT": test.f_relativa,
    Comentario: test.comentario ?? "",
  };
}

async function leerTests() {
  const { data, error } = await createClient()
    .from("fuerza_tests")
    .select(COLUMNAS)
    .order("fecha_test", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Devuelve la última y la penúltima medición de pecho y sentadilla del jugador.
// `pecho_prev` / `sentadilla_prev` son null si hay un solo registro (o ninguno).
export async function obtenerMiFuerza() {
  let tests;
  try {
    tests = await leerTests();
  } catch (error) {
    return { status: "error", message: error.message };
  }

  const deTipo = (tipo) => tests.filter((t) => t.tipo === tipo).map(comoRegistroV1);
  const pecho = deTipo("pecho");
  const sentadilla = deTipo("sentadilla");

  return {
    status: "success",
    peso_corporal: tests[0]?.peso ?? null, // el peso del test más reciente
    pecho: pecho[0] ?? null,
    pecho_prev: pecho[1] ?? null,
    sentadilla: sentadilla[0] ?? null,
    sentadilla_prev: sentadilla[1] ?? null,
  };
}

// Devuelve TODAS las mediciones de pecho y sentadilla del jugador, de la más
// nueva a la más vieja (mismos nombres de campo que `/api/mi-historial-fuerza`
// de la v1).
export async function obtenerMiHistorialFuerza() {
  let tests;
  try {
    tests = await leerTests();
  } catch (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "success",
    pecho: tests.filter((t) => t.tipo === "pecho").map(comoRegistroV1),
    sentadilla: tests.filter((t) => t.tipo === "sentadilla").map(comoRegistroV1),
  };
}
