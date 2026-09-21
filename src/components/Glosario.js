import styles from "./Glosario.module.css";

// Tarjeta "¿Qué significa cada dato?" de las pantallas de mediciones (copiada
// de la v1).
//
// Props:
//   items  lista de { sigla, texto, formula? } (la fórmula es opcional)
export default function Glosario({ items }) {
  return (
    <div className={styles.glosario}>
      <div className={styles.titulo}>¿Qué significa cada dato?</div>
      <div className={styles.lista}>
        {items.map((item) => (
          <div key={item.sigla} className={styles.item}>
            <div className={styles.sigla}>{item.sigla}</div>
            <div className={styles.texto}>
              {item.texto}
              {item.formula && <div className={styles.formula}>{item.formula}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
