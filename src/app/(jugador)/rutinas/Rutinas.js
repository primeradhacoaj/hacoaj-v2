"use client";

import { useState } from "react";
import Icono from "@/components/Icono";
import PantallaDatos from "@/components/PantallaDatos";
import { useSesion } from "@/components/SesionProvider";
import TarjetaJugador from "@/components/TarjetaJugador";
import TituloBloque from "@/components/TituloBloque";
import { cx } from "@/lib/cx";
import { RUTINAS, direccionPdf } from "@/lib/rutinas";
import styles from "./Rutinas.module.css";

// Rutinas disponibles (diseño y comportamiento de la v1): una tarjeta por plan
// de entrenamiento, con "Abrir" y "Descargar", y un visor del PDF elegido.
export default function Rutinas() {
  const { sesion } = useSesion();
  const [elegida, setElegida] = useState(0); // posición del plan que se ve en el visor
  const plan = RUTINAS[elegida];

  return (
    <PantallaDatos volverHref="/fuerza/ultimo" ancho="ancho">
      <TarjetaJugador nombre={sesion.nombre} foto={sesion.foto} subtitulo="Rutinas disponibles" />

      <TituloBloque color="#c9a83e">Planes de entrenamiento</TituloBloque>

      <div className={styles.rejilla}>
        {RUTINAS.map((rutina, indice) => {
          const direccion = direccionPdf(rutina.archivo);
          return (
            // Tocar cualquier parte de la tarjeta la elige (como en la v1)
            <div
              key={rutina.archivo}
              className={cx(styles.tarjeta, indice === elegida && styles.activa)}
              onClick={() => setElegida(indice)}
            >
              <button
                type="button"
                className={styles.superior}
                aria-pressed={indice === elegida}
                onClick={() => setElegida(indice)}
              >
                <span className={styles.icono}>
                  <Icono nombre="documento" tamano={20} />
                </span>
                <span className={styles.info}>
                  <span className={styles.titulo}>{rutina.titulo}</span>
                  <span className={styles.descripcion}>{rutina.descripcion}</span>
                </span>
              </button>
              <div className={styles.acciones}>
                <a
                  href={direccion}
                  target="_blank"
                  rel="noopener"
                  className={cx(styles.boton, styles.principal)}
                  onClick={(e) => e.stopPropagation()}
                >
                  Abrir
                </a>
                <a
                  href={direccion}
                  download
                  className={cx(styles.boton, styles.secundario)}
                  onClick={(e) => e.stopPropagation()}
                >
                  Descargar
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.visor}>
        <div className={styles.visorTitulo}>{plan.titulo}</div>
        <div className={styles.visorNota}>
          Podés ver el PDF desde esta pantalla. Si el navegador no lo muestra
          correctamente, usá “Abrir” o “Descargar”.
        </div>
        <iframe
          className={styles.pdf}
          src={direccionPdf(plan.archivo)}
          title={`Vista previa: ${plan.titulo}`}
        />
      </div>
    </PantallaDatos>
  );
}
