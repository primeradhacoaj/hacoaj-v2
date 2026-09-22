"use client";

import Link from "next/link";
import ActionCard from "@/components/ActionCard";
import Aviso from "@/components/Aviso";
import IconoPanel from "@/components/IconoPanel";
import { useSesion } from "@/components/SesionProvider";
import { AVISO_MIGRANDO, AVISO_PRONTO, menuTecnicoParaRol } from "@/lib/menus";
import { accesosActivosDe, useAccesosRapidos } from "@/lib/useAccesosRapidos";
import { useAviso } from "@/lib/useAviso";
import styles from "./PanelTecnico.module.css";

// Panel principal de técnico y administrador (diseño original de la v1).
// Muestra las mismas secciones a los dos roles, salvo las tarjetas marcadas
// `soloAdmin`. Los accesos rápidos son los que cada técnico/admin activó en
// /panel/configuracion (por defecto, los 5 de la v1).
export default function PanelTecnico() {
  const { sesion } = useSesion();
  const { mensaje, visible, mostrar } = useAviso();
  const secciones = menuTecnicoParaRol(sesion.rol);
  const { config } = useAccesosRapidos();
  const accesos = accesosActivosDe(config);

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroInterior}>
          <div className={styles.heroInsignia}>
            <span className={styles.heroPunto} />
            Temporada 2026
          </div>
          <h1 className={styles.heroTitulo}>
            Bienvenido al panel
            <br />
            de <span>Hacoaj</span>
          </h1>
          <p className={styles.heroTexto}>
            Centro de análisis y gestión del plantel. Accedé a métricas de
            rendimiento, composición corporal, seguimiento de lesiones y más.
          </p>
        </div>
      </section>

      <main className={styles.contenido}>
        <h2 className={styles.etiquetaSeccion}>Acceso rápido</h2>
        <div className={styles.accesos}>
          {accesos.map((acceso) =>
            acceso.disponible ? (
              <Link key={acceso.id} href={acceso.href} className={styles.acceso}>
                <IconoPanel nombre={acceso.icono} tamano={16} />
                {acceso.titulo}
              </Link>
            ) : (
              <button
                key={acceso.id}
                type="button"
                className={styles.acceso}
                onClick={() => mostrar(AVISO_MIGRANDO)}
              >
                <IconoPanel nombre={acceso.icono} tamano={16} />
                {acceso.titulo}
              </button>
            ),
          )}
        </div>

        {secciones.map((seccion) => (
          <section key={seccion.seccion}>
            <h2 className={styles.etiquetaSeccion}>{seccion.seccion}</h2>
            <div className={styles.tarjetas}>
              {seccion.items.map((item) => (
                <ActionCard
                  key={item.id}
                  icono={item.icono}
                  tono={item.tono}
                  titulo={item.titulo}
                  descripcion={item.descripcion}
                  href={item.href}
                  etiquetas={item.etiquetas}
                  disponible={item.disponible}
                  onNoDisponible={() =>
                    mostrar(item.aviso ?? (item.pronto ? AVISO_PRONTO : AVISO_MIGRANDO))
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className={styles.pie}>
        <div>© 2026 Club Náutico Hacoaj · Panel Técnico</div>
        <div>Primera D · Temporada 2026</div>
      </footer>

      <Aviso mensaje={mensaje} visible={visible} />
    </>
  );
}
