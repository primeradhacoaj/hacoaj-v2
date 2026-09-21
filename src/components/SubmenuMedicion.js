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
import styles from "./SubmenuMedicion.module.css";

// Submenú de un tipo de medición (Mi fuerza, Mi composición corporal…): elegir
// entre el último registro y el historial. Es el mismo diseño de la v1 para
// todas las mediciones.
//
// Props:
//   seccion, titulo, subtitulo   textos del encabezado
//   decoracion, estiloDecoracion dibujo de fondo del encabezado (un <svg>) y su posición
//   iconoPildora, textoPildora   ícono y texto dorados bajo el nombre del jugador
//   ultimoHref, historialHref    a dónde lleva cada opción
//   historialDescripcion         texto de la opción "Mi historial"
//   historialDisponible          false = todavía sin pantalla: al tocarla avisa
export default function SubmenuMedicion({
  seccion,
  titulo,
  subtitulo,
  decoracion,
  estiloDecoracion,
  iconoPildora,
  textoPildora,
  ultimoHref,
  historialHref,
  historialDescripcion,
  historialDisponible = true,
}) {
  const { sesion } = useSesion();
  const { mensaje, visible, mostrar } = useAviso();

  return (
    <div className={styles.pagina}>
      <HeroSeccion
        seccion={seccion}
        titulo={titulo}
        subtitulo={subtitulo}
        decoracion={decoracion}
        estiloDecoracion={estiloDecoracion}
      />

      <PerfilChip
        compacto
        saludo="Jugador"
        nombre={sesion.nombre}
        pildora={
          <>
            <Icono nombre={iconoPildora} tamano={13} strokeWidth={2} />
            {textoPildora}
          </>
        }
      />

      <main className={styles.contenido}>
        <SectionLabel nota="2 vistas">Tus registros</SectionLabel>

        <nav className={styles.lista} aria-label={`Registros de ${textoPildora.toLowerCase()}`}>
          <MenuItem
            grande
            destacado
            icono="analytics"
            titulo="Mi último registro"
            descripcion="Ver tu medición más reciente"
            href={ultimoHref}
          />
          <MenuItem
            grande
            icono="encuestas"
            tono="navy"
            titulo="Mi historial"
            descripcion={historialDescripcion}
            href={historialHref}
            disponible={historialDisponible}
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
