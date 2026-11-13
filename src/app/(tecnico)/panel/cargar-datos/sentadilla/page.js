import { obtenerJugadoresParaCargar } from "@/lib/data/cargarDatos";
import { createClient } from "@/lib/supabase/server";
import CabeceraCarga from "../_componentes/CabeceraCarga";
import styles from "../CargarDatos.module.css";
import CargarFuerza from "../CargarFuerza";

export const metadata = {
  title: "Cargar fuerza Sentadilla",
};

export default async function CargarFuerzaSentadillaPage() {
  const jugadores = await obtenerJugadoresParaCargar(await createClient());
  return (
    <>
      <CabeceraCarga
        volverHref="/panel/cargar-datos"
        volverTexto="Volver a Cargar datos"
        titulo="Fuerza"
        resaltado="Sentadilla"
        texto="Cargá los resultados de testeos de sentadilla para cada jugador."
        chica
      />
      <div className={styles.contenidoCarga}>
        <CargarFuerza tipo="sentadilla" jugadores={jugadores} />
      </div>
    </>
  );
}
