import Baldosa, { RejillaBaldosas } from "@/components/Baldosa";
import FechaTest from "@/components/FechaTest";
import InsigniaEstado from "@/components/InsigniaEstado";
import {
  aNumero,
  diferencia,
  estadoProgreso,
  fechaLegible,
  formatear,
} from "@/lib/fuerza";
import { cx } from "@/lib/cx";
import styles from "./MetricasEjercicio.module.css";

// Métricas de un ejercicio (pecho o sentadilla): VMP, carga, RM estimado,
// porcentajes de trabajo y avance de la fuerza relativa hacia el objetivo.
// Copia la lógica de la v1.
//
// Props:
//   vmp, cargaExterna, rm, fuerzaRelativa   valores de la medición actual
//   objetivo                                 fuerza relativa a alcanzar (1.3 pecho, 1.8 sentadilla)
//   fecha                                    fecha del test
//   rmPrevio, fuerzaRelativaPrevia           valores del test anterior (para las flechas de variación)
//   esNuevo                                  muestra "Nuevas métricas"
export default function MetricasEjercicio({
  vmp,
  cargaExterna,
  rm,
  fuerzaRelativa,
  objetivo,
  fecha,
  rmPrevio,
  fuerzaRelativaPrevia,
  esNuevo,
}) {
  const relativa = aNumero(fuerzaRelativa) ?? 0;
  const proporcion = objetivo > 0 ? relativa / objetivo : 0;
  const porcentaje = Math.min(proporcion * 100, 100);
  const estado = estadoProgreso(proporcion);

  const rmNumero = aNumero(rm);
  const deltaRm = diferencia(rm, rmPrevio);
  const deltaRelativa = diferencia(fuerzaRelativa, fuerzaRelativaPrevia);

  // Cargas de trabajo: 60%, 75% y 80% del RM estimado
  const porcentajes = [
    { etiqueta: "Fuerza 60%", valor: rmNumero !== null ? rmNumero * 0.6 : null },
    { etiqueta: "Fuerza 75%", valor: rmNumero !== null ? rmNumero * 0.75 : null },
    { etiqueta: "Fuerza 80%", valor: rmNumero !== null ? rmNumero * 0.8 : null },
  ];

  return (
    <>
      {esNuevo && <div className={styles.nuevo}>✦ Nuevas métricas</div>}

      <RejillaBaldosas>
        <Baldosa valor={formatear(vmp, 2)} unidad="m/s" etiqueta="VMP" />
        <Baldosa valor={formatear(cargaExterna, 0)} unidad="kg" etiqueta="Carga" />
        <Baldosa
          variante="destacada"
          valor={formatear(rm, 0)}
          unidad="kg"
          etiqueta="RM est."
          adorno={
            deltaRm !== null && (
              <span className={cx(styles.deltaRm, deltaRm > 0 ? styles.sube : styles.baja)}>
                {deltaRm > 0 ? "+" : ""}
                {deltaRm.toFixed(0)} kg
              </span>
            )
          }
        />
      </RejillaBaldosas>

      <RejillaBaldosas>
        {porcentajes.map((p) => (
          <Baldosa
            key={p.etiqueta}
            variante="porcentaje"
            valor={formatear(p.valor, 1)}
            unidad="kg"
            etiqueta={p.etiqueta}
          />
        ))}
      </RejillaBaldosas>

      <div className={styles.progreso}>
        <div className={styles.progresoCabecera}>
          <div className={styles.progresoTextos}>
            <div className={styles.progresoTitulo}>Fuerza relativa</div>
            <div className={styles.progresoSub}>Objetivo: {objetivo}</div>
          </div>
          <div className={styles.progresoNumeros}>
            <div className={styles.progresoFila}>
              <div className={cx(styles.progresoValor, styles[`c-${estado.tono}`])}>
                {formatear(fuerzaRelativa, 2)}
              </div>
              {deltaRelativa !== null && deltaRelativa !== 0 && (
                <span
                  className={deltaRelativa > 0 ? styles.tendenciaSube : styles.tendenciaBaja}
                >
                  {deltaRelativa > 0 ? "+" : ""}
                  {deltaRelativa.toFixed(2)}
                </span>
              )}
            </div>
            <div className={styles.objetivo}>/ {objetivo}</div>
          </div>
        </div>
        <div className={styles.pista}>
          <div
            className={cx(styles.relleno, styles[`bg-${estado.tono}`])}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <div className={styles.estado}>
          <InsigniaEstado tono={estado.tono}>{estado.texto}</InsigniaEstado>
        </div>
      </div>

      <FechaTest fecha={fechaLegible(fecha)} />
    </>
  );
}
