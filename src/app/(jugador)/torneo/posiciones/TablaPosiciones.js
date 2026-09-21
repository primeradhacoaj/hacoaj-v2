import SectionLabel from "@/components/SectionLabel";
import TablaTorneo from "@/components/TablaTorneo";

const COLUMNAS = [
  { titulo: "#", tipo: "pos" },
  { titulo: "Equipo", tipo: "nombre" },
  { titulo: "Pts", tipo: "puntos" },
  { titulo: "J", tipo: "dato" },
  { titulo: "G", tipo: "dato" },
  { titulo: "E", tipo: "dato" },
  { titulo: "P", tipo: "dato" },
  { titulo: "GF", tipo: "dato" },
  { titulo: "GC", tipo: "dato" },
  { titulo: "Dif", tipo: "dato" },
];

// Tabla de una zona: rótulo con el nombre de la zona y la cantidad de equipos,
// y una fila por equipo (la de Hacoaj se resalta).
export default function TablaPosiciones({ zona, filas, primera = false }) {
  return (
    <section>
      <SectionLabel nota={`${filas.length} equipos`} separada={primera ? false : 20}>
        {zona}
      </SectionLabel>
      <TablaTorneo
        titulo={zona}
        columnas={COLUMNAS}
        plantilla="28px 1fr repeat(8, 30px)"
        plantillaChica="24px 1fr repeat(8, 26px)"
        fuenteChica={10}
        filas={filas.map((f) => ({
          id: f.nombre,
          hacoaj: f.es_hacoaj,
          celdas: [f.pos, f.nombre, f.pts, f.j, f.g, f.e, f.p, f.gf, f.gc, f.dif],
        }))}
      />
    </section>
  );
}
