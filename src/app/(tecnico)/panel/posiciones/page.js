import EtiquetaSeccion from "@/components/EtiquetaSeccion";
import PantallaPanel from "@/components/PantallaPanel";
import { obtenerPosiciones } from "@/lib/data/torneo";
import { createClient } from "@/lib/supabase/server";
import FuentePanel from "../../_componentes/FuentePanel";
import TablaPanel from "../../_componentes/TablaPanel";
import VacioPanel from "../../_componentes/VacioPanel";
import styles from "./Posiciones.module.css";

export const metadata = {
  title: "Tabla de posiciones",
};

const COLUMNAS = [
  { titulo: "#" },
  { titulo: "Equipo", izquierda: true },
  { titulo: "Pts", tipo: "puntos" },
  { titulo: "J" },
  { titulo: "G" },
  { titulo: "E" },
  { titulo: "P" },
  { titulo: "GF" },
  { titulo: "GC" },
  { titulo: "Dif" },
];

function celdasDe(fila) {
  return [fila.pos, fila.nombre, fila.pts, fila.j, fila.g, fila.e, fila.p, fila.gf, fila.gc, fila.dif];
}

export default async function PosicionesPanelPage() {
  const { zona_a: zonaA, zona_b: zonaB } = await obtenerPosiciones(await createClient());
  const hayDatos = zonaA.length > 0 || zonaB.length > 0;

  return (
    <PantallaPanel titulo="Tabla de posiciones">
      {hayDatos ? (
        <>
          <section className={styles.zona}>
            <EtiquetaSeccion nota={`${zonaA.length} equipos`}>Zona A</EtiquetaSeccion>
            <TablaPanel
              titulo="Zona A"
              columnas={COLUMNAS}
              filas={zonaA.map((f) => ({ id: f.nombre, hacoaj: f.es_hacoaj, celdas: celdasDe(f) }))}
            />
          </section>
          <section>
            <EtiquetaSeccion nota={`${zonaB.length} equipos`}>Zona B</EtiquetaSeccion>
            <TablaPanel
              titulo="Zona B"
              columnas={COLUMNAS}
              filas={zonaB.map((f) => ({ id: f.nombre, hacoaj: f.es_hacoaj, celdas: celdasDe(f) }))}
            />
          </section>
          <FuentePanel />
        </>
      ) : (
        <VacioPanel mensaje="No se pudo obtener la tabla de posiciones en este momento." />
      )}
    </PantallaPanel>
  );
}
