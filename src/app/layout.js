import { Plus_Jakarta_Sans } from "next/font/google";
import { SesionProvider } from "@/components/SesionProvider";
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
        <SesionProvider>{children}</SesionProvider>
      </body>
    </html>
  );
}
