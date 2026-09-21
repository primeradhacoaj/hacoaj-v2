"use client";

import Link from "next/link";
import Aviso from "@/components/Aviso";
import HeroSeccion from "@/components/HeroSeccion";
import Icono from "@/components/Icono";
import MenuItem from "@/components/MenuItem";
import PerfilChip from "@/components/PerfilChip";
import SectionLabel from "@/components/SectionLabel";
import { useSesion } from "@/components/SesionProvider";
import { AVISO_MIGRANDO } from "@/lib/menus";
import { useAviso } from "@/lib/useAviso";
import styles from "./MenuFuerza.module.css";

// Silueta de una barra con pesas, de fondo en el encabezado (copiada de la v1).
const BARRA = (
  <svg viewBox="0 0 200 100" aria-hidden="true">
    <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
      <line x1="30" y1="50" x2="170" y2="50" />
      <rect x="14" y="30" width="14" height="40" rx="3" fill="#fff" stroke="none" />
      <rect x="172" y="30" width="14" height="40" rx="3" fill="#fff" stroke="none" />
      <rect x="2" y="38" width="10" height="24" rx="2" fill="#fff" stroke="none" />
      <rect x="188" y="38" width="10" height="24" rx="2" fill="#fff" stroke="none" />
    </g>
  </svg>
);

// Submenú "Mi fuerza": elegir entre el último registro y el historial
// (diseño original de la v1).
export default function MenuFuerza() {
  const { sesion } = useSesion();
  const { mensaje, visible, mostrar } = useAviso();

  return (
    <div className={styles.pagina}>
      <HeroSeccion
        seccion="Sección · Fuerza"
        titulo="Mi fuerza"
        subtitulo="Pecho, sentadilla y evolución"
        decoracion={BARRA}
      />

      <PerfilChip
        compacto
        saludo="Jugador"
        nombre={sesion.nombre}
        pildora={
          <>
            <Icono nombre="fuerza" tamano={13} strokeWidth={2} />
            Fuerza
          </>
        }
      />

      <main className={styles.contenido}>
        <SectionLabel nota="2 vistas">Tus registros</SectionLabel>

        <nav className={styles.lista} aria-label="Registros de fuerza">
          <MenuItem
            grande
            destacado
            icono="analytics"
            titulo="Mi último registro"
            descripcion="Ver tu medición más reciente"
            href="/fuerza/ultimo"
          />
          <MenuItem
            grande
            icono="encuestas"
            tono="navy"
            titulo="Mi historial"
            descripcion="Todos tus registros de fuerza"
            href="/fuerza/historial"
            disponible={false}
            onNoDisponible={() => mostrar(AVISO_MIGRANDO)}
          />
        </nav>

        <div className={styles.pie}>
          <Link href="/menu" className={styles.volver}>
            <Icono nombre="flechaIzquierda" tamano={14} strokeWidth={2.4} />
            Volver al menú
          </Link>
          <span className={styles.version}>Primera D · Hacoaj</span>
        </div>
      </main>

      <Aviso mensaje={mensaje} visible={visible} />
    </div>
  );
}
