import { NextResponse } from "next/server";
import { enviarADispositivos } from "@/lib/pushServidor";
import { rpcConSecreto } from "@/lib/rpcConSecreto";

export const runtime = "nodejs"; // la librería de envío necesita Node
export const dynamic = "force-dynamic";

// GET /api/cron/cumples → avisa a todos los jugadores activos de quién cumple años hoy (reemplaza a
// `cumples.yml` + `/api/check-cumples` de la v1). La llama el cron de Vercel una vez por día (ver `vercel.json`),
// que manda el encabezado `Authorization: Bearer <CRON_SECRET>`. Sin ese secreto no hace nada.
//
// ?simular=1 solo muestra a quién avisaría (no envía ni marca el día como hecho): sirve para probar.
//
// No hay sesión de ninguna persona: la base entrega los datos con funciones `tareas_*` que exigen el mismo
// secreto (guardan solo su huella). El día queda marcado en la base para que no se repita el aviso.
export async function GET(request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const simular = new URL(request.url).searchParams.get("simular") === "1";

  try {
    const hoy = await rpcConSecreto("tareas_cumples_pendientes");
    if (hoy.ya_hecho) return NextResponse.json({ estado: "ya_hecho", fecha: hoy.fecha });

    const { cumpleaneros, destinos } = hoy;
    if (simular) {
      return NextResponse.json({ estado: "simulacro", fecha: hoy.fecha, cumpleaneros, dispositivos: destinos.length });
    }

    const vencidos = new Set();
    let enviados = 0;
    for (const nombre of cumpleaneros) {
      const envio = await enviarADispositivos(destinos, {
        titulo: "🎂 ¡Feliz cumpleaños!",
        mensaje: `¡Hoy cumple años ${nombre}! 🥳`,
        url: "/menu",
      });
      if (!envio) return NextResponse.json({ error: "Las notificaciones no están configuradas" }, { status: 500 });
      enviados += envio.enviados;
      envio.vencidos.forEach((endpoint) => vencidos.add(endpoint));
    }

    if (vencidos.size > 0) await rpcConSecreto("tareas_quitar_vencidas", { p_endpoints: [...vencidos] });
    await rpcConSecreto("tareas_marcar_hecha", { p_tarea: "cumples" });
    return NextResponse.json({ estado: "ok", fecha: hoy.fecha, cumpleaneros, enviados, vencidas: vencidos.size });
  } catch (error) {
    console.error("Cron de cumpleaños:", error);
    return NextResponse.json({ error: "No se pudo completar la tarea" }, { status: 500 });
  }
}
