import { Plus_Jakarta_Sans } from "next/font/google";
import RegistrarServiceWorker from "@/components/RegistrarServiceWorker";
import { SesionProvider } from "@/components/SesionProvider";
import Tracker from "@/components/Tracker";
import "./globals.css";

// Única tipografía de toda la app. Es una fuente variable: sirve todos los
// pesos con un solo archivo.
const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "Hacoaj · Primera D",
    template: "%s · Hacoaj",
  },
  description:
    "Panel de rendimiento del plantel de Primera D del Club Náutico Hacoaj.",
  // Al instalarla en el iPhone: nombre y ícono de la pantalla de inicio, y se abre sin la barra de Safari.
  applicationName: "Primera D Hacoaj",
  appleWebApp: { capable: true, title: "Primera D", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#00296b",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={fontSans.variable}>
      <body>
        <SesionProvider>
          <Tracker />
          <RegistrarServiceWorker />
          {children}
        </SesionProvider>
      </body>
    </html>
  );
}
