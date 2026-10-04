"use client";

import Aviso from "@/components/Aviso";
import HeroSeccion from "@/components/HeroSeccion";
import Icono from "@/components/Icono";
import MenuItem from "@/components/MenuItem";
import PerfilChip from "@/components/PerfilChip";
import PieVolver from "@/components/PieVolver";
import SectionLabel from "@/components/SectionLabel";
import { useSesion } from "@/components/SesionProvider";
import { AVISO_MIGRANDO } from "@/lib/menus";
import { useAviso } from "@/lib/useAviso";
import styles from "./SubmenuSeccion.module.css";

// Submenú de una sección del jugador (Mi fuerza, Composición corporal,
// Encuestas, Torneo…). Es el mismo diseño de la v1 para todas: encabezado
// compacto, tarjeta del jugador y una o más listas de opciones.
//
// Props:
//   seccion, titulo, subtitulo    textos del encabezado
//   decoracion, estiloDecoracion  dibujo de fondo del encabezado (un <svg>) y su posición
//   iconoPildora                  (opcional) ícono dorado antes del texto de la píldora
//   textoPildora                  texto dorado bajo el nombre del jugador
//   secciones                     lista de { titulo, nota, separacion?, opciones }; o bien, para una
//                                 sola lista: tituloLista, notaLista y opciones
//   cada opción                   { icono, tono, titulo, descripcion, href, destacado, disponible }
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
  secciones,
}) {
  const { sesion } = useSesion();
  const { mensaje, visible, mostrar } = useAviso();
  const listas = secciones ?? [{ titulo: tituloLista, nota: notaLista, opciones }];

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
        foto={sesion.foto}
        pildora={
          <>
            {iconoPildora && <Icono nombre={iconoPildora} tamano={13} strokeWidth={2} />}
            {textoPildora}
          </>
        }
      />

      <main className={styles.contenido}>
        {listas.map((lista, indice) => (
          <section key={lista.titulo}>
            <SectionLabel
              nota={lista.nota}
              separada={indice > 0 ? (lista.separacion ?? true) : false}
            >
              {lista.titulo}
            </SectionLabel>
            <nav className={styles.lista} aria-label={lista.titulo}>
              {lista.opciones.map((opcion) => (
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
          </section>
        ))}

        <PieVolver />
      </main>

      <Aviso mensaje={mensaje} visible={visible} />
    </div>
  );
}
