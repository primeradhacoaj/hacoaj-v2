import Image from "next/image";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.brand}>
            <Image
              src="/escudo.png"
              alt="Escudo del Club Náutico Hacoaj"
              width={44}
              height={54}
              priority
            />
            <div className={styles.brandText}>
              <span className={styles.eyebrow}>Club Náutico</span>
              <span className={styles.club}>Hacoaj</span>
            </div>
          </div>
          <h1 className={styles.title}>
            Primera <span className={styles.accent}>D</span>
          </h1>
          <p className={styles.subtitle}>
            Panel de rendimiento del plantel
          </p>
        </div>
      </header>

      <main className={styles.content}>
        <Card as="section">
          <Badge punto>Versión 2</Badge>
          <h2 className={styles.cardTitle}>Estamos construyendo la nueva app</h2>
          <p className={styles.cardText}>
            Muy pronto vas a poder ingresar y ver tus mediciones, rutinas y
            estadísticas del torneo.
          </p>
        </Card>
      </main>
    </div>
  );
}
