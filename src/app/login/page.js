import Image from "next/image";
import LoginForm from "./LoginForm";
import styles from "./page.module.css";

export const metadata = {
  title: "Ingresar",
};

// Esta página se arma en el servidor. El formulario, que necesita estado y
// eventos, es un componente de cliente aparte (LoginForm).
//
// En celular el panel de marca queda arriba y el formulario abajo; en
// pantallas anchas se dividen en dos columnas.
export default function LoginPage() {
  return (
    <div className={styles.contenedor}>
      <aside className={styles.marca}>
        <div className={styles.marcaSuperior}>
          <span className={styles.escudoFila}>
            <Image
              src="/escudo.png"
              alt=""
              width={26}
              height={32}
              className={styles.escudo}
              priority
            />
            Club Náutico Hacoaj
          </span>
          <span className={styles.temporada}>
            <span className={styles.punto} />
            Temporada
          </span>
        </div>

        <div className={styles.identidad}>
          <Image
            src="/torneo_amateur.png"
            alt="Torneo Promocional Amateur AFA"
            width={84}
            height={84}
            className={styles.logoTorneo}
            priority
          />
          <div>
            <h1 className={styles.titulo}>
              Primera <span className={styles.acento}>D</span>
            </h1>
            <span className={styles.pildora}>Torneo Promocional Amateur</span>
            <p className={styles.lema}>
              Tu panel personal de rendimiento — fuerza, composición corporal y
              encuestas post-partido.
            </p>
          </div>
        </div>

        <span className={styles.nota}>
          Acceso exclusivo para jugadores del plantel
        </span>
      </aside>

      <main className={styles.panelFormulario}>
        <div className={styles.formularioInterior}>
          <LoginForm />

          <div className={styles.creditos}>
            <strong>Federico Saroka</strong> — Desarrollador técnico
            <br />
            <strong>Daniel Cajarabilla</strong> — Desarrollador metodológico
          </div>
        </div>
      </main>
    </div>
  );
}
