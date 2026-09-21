import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Hero from "@/components/Hero";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <Hero subtitulo="Panel de rendimiento del plantel" />

      <main className={styles.content}>
        <Card as="section">
          <Badge punto>Versión 2</Badge>
          <h2 className={styles.cardTitle}>Estamos construyendo la nueva app</h2>
          <p className={styles.cardText}>
            Muy pronto vas a poder ingresar y ver tus mediciones, rutinas y
            estadísticas del torneo.
          </p>
          <div className={styles.accion}>
            <Button href="/login" bloque>
              Ir al login
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
