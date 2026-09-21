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

  const fechaTexto = fechaLegible(fecha);

  return (
    <>
      {esNuevo && <div className={styles.nuevo}>✦ Nuevas métricas</div>}

      <div className={styles.rejilla}>
        <div className={styles.baldosa}>
          <div className={styles.valor}>
            {formatear(vmp, 2)}
            <span className={styles.unidad}> m/s</span>
          </div>
          <div className={styles.etiqueta}>VMP</div>
        </div>
        <div className={styles.baldosa}>
          <div className={styles.valor}>
            {formatear(cargaExterna, 0)}
            <span className={styles.unidad}> kg</span>
          </div>
          <div className={styles.etiqueta}>Carga</div>
        </div>
        <div className={cx(styles.baldosa, styles.destacada)}>
          {deltaRm !== null && (
            <span
              className={cx(styles.deltaRm, deltaRm > 0 ? styles.sube : styles.baja)}
            >
              {deltaRm > 0 ? "+" : ""}
              {deltaRm.toFixed(0)} kg
            </span>
          )}
          <div className={styles.valor}>
            {formatear(rm, 0)}
            <span className={styles.unidad}> kg</span>
          </div>
          <div className={styles.etiqueta}>RM est.</div>
        </div>
      </div>

      <div className={styles.rejilla}>
        {porcentajes.map((p) => (
          <div key={p.etiqueta} className={cx(styles.baldosa, styles.baldosaPct)}>
            <div className={cx(styles.valor, styles.valorPct)}>
              {formatear(p.valor, 1)}
              <span className={styles.unidad}> kg</span>
            </div>
            <div className={styles.etiqueta}>{p.etiqueta}</div>
          </div>
        ))}
      </div>

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
        <div className={cx(styles.estado, styles[`estado-${estado.tono}`])}>
          {estado.texto}
        </div>
      </div>

      {fechaTexto && <div className={styles.fecha}>📅 Test: {fechaTexto}</div>}
    </>
  );
}
