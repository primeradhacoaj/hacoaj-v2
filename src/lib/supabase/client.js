import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para Client Components (corre en el navegador). Usa la
// clave publishable (la "anon" de la PPT): es pública por diseño, la
// seguridad real la dan las políticas RLS de la base.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
