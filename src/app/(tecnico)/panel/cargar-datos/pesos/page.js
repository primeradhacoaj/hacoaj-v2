import { obtenerJugadoresParaCargar } from "@/lib/data/cargarDatos";
import { createClient } from "@/lib/supabase/server";
import CabeceraCarga from "../_componentes/CabeceraCarga";
import styles from "../CargarDatos.module.css";
import CargarPesos from "./CargarPesos";

export const metadata = {
  title: "Cargar pesos",
};

export default async function CargarPesosPage() {
  const jugadores = await obtenerJugadoresParaCargar(await createClient());
  return (
    <>
      <CabeceraCarga
        volverHref="/panel/cargar-datos"
        volverTexto="Volver a Cargar datos"
        titulo="Cargar"
        resaltado="Pesos"
        texto="Registrá los pesajes de cada jugador."
        chica
      />
      <div className={styles.contenidoCarga}>
        <CargarPesos jugadores={jugadores} />
      </div>
    </>
  );
}
