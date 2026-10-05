import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request) {
  return updateSession(request);
}

export const config = {
  // Todo menos archivos estáticos, imágenes, los PDF de /rutinas y los archivos de la PWA
  // (service worker, manifiesto y página sin conexión: tienen que servirse sin pasar por la sesión).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|rutinas/|sw\\.js|manifest\\.webmanifest|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)",
  ],
};
