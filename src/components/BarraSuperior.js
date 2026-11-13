"use client";

import Image from "next/image";
import Link from "next/link";
import IconoPanel from "@/components/IconoPanel";
import { useSesion } from "@/components/SesionProvider";
import { etiquetaRol, iniciales } from "@/lib/sesion";
import { cx } from "@/lib/cx";
import styles from "./BarraSuperior.module.css";

// Barra superior del panel técnico (diseño original de la v1): logo del club en
// blanco a la izquierda y, a la derecha, el botón para volver (si la pantalla
// lo lleva), quién está conectado y el botón salir.
//
// Props:
//   titulo, subtitulo  textos que acompañan al logo
//   volver             { href, texto } — link "← Volver…" a la derecha (como en la v1)
//   compacta           barra de 56px con el logo más chico (pantallas de encuestas de la v1)
//   usuario            mostrar quién está conectado (true por defecto)
//   salir              mostrar el botón de cerrar sesión (true por defecto)
export default function BarraSuperior({
  titulo,
  subtitulo,
  volver,
  compacta = false,
  usuario = true,
  salir = true,
}) {
  const { sesion, cerrar } = useSesion();

  return (
    <header className={cx(styles.barra, compacta && styles.compacta)}>
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

      <div className={styles.derecha}>
        {volver && (
          <Link href={volver.href} className={styles.volver}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {volver.texto}
          </Link>
        )}
        {sesion && usuario && (
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
        )}
        {sesion && salir && (
          <button
            type="button"
            className={styles.salir}
            onClick={cerrar}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <IconoPanel nombre="salir" tamano={18} />
          </button>
        )}
      </div>
    </header>
  );
}
