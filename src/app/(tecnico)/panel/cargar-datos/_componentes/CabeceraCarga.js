import Image from "next/image";
import Link from "next/link";
import { cx } from "@/lib/cx";
import styles from "./CabeceraCarga.module.css";

// Encabezado de las pantallas de "Cargar datos", copiado de la v1: franja azul
// con el escudo, el link para volver, el título (con una palabra en rosa) y una
// línea de texto. El menú usa la versión grande; cada pantalla de carga, la chica.
//
// Props:
//   volverHref, volverTexto  a dónde vuelve el link de arriba
//   titulo, resaltado        "Cargar" + "datos" → "Cargar <span>datos</span>"
//   texto                    línea debajo del título
//   chica                    versión de las pantallas de carga (columna de 960px)
export default function CabeceraCarga({ volverHref, volverTexto, titulo, resaltado, texto, chica = false }) {
  return (
    <section className={cx(styles.cabecera, chica && styles.chica)}>
      <div className={styles.interior}>
        <Image src="/escudo.png" alt="Escudo Hacoaj" width={60} height={72} className={styles.escudo} priority />
        <div className={styles.textos}>
          <Link href={volverHref} className={styles.volver}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {volverTexto}
          </Link>
          <h1>
            {titulo} <span>{resaltado}</span>
          </h1>
          <p>{texto}</p>
        </div>
      </div>
    </section>
  );
}
