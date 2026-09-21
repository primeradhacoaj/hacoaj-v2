import Link from "next/link";
import { cx } from "@/lib/cx";
import styles from "./PageHeader.module.css";

// Barra azul de arriba de cada pantalla, con el título y, opcionalmente, un
// link para volver. Lo que se pase como `children` aparece a la derecha
// (por ejemplo, un botón "Salir").
//
// Props:
//   titulo      texto principal
//   volverHref  si está, muestra "← Volver" y navega a esa ruta
//   ancho       "jugador" (por defecto, angosto) | "tecnico" (ancho, escritorio)
//   fija        queda pegada arriba al hacer scroll (true por defecto)
export default function PageHeader({
  titulo,
  volverHref,
  ancho = "jugador",
  fija = true,
  children,
}) {
  return (
    <header className={cx(styles.barra, fija && styles.fija)}>
      <div className={cx(styles.interior, styles[ancho])}>
        <div className={styles.izquierda}>
          {volverHref && (
            <Link href={volverHref} className={styles.volver}>
              <span aria-hidden="true">←</span> Volver
            </Link>
          )}
        </div>
        <h1 className={styles.titulo}>{titulo}</h1>
        <div className={styles.derecha}>{children}</div>
      </div>
    </header>
  );
}
