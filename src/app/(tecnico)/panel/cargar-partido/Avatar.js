"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import { inicialesDe } from "@/lib/cargarPartido";
import styles from "./CargarPartido.module.css";

// Círculo con las iniciales del jugador y, si tiene, su foto encima (si la foto no carga,
// quedan las iniciales).
export default function Avatar({ jugador, className }) {
  const [fallo, setFallo] = useState(false);
  return (
    <span className={cx(styles.avatar, className)}>
      {inicialesDe(jugador.nombre)}
      {jugador.foto && !fallo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={jugador.foto} alt="" onError={() => setFallo(true)} />
      )}
    </span>
  );
}
