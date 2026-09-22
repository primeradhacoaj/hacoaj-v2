import { cx } from "@/lib/cx";
import styles from "./ValorEscala.module.css";

// En "sueño" un valor más alto es mejor; en el resto (estrés, fatiga, dolor)
// un valor más alto es peor.
const INVERTIDAS = new Set(["sueno"]);

// Pastilla de color para un valor de wellness (1 a 10: rojo si es malo,
// amarillo si es intermedio, verde si es bueno), copiada de la v1.
export default function ValorEscala({ valor, campo }) {
  const numero = Number(valor);
  const nivel = numero <= 4 ? "bajo" : numero <= 6 ? "medio" : "alto";
  const tono = INVERTIDAS.has(campo)
    ? { bajo: "malo", medio: "medio", alto: "bueno" }[nivel]
    : { bajo: "bueno", medio: "medio", alto: "malo" }[nivel];
  return <span className={cx(styles.pastilla, styles[tono])}>{valor}</span>;
}
