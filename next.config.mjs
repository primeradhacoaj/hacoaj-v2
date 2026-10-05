// Cabeceras de seguridad de todas las respuestas.
//
// La política de contenido (CSP) limita de dónde puede cargar cosas la app: si alguna vez se colara un script
// ajeno, no podría enviar datos a otro servidor. Solo se activa en producción (en desarrollo Next necesita
// permisos extra). Qué se permite y por qué:
//  · scripts propios + los "inline" que Next inserta para arrancar la página;
//  · conexiones a la propia app y a Supabase (datos, login, fotos);
//  · iframes: los PDF de rutinas (propios) y los videos de Google Drive del detalle de partido;
//  · imágenes propias, de Supabase (fotos de perfil) y data:/blob: (gráficos, fotos recién achicadas).
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const conexiones = supabase ? `${supabase} ${supabase.replace("https://", "wss://")}` : "";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`,
  "font-src 'self' data:",
  `connect-src 'self' ${conexiones}`,
  "frame-src 'self' https://drive.google.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const generales = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: csp }] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: generales },
      {
        // El service worker no se guarda en caché (así se actualiza) y no puede cargar nada ajeno.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
