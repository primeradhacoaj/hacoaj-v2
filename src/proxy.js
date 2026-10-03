import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request) {
  return updateSession(request);
}

export const config = {
  // Todo menos archivos estáticos, imágenes y los PDF de /rutinas.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|rutinas/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)",
  ],
};
