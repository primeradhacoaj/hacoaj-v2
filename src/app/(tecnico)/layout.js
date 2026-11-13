import { DM_Sans, Playfair_Display } from "next/font/google";
import Guardia from "@/components/Guardia";
import BarraPanel from "./_componentes/BarraPanel";
import styles from "./layout.module.css";

// Las tipografías del panel técnico (como en la v1) se cargan solo acá: el
// resto de la app usa una única tipografía.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

// Todas las pantallas dentro de (tecnico) comparten este layout: solo entran
// técnico y administrador, y casi todas llevan la barra superior del panel
// (cuál, lo decide `BarraPanel` según la pantalla).
export default function TecnicoLayout({ children }) {
  return (
    <div className={`${dmSans.variable} ${playfair.variable} ${styles.zona}`}>
      <Guardia roles={["tecnico", "administrador"]}>
        <BarraPanel />
        {children}
      </Guardia>
    </div>
  );
}
