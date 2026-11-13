import { Inter } from "next/font/google";

// El dashboard de análisis de la v1 usaba la tipografía Inter (distinta del
// resto del panel técnico): se carga solo para esta pantalla.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function AnalisisLayout({ children }) {
  return <div className={inter.variable}>{children}</div>;
}
