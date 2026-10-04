"use client";

import Image from "next/image";
import IconoPanel from "@/components/IconoPanel";
import { useSesion } from "@/components/SesionProvider";
import { etiquetaRol, iniciales } from "@/lib/sesion";
import styles from "./BarraSuperior.module.css";

// Barra superior del panel técnico (diseño original de la v1): logo del club en
// blanco a la izquierda y, a la derecha, quién está conectado y el botón salir.
//
// Props:
//   titulo, subtitulo  textos que acompañan al logo
export default function BarraSuperior({ titulo, subtitulo }) {
  const { sesion, cerrar } = useSesion();

  return (
    <header className={styles.barra}>
      <div className={styles.logo}>
        <Image
          src="/logo_completo.png"
          alt="Náutico Hacoaj"
          width={84}
          height={42}
          className={styles.imagen}
          priority
        />
        <div>
          <div className={styles.titulo}>{titulo}</div>
          <div className={styles.subtitulo}>{subtitulo}</div>
        </div>
      </div>

      {sesion && (
        <div className={styles.derecha}>
          <div className={styles.usuario}>
            <div className={styles.avatar} aria-hidden="true">
              {iniciales(sesion.nombre)}
              {sesion.foto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sesion.foto} alt="" className={styles.foto} />
              )}
            </div>
            <div className={styles.datos}>
              <div className={styles.nombre}>{sesion.nombre}</div>
              <div className={styles.rol}>{etiquetaRol(sesion.rol)}</div>
            </div>
          </div>
          <button
            type="button"
            className={styles.salir}
            onClick={cerrar}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <IconoPanel nombre="salir" tamano={18} />
          </button>
        </div>
      )}
    </header>
  );
}
