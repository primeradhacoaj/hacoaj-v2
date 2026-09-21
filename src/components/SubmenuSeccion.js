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
import styles from "./SubmenuSeccion.module.css";

// Submenú de una sección del jugador (Mi fuerza, Composición corporal,
// Encuestas…). Es el mismo diseño de la v1 para todas: encabezado compacto,
// tarjeta del jugador y una lista de opciones.
//
// Props:
//   seccion, titulo, subtitulo    textos del encabezado
//   decoracion, estiloDecoracion  dibujo de fondo del encabezado (un <svg>) y su posición
//   iconoPildora, textoPildora    ícono y texto dorados bajo el nombre del jugador
//   tituloLista, notaLista        título de la lista y nota a la derecha (ej. "Tus registros" / "2 vistas")
//   opciones                      lista de { icono, tono, titulo, descripcion, href, destacado, disponible }
//                                 (`disponible: false` = todavía sin pantalla: al tocarla avisa)
export default function SubmenuSeccion({
  seccion,
  titulo,
  subtitulo,
  decoracion,
  estiloDecoracion,
  iconoPildora,
  textoPildora,
  tituloLista,
  notaLista,
  opciones,
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
        <SectionLabel nota={notaLista}>{tituloLista}</SectionLabel>

        <nav className={styles.lista} aria-label={tituloLista}>
          {opciones.map((opcion) => (
            <MenuItem
              key={opcion.href}
              grande
              destacado={opcion.destacado}
              icono={opcion.icono}
              tono={opcion.tono}
              titulo={opcion.titulo}
              descripcion={opcion.descripcion}
              href={opcion.href}
              disponible={opcion.disponible}
              onNoDisponible={() => mostrar(AVISO_MIGRANDO)}
            />
          ))}
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
