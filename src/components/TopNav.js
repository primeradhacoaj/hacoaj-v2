"use client";

import Image from "next/image";
import Link from "next/link";
import { useSesion } from "@/components/SesionProvider";
import styles from "./TopNav.module.css";

// Barra superior azul de las pantallas de datos del jugador (fuerza, pliegues,
// historiales…): escudo y "Primera D" a la izquierda; "← Volver" y "Salir" a
// la derecha. Copiada del diseño original de la v1.
//
// Props:
//   volverHref  a dónde lleva "← Volver" (si falta, no se muestra)
export default function TopNav({ volverHref }) {
  const { cerrar } = useSesion();

  return (
    <nav className={styles.barra}>
      <div className={styles.marca}>
        <Image src="/escudo.png" alt="CNH" width={21} height={26} priority />
        <span>Primera D</span>
      </div>
      <div className={styles.enlaces}>
        {volverHref && <Link href={volverHref}>← Volver</Link>}
        <button type="button" onClick={cerrar}>
          Salir
        </button>
      </div>
    </nav>
  );
}
