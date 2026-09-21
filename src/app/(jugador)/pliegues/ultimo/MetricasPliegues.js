import Baldosa, { RejillaBaldosas } from "@/components/Baldosa";
import FechaTest from "@/components/FechaTest";
import InsigniaEstado from "@/components/InsigniaEstado";
import { fechaLegible, formatear } from "@/lib/fuerza";
import { estadoPliegues, textoDiferenciaPeso } from "@/lib/pliegues";
import styles from "./MetricasPliegues.module.css";

// Métricas de la última medición de pliegues: peso, peso ideal, sumatoria de
// 6 pliegues y talla, con el estado según la referencia de la B Nacional.
// Copia la lógica de la v1.
//
// Props:
//   pliegue  la medición (mismos nombres de campo que la hoja de la v1)
export default function MetricasPliegues({ pliegue }) {
  const peso = pliegue.Peso;
  const talla = pliegue.Talla;
  const sumatoria = pliegue["sumatoria 6 pl"] ?? pliegue["Σ 6 pl"];
  const pesoIdeal = pliegue["Peso ideal"];

  const estado = estadoPliegues(sumatoria);
  const comentarioPeso = textoDiferenciaPeso(peso, pesoIdeal);

  return (
    <>
      <RejillaBaldosas>
        <Baldosa valor={formatear(peso, 1)} unidad="kg" etiqueta="Peso" />
        <Baldosa valor={formatear(pesoIdeal, 0)} unidad="kg" etiqueta="Peso ideal" />
        <Baldosa
          variante="destacada"
          valor={formatear(sumatoria, 1)}
          unidad="mm"
          etiqueta="Sumatoria 6 pl"
        />
        <Baldosa valor={formatear(talla, 1)} unidad="cm" etiqueta="Talla" />
      </RejillaBaldosas>

      {comentarioPeso && (
        <div className={styles.comentarioPeso}>
          <span>⚖</span>
          <span>{comentarioPeso}</span>
        </div>
      )}

      <div className={styles.bloqueEstado}>
        <div className={styles.textos}>
          <div className={styles.titulo}>Estado según pliegues</div>
          <div className={styles.subtitulo}>
            Referencia estimada B Nacional:
            <br />
            &lt;50 bueno · 50-60 regular · &gt;60 alto
          </div>
        </div>
        <InsigniaEstado tono={estado.tono}>{estado.texto}</InsigniaEstado>
      </div>

      <FechaTest fecha={fechaLegible(pliegue["Fecha pliegue"])} />
    </>
  );
}
