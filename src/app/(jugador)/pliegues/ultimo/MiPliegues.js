"use client";

import { useEffect, useState } from "react";
import CommentBox from "@/components/CommentBox";
import Glosario from "@/components/Glosario";
import PantallaDatos from "@/components/PantallaDatos";
import { useSesion } from "@/components/SesionProvider";
import SinDatos from "@/components/SinDatos";
import TarjetaJugador from "@/components/TarjetaJugador";
import TarjetaRecurso from "@/components/TarjetaRecurso";
import TituloBloque from "@/components/TituloBloque";
import { obtenerMiPliegue } from "@/lib/data/pliegues";
import MetricasPliegues from "./MetricasPliegues";
import styles from "./MiPliegues.module.css";

// Textos del glosario (copiados de la v1)
const GLOSARIO = [
  { sigla: "Peso", texto: "Peso corporal registrado al momento del test." },
  { sigla: "Talla", texto: "Altura del jugador medida en centímetros." },
  {
    sigla: "Σ 6 PL",
    texto:
      "Sumatoria de seis pliegues corporales. Resume la medición de grasa subcutánea en distintas zonas del cuerpo. Mientras mas bajo, mejor composición corporal. Es un indicador comúnmente usado para estimar el porcentaje de grasa corporal.",
    formula: "Valores estimados según referencia de B Nacional: <50 mm bueno · 50-60 regular · >60 alto",
  },
  { sigla: "P. ideal", texto: "Peso objetivo o recomendado según la evaluación corporal." },
];

// Documentos de las tarjetas de recursos (PDFs en /public/rutinas)
const PAUTAS = [
  {
    nombre: "Pautas para aumento de masa muscular",
    archivo: "Pautas para aumento de masa muscular HACOAJ.pdf",
  },
  {
    nombre: "Pautas para descenso de pliegues",
    archivo: "Pautas para descenso de pliegues HACOAJ.pdf",
  },
];
const SUPLEMENTACION = [
  { nombre: "Protocolo de suplementación", archivo: "Protocolo Suplementacion.pdf" },
];

// Última medición de pliegues del jugador (diseño y lógica de la v1).
export default function MiPliegues() {
  const { sesion } = useSesion();
  // fase: "cargando" | "listo" | "error"
  const [estado, setEstado] = useState({ fase: "cargando" });

  useEffect(() => {
    let cancelado = false;

    obtenerMiPliegue()
      .then((datos) => {
        if (cancelado) return;
        if (datos.status !== "success") {
          setEstado({ fase: "error", mensaje: datos.message });
          return;
        }
        setEstado({ fase: "listo", datos });
      })
      .catch((error) => {
        if (!cancelado) setEstado({ fase: "error", mensaje: error.message });
      });

    // Si el jugador sale de la pantalla antes de que lleguen los datos, se descartan
    return () => {
      cancelado = true;
    };
  }, [sesion.usuario]);

  return (
    <PantallaDatos volverHref="/pliegues">
      {estado.fase === "cargando" && (
        <div className={styles.cargando}>
          <div className={styles.spinner} />
          <div className={styles.cargandoTexto}>Cargando pliegues…</div>
        </div>
      )}

      {estado.fase === "error" && (
        <div className={styles.error}>Error: {estado.mensaje}</div>
      )}

      {estado.fase === "listo" && <Contenido sesion={sesion} datos={estado.datos} />}
    </PantallaDatos>
  );
}

function Contenido({ sesion, datos }) {
  const pliegue = datos.pliegue;

  return (
    <>
      <TarjetaJugador
        nombre={sesion.nombre}
        subtitulo="Mis pliegues"
        posicion={sesion.posicion}
        piernaHabil={sesion.piernaHabil}
        peso={pliegue?.Peso ?? null}
      />

      <TituloBloque color="var(--blue-600)">Composición corporal</TituloBloque>
      <div className={styles.tarjeta}>
        {pliegue ? (
          <MetricasPliegues pliegue={pliegue} />
        ) : (
          <SinDatos
            mensaje={
              datos.message || "No se hicieron los datos de pliegues para este usuario"
            }
          />
        )}
      </div>

      {pliegue && <CommentBox items={[{ texto: pliegue.Comentario }]} />}

      <TarjetaRecurso
        icono="nutricion"
        titulo="Pautas nutricionales"
        descripcion="Guías de alimentación del cuerpo técnico"
        documentos={PAUTAS}
      />

      <TarjetaRecurso
        icono="pastilla"
        titulo="Suplementación"
        descripcion="Protocolo de suplementación del plantel"
        aviso="⚠️ Este protocolo es orientativo. Consultá con un médico antes de incorporar cualquier suplemento."
        documentos={SUPLEMENTACION}
      />

      <Glosario items={GLOSARIO} />
    </>
  );
}
