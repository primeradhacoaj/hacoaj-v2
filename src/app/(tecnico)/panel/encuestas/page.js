import ActionCard from "@/components/ActionCard";
import PiePanel from "../../_componentes/PiePanel";
import styles from "./Encuestas.module.css";

export const metadata = {
  title: "Encuestas",
};

const ENCUESTAS = [
  {
    id: "post-partido",
    titulo: "Post Partido",
    descripcion:
      "Carga física, emocional, minutos jugados, golpes, molestias y comentarios de cada jugador después del partido.",
    icono: "encuestas",
    tono: "orange",
    href: "/panel/encuestas/post-partido",
    etiquetas: ["RPE", "Golpes", "Molestias", "Comentarios"],
  },
  {
    id: "wellness",
    titulo: "Wellness",
    descripcion: "Sueño, estrés, fatiga, dolor muscular y comentarios de bienestar general de cada jugador.",
    icono: "corazon",
    tono: "purple",
    href: "/panel/encuestas/wellness",
    etiquetas: ["Sueño", "Estrés", "Fatiga", "Dolor"],
  },
];

// Menú de encuestas del panel técnico: elegir entre ver las respuestas de
// post partido o de wellness cargadas por los jugadores.
export default function EncuestasPage() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroInterior}>
          <div className={styles.heroInsignia}>
            <span className={styles.heroPunto} />
            Encuestas del plantel
          </div>
          <h1>
            Encuestas <span>del plantel</span>
          </h1>
          <p className={styles.heroTexto}>
            Visualizá las respuestas de post partido y wellness cargadas por los jugadores.
          </p>
        </div>
      </section>

      <div className={styles.contenido}>
        <h2 className={styles.etiquetaSeccion}>Seleccioná una encuesta</h2>
        <div className={styles.tarjetas}>
          {ENCUESTAS.map((e) => (
            <ActionCard
              key={e.id}
              icono={e.icono}
              tono={e.tono}
              titulo={e.titulo}
              descripcion={e.descripcion}
              href={e.href}
              etiquetas={e.etiquetas}
            />
          ))}
        </div>
      </div>
      <PiePanel />
    </>
  );
}
