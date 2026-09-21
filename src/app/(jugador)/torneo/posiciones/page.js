import Icono from "@/components/Icono";
import PantallaTorneo from "@/components/PantallaTorneo";
import { obtenerPosiciones } from "@/lib/data/torneo";
import TablaPosiciones from "./TablaPosiciones";
import styles from "./TablaPosiciones.module.css";

export const metadata = {
  title: "Tabla de posiciones",
};

// Pantalla de solo lectura: se arma en el servidor con los datos ya cargados.
export default async function PosicionesPage() {
  const { zona_a: zonaA, zona_b: zonaB } = await obtenerPosiciones();
  const hayDatos = zonaA.length > 0 || zonaB.length > 0;

  return (
    <PantallaTorneo titulo="Tabla de posiciones">
      {hayDatos ? (
        <>
          <TablaPosiciones zona="Zona A" filas={zonaA} primera />
          <TablaPosiciones zona="Zona B" filas={zonaB} />
          <p className={styles.fuente}>Fuente: soloascenso.com.ar</p>
        </>
      ) : (
        <div className={styles.vacio}>
          <div className={styles.vacioIcono}>
            <Icono nombre="posiciones" tamano={42} />
          </div>
          <h3>Sin datos</h3>
          <p>No se pudo obtener la tabla de posiciones en este momento.</p>
        </div>
      )}
    </PantallaTorneo>
  );
}
