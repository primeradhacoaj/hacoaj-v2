import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente de Supabase para Server Components, Server Actions y Route Handlers.
// Lee la sesión de las cookies del usuario y la manda con cada consulta, así
// que Postgres aplica las políticas RLS como si el propio usuario preguntara.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Un Server Component no puede escribir cookies. Si llega acá no
            // pasa nada: el proxy (src/proxy.js) ya refresca la sesión.
          }
        },
      },
    },
  );
}
