import Link from "next/link";
import Icono from "@/components/Icono";
import styles from "./PieVolver.module.css";

// Pie de las pantallas del jugador: botón "Volver…" en píldora y la firma
// "Primera D · Hacoaj". Copiado de la v1.
//
// Props:
//   href   a dónde lleva el botón (por defecto "/menu")
//   texto  texto del botón ("Volver al menú" por defecto)
export default function PieVolver({ href = "/menu", texto = "Volver al menú" }) {
  return (
    <div className={styles.pie}>
      <Link href={href} className={styles.volver}>
        <Icono nombre="flechaIzquierda" tamano={14} strokeWidth={2.4} />
        {texto}
      </Link>
      <span className={styles.version}>Primera D · Hacoaj</span>
    </div>
  );
}
