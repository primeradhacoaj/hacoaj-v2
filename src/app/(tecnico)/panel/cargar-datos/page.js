import ActionCard from "@/components/ActionCard";
import Icono from "@/components/Icono";
import hero from "../encuestas/Encuestas.module.css";
import styles from "./CargarDatos.module.css";

export const metadata = {
  title: "Cargar datos",
};

const MODULOS = [
  {
    id: "sentadilla",
    titulo: "Fuerza Sentadilla",
    descripcion:
      "Cargá resultados de testeos de sentadilla: VMP, carga externa, RM estimado, fuerza relativa, peso y comentarios.",
    icono: "fuerza",
    tono: "blue",
    etiquetas: ["VMP", "RM estimado", "Fuerza relativa"],
  },
  {
    id: "pecho",
    titulo: "Fuerza Pecho",
    descripcion:
      "Cargá resultados de testeos de press de pecho: VMP, carga externa, RM estimado, fuerza relativa, peso y comentarios.",
    icono: "fuerza",
    tono: "pink",
    etiquetas: ["VMP", "RM estimado", "Fuerza relativa"],
  },
  {
    id: "pesos",
    titulo: "Pesos",
    descripcion: "Registrá el peso corporal de cada jugador. Podés cargar varios pesajes en una misma sesión.",
    icono: "barras",
    tono: "green",
    etiquetas: ["Peso corporal", "Pesaje"],
  },
];

// Menú de "Cargar datos" del panel técnico (copiado de la v1): elegir qué cargar.
export default function CargarDatosPage() {
  return (
    <>
      <section className={hero.hero}>
        <div className={hero.heroInterior}>
          <div className={hero.heroInsignia}>
            <span className={hero.heroPunto} />
            Panel técnico
          </div>
          <h1>
            Cargar <span>datos</span>
          </h1>
          <p className={hero.heroTexto}>Seleccioná el módulo donde querés cargar información al sistema.</p>
        </div>
      </section>

      <div className={hero.contenido}>
        <div className={styles.cajaInfo}>
          <Icono nombre="campana" tamano={20} strokeWidth={1.7} />
          <p>
            Elegí un módulo para <strong>cargar</strong> registros. Podés buscar a <strong>cualquier jugador</strong>, esté
            activo o no, y si todavía no está en la base lo podés <strong>crear</strong> ahí mismo (queda como jugador
            inactivo, sin usuario). Los cambios se guardan directamente en la base de datos.
          </p>
        </div>

        <h2 className={hero.etiquetaSeccion}>Módulos de carga</h2>
        <div className={styles.modulos}>
          {MODULOS.map((m) => (
            <ActionCard
              key={m.id}
              icono={m.icono}
              tono={m.tono}
              titulo={m.titulo}
              descripcion={m.descripcion}
              href={`/panel/cargar-datos/${m.id}`}
              etiquetas={m.etiquetas}
            />
          ))}
        </div>
      </div>
    </>
  );
}
