"use client";

import Aviso from "@/components/Aviso";
import Hero from "@/components/Hero";
import Icono from "@/components/Icono";
import MenuItem from "@/components/MenuItem";
import PerfilChip from "@/components/PerfilChip";
import SectionLabel from "@/components/SectionLabel";
import { useSesion } from "@/components/SesionProvider";
import { AVISO_MIGRANDO, AVISO_PRONTO, MENU_JUGADOR } from "@/lib/menus";
import { cx } from "@/lib/cx";
import { useAviso } from "@/lib/useAviso";
import styles from "./MenuJugador.module.css";

// Menú principal del jugador (diseño original de la v1). Es un componente de
// cliente porque necesita saber quién inició sesión (nombre), poder cerrar la
// sesión y mostrar avisos al tocar opciones que todavía no tienen pantalla.
export default function MenuJugador() {
  const { sesion, cerrar } = useSesion();
  const { mensaje, visible, mostrar } = useAviso();

  return (
    <div className={styles.pagina}>
      <Hero subtitulo="Tu panel personal de rendimiento" />
      <PerfilChip nombre={sesion.nombre} foto={sesion.foto} detalle="Plantel Primera D" />

      <main className={styles.contenido}>
        {/* Por cada sección del menú se dibuja un título y sus opciones */}
        {MENU_JUGADOR.map((seccion, indice) => (
          <section key={seccion.seccion}>
            <SectionLabel nota={seccion.nota} separada={indice > 0}>
              {seccion.seccion}
            </SectionLabel>
            <nav className={styles.lista} aria-label={seccion.seccion}>
              {seccion.items.map((item) => (
                <MenuItem
                  key={item.id}
                  icono={item.icono}
                  tono={item.tono}
                  titulo={item.titulo}
                  descripcion={item.descripcion}
                  href={item.href}
                  disponible={item.disponible}
                  pronto={item.pronto}
                  onNoDisponible={() =>
                    mostrar(item.aviso ?? (item.pronto ? AVISO_PRONTO : AVISO_MIGRANDO))
                  }
                />
              ))}
            </nav>
          </section>
        ))}

        <div className={styles.pie}>
          <button type="button" className={cx(styles.salir)} onClick={cerrar}>
            <Icono nombre="salir" tamano={14} strokeWidth={2.2} />
            Cerrar sesión
          </button>
          <span className={styles.version}>Primera D · Hacoaj</span>
        </div>
      </main>

      <Aviso mensaje={mensaje} visible={visible} />
    </div>
  );
}
