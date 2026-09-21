import Image from "next/image";
import styles from "./Hero.module.css";

// Encabezado azul grande con el escudo y el nombre de la app. Se usa en las
// pantallas de entrada (inicio y login).
//
// Props:
//   subtitulo  frase corta debajo de "Primera D"
export default function Hero({ subtitulo }) {
  return (
    <header className={styles.hero}>
      <div className={styles.interior}>
        <div className={styles.marca}>
          <Image
            src="/escudo.png"
            alt="Escudo del Club Náutico Hacoaj"
            width={44}
            height={54}
            priority
          />
          <div className={styles.textoMarca}>
            <span className={styles.sobretitulo}>Club Náutico</span>
            <span className={styles.club}>Hacoaj</span>
          </div>
        </div>
        <h1 className={styles.titulo}>
          Primera <span className={styles.acento}>D</span>
        </h1>
        {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
      </div>
    </header>
  );
}
