import { NextResponse } from "next/server";
import { obtenerEventosDelMes } from "@/lib/data/calendario";
import { createClient } from "@/lib/supabase/server";

// GET /api/calendario?year=2026&month=9 → { year, month, eventos }
//
// Es la primera Route Handler del proyecto: hasta ahora todas las pantallas
// leen `src/lib/data/*.js` directo en un Server Component (sin ida y vuelta
// de red). Acá conviene una API real porque el calendario cambia de mes sin
// recargar la página (como en la v1) y el cliente necesita poder volver a
// pedir datos después de la carga inicial.
export async function GET(request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Tenés que iniciar sesión." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const hoy = new Date();
  const year = Number(searchParams.get("year")) || hoy.getFullYear();
  const month = Number(searchParams.get("month")) || hoy.getMonth() + 1;

  const eventos = await obtenerEventosDelMes(supabase, year, month);
  return NextResponse.json({ year, month, eventos });
}
