import Image from "next/image";
import styles from "./Hero.module.css";

// Encabezado azul de las pantallas del jugador (diseño original de la v1):
// escudo y nombre del club, insignia de temporada y "Primera D".
//
// Props:
//   subtitulo  frase corta debajo de "Primera D"
export default function Hero({ subtitulo }) {
  return (
    <header className={styles.hero}>
      <div className={styles.superior}>
        <div className={styles.marca}>
          <div className={styles.escudo}>
            <Image
              src="/escudo.png"
              alt="Escudo del Club Náutico Hacoaj"
              width={30}
              height={30}
              className={styles.escudoImagen}
              priority
            />
          </div>
          <div>
            <div className={styles.sobretitulo}>Club Náutico</div>
            <div className={styles.club}>Hacoaj</div>
          </div>
        </div>
        <span className={styles.temporada}>
          <span className={styles.punto} />
          Temporada
        </span>
      </div>

      <div className={styles.titulo}>
        <h1 className={styles.nombre}>
          Primera <span className={styles.acento}>D</span>
        </h1>
        {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
      </div>
    </header>
  );
}
