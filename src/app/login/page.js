import Card from "@/components/Card";
import Hero from "@/components/Hero";
import LoginForm from "./LoginForm";
import styles from "./page.module.css";

export const metadata = {
  title: "Ingresar",
};

// Esta página se arma en el servidor. El formulario, que necesita estado y
// eventos, es un componente de cliente aparte (LoginForm).
export default function LoginPage() {
  return (
    <div className={styles.pagina}>
      <Hero subtitulo="Tu panel personal de rendimiento" />
      <main className={styles.contenido}>
        <Card as="section">
          <LoginForm />
        </Card>
      </main>
    </div>
  );
}
