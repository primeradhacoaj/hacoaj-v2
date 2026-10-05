import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Refresca el token de sesión de Supabase en cada request y deja las cookies
// actualizadas, para que los Server Components siempre vean una sesión válida.
//
// Quien no inició sesión y pide una pantalla se manda a /login desde el servidor (antes de armar la página). La
// protección por rol sigue en <Guardia> y, sobre todo, en las políticas RLS de la base: lo que importa de verdad
// es que la base no entregue datos ajenos, no la pantalla. Quedan abiertos /login, la raíz (que manda a /login)
// y /api (cada ruta de la API se protege sola: sesión o secreto).
export async function updateSession(request) {
  let response = NextResponse.next({ request });

  // Sin las variables de entorno (por ejemplo, un deploy al que todavía no se
  // las cargaron) no se toca la sesión, pero el sitio sigue funcionando.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // No poner código entre createServerClient y getClaims(): getClaims valida el
  // JWT y es lo que dispara el refresco de la sesión.
  const { data } = await supabase.auth.getClaims();

  const ruta = request.nextUrl.pathname;
  const esPublica = ruta === "/" || ruta === "/login" || ruta.startsWith("/api/");
  if (!data?.claims && !esPublica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    const redireccion = NextResponse.redirect(destino);
    // Si el refresco dejó cookies nuevas (sesión vencida), se conservan en la respuesta.
    response.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
    return redireccion;
  }

  return response;
}
