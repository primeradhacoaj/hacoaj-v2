import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Refresca el token de sesión de Supabase en cada request y deja las cookies
// actualizadas, para que los Server Components siempre vean una sesión válida.
// Todavía NO redirige a nadie: la protección por rol sigue en <Guardia> hasta
// que se migre el login simulado a Supabase Auth.
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
  await supabase.auth.getClaims();

  return response;
}
