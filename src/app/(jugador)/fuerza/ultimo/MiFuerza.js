"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CommentBox from "@/components/CommentBox";
import Icono from "@/components/Icono";
import PantallaDatos from "@/components/PantallaDatos";
import { useSesion } from "@/components/SesionProvider";
import { obtenerMiFuerza } from "@/lib/data/fuerza";
import {
  CLAVE_VISTO_PECHO,
  CLAVE_VISTO_SENTADILLA,
  esNuevo,
  marcarComoVisto,
} from "@/lib/fuerza";
import { iniciales } from "@/lib/sesion";
import { cx } from "@/lib/cx";
import MetricasEjercicio from "./MetricasEjercicio";
import styles from "./MiFuerza.module.css";

// Objetivos de fuerza relativa (RM estimado ÷ peso corporal)
const OBJETIVO_PECHO = 1.3;
const OBJETIVO_SENTADILLA = 1.8;

// Última medición de fuerza del jugador (diseño y lógica de la v1).
export default function MiFuerza() {
  const { sesion } = useSesion();
  // fase: "cargando" | "listo" | "error"
  const [estado, setEstado] = useState({ fase: "cargando" });

  useEffect(() => {
    let cancelado = false;

    obtenerMiFuerza(sesion.usuario)
      .then((datos) => {
        if (cancelado) return;
        if (datos.status !== "success") {
          setEstado({ fase: "error", mensaje: datos.message });
          return;
        }

        // ¿Hay mediciones que el jugador todavía no vio? Después se marcan como vistas.
        const fechaPecho = datos.pecho?.["Fecha Pecho"];
        const fechaSentadilla = datos.sentadilla?.["Fecha Sent"];
        const nuevoPecho = esNuevo(CLAVE_VISTO_PECHO, fechaPecho);
        const nuevaSentadilla = esNuevo(CLAVE_VISTO_SENTADILLA, fechaSentadilla);
        marcarComoVisto(CLAVE_VISTO_PECHO, fechaPecho);
        marcarComoVisto(CLAVE_VISTO_SENTADILLA, fechaSentadilla);

        setEstado({ fase: "listo", datos, nuevoPecho, nuevaSentadilla });
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
    <PantallaDatos volverHref="/fuerza">
      {estado.fase === "cargando" && (
        <div className={styles.cargando}>
          <div className={styles.spinner} />
          <div className={styles.cargandoTexto}>Cargando métricas…</div>
        </div>
      )}

      {estado.fase === "error" && (
        <div className={styles.error}>Error: {estado.mensaje}</div>
      )}

      {estado.fase === "listo" && (
        <Contenido sesion={sesion} estado={estado} />
      )}
    </PantallaDatos>
  );
}

function Contenido({ sesion, estado }) {
  const { datos, nuevoPecho, nuevaSentadilla } = estado;
  const pecho = datos.pecho;
  const sentadilla = datos.sentadilla;
  const peso = datos.peso_corporal || pecho?.PC || sentadilla?.PC || null;

  return (
    <>
      {/* Tarjeta del jugador */}
      <div className={styles.jugador}>
        <div className={styles.jugadorInterior}>
          <div className={styles.avatar}>{iniciales(sesion.nombre)}</div>
          <div className={styles.jugadorInfo}>
            <div className={styles.jugadorNombre}>{sesion.nombre}</div>
            <div className={styles.jugadorSub}>Mi fuerza</div>
            <div className={styles.etiquetas}>
              {sesion.posicion && (
                <span className={styles.etiqueta}>📍 {sesion.posicion}</span>
              )}
              {sesion.piernaHabil && (
                <span className={styles.etiqueta}>🦶 {sesion.piernaHabil}</span>
              )}
              <span className={styles.etiqueta}>⚖ {peso ? peso : "--"} kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Press de pecho */}
      <div className={styles.seccion}>
        <span className={cx(styles.punto, styles.pecho)} />
        <span className={styles.seccionTitulo}>Press de pecho</span>
      </div>
      <div className={styles.ejercicio}>
        {pecho && pecho["VMP PECHO"] != null ? (
          <MetricasEjercicio
            vmp={pecho["VMP PECHO"]}
            cargaExterna={pecho["C EXTERNA PECHO"]}
            rm={pecho["RM ESTIMADO PECHO"]}
            fuerzaRelativa={pecho["F RELATIVA (1,3) PECHO"]}
            objetivo={OBJETIVO_PECHO}
            fecha={pecho["Fecha Pecho"]}
            rmPrevio={datos.pecho_prev?.["RM ESTIMADO PECHO"]}
            fuerzaRelativaPrevia={datos.pecho_prev?.["F RELATIVA (1,3) PECHO"]}
            esNuevo={nuevoPecho}
          />
        ) : (
          <SinDatos />
        )}
      </div>

      {/* Sentadilla */}
      <div className={styles.seccion}>
        <span className={cx(styles.punto, styles.sentadilla)} />
        <span className={styles.seccionTitulo}>Sentadilla</span>
      </div>
      <div className={styles.ejercicio}>
        {sentadilla && sentadilla["VMP SENTADILLA"] != null ? (
          <MetricasEjercicio
            vmp={sentadilla["VMP SENTADILLA"]}
            cargaExterna={sentadilla["C EXTERNA SENT"]}
            rm={sentadilla["RM ESTIMADO SENT"]}
            fuerzaRelativa={sentadilla["F RELATIVA (1,8/2) SENT"]}
            objetivo={OBJETIVO_SENTADILLA}
            fecha={sentadilla["Fecha Sent"]}
            rmPrevio={datos.sentadilla_prev?.["RM ESTIMADO SENT"]}
            fuerzaRelativaPrevia={datos.sentadilla_prev?.["F RELATIVA (1,8/2) SENT"]}
            esNuevo={nuevaSentadilla}
          />
        ) : (
          <SinDatos />
        )}
      </div>

      <CommentBox
        items={[
          { subtitulo: "Press de pecho", texto: pecho?.Comentario },
          { subtitulo: "Sentadilla", texto: sentadilla?.Comentario },
        ]}
      />

      {/* Acceso directo a rutinas */}
      <Link href="/rutinas" className={styles.rutinas}>
        <div className={styles.rutinasIcono}>
          <Icono nombre="documento" tamano={22} />
        </div>
        <div className={styles.rutinasTexto}>
          <div className={styles.rutinasTitulo}>Rutinas disponibles</div>
          <div className={styles.rutinasDesc}>
            Ver y descargar los planes de entrenamiento
          </div>
        </div>
        <div className={styles.rutinasFlecha}>›</div>
      </Link>

      <Glosario />
    </>
  );
}

function SinDatos() {
  return (
    <div className={styles.sinDatos}>
      <div className={styles.sinDatosIcono}>
        <Icono nombre="encuestas" tamano={18} />
      </div>
      <span>Sin datos cargados</span>
    </div>
  );
}

// Explica qué significa cada dato (texto copiado de la v1)
function Glosario() {
  const items = [
    {
      sigla: "VMP",
      texto:
        "Velocidad Media Propulsiva. Qué tan rápido movés la carga en la fase activa del ejercicio. A mayor velocidad, mayor intensidad relativa.",
    },
    {
      sigla: "RM est.",
      texto:
        "Repetición Máxima estimada. El peso máximo que podrías mover una sola vez, calculado a partir de la carga usada y la velocidad medida.",
      formula: "RM = carga × factor(VMP)",
    },
    {
      sigla: "F. Rel.",
      texto:
        "Fuerza relativa. Relaciona tu fuerza máxima con tu peso corporal. Cuanto más alto, mejor rendimiento por kilo de tu cuerpo.",
      formula: "F.R. = RM estimado ÷ peso corporal",
    },
    {
      sigla: "F. x%",
      texto:
        "Porcentajes de tu RM estimado. Indican la carga que deberías usar según el tipo de trabajo (60%, 75%, 80%)",
      formula: "F x% = RM estimado × x / 100",
    },
  ];

  return (
    <div className={styles.glosario}>
      <div className={styles.glosarioTitulo}>¿Qué significa cada dato?</div>
      <div className={styles.glosarioLista}>
        {items.map((item) => (
          <div key={item.sigla} className={styles.glosarioItem}>
            <div className={styles.glosarioSigla}>{item.sigla}</div>
            <div className={styles.glosarioTexto}>
              {item.texto}
              {item.formula && (
                <div className={styles.glosarioFormula}>{item.formula}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
