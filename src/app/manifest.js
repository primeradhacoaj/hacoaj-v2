// Manifiesto de la app instalable (PWA): nombre, ícono y colores con los que aparece en la pantalla de inicio.
export default function manifest() {
  return {
    name: "Primera D Hacoaj",
    short_name: "Primera D",
    description: "Panel de rendimiento del plantel de Primera D del Club Náutico Hacoaj.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f9fa",
    theme_color: "#00296b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
