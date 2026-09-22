import { agruparFormacion, ETIQUETAS_POSICION } from "@/lib/formaciones";
import { eventosDeSintesis } from "@/lib/torneo";
import styles from "./SintesisPanel.module.css";

function Equipo({ nombre, jugadores }) {
  const { lineas, suplentes, esquema } = agruparFormacion(jugadores);

  return (
    <div className={styles.equipo}>
      <div className={styles.nombreEquipo}>
        {nombre} <span className={styles.esquema}>{esquema}</span>
      </div>
      {Object.entries(lineas)
        .filter(([, jugadoresLinea]) => jugadoresLinea.length > 0)
        .map(([pos, jugadoresLinea]) => (
          <div key={pos} className={styles.linea}>
            {jugadoresLinea.map((j, indice) => (
              <span key={j.numero_camiseta ?? j.apellido}>
                <span className={styles.numero}>{j.numero_camiseta || "-"}</span>
                {j.apellido}
                {indice < jugadoresLinea.length - 1 && " · "}
              </span>
            ))}{" "}
            <span className={styles.puesto}>{ETIQUETAS_POSICION[pos]}</span>
          </div>
        ))}
      {suplentes.length > 0 && (
        <div className={styles.suplentes}>
          Suplentes: {suplentes.map((j) => `${j.numero_camiseta || "-"} ${j.apellido}`).join(", ")}
        </div>
      )}
    </div>
  );
}

// Síntesis de un partido jugado, para el fixture del panel técnico. Mismo
// contenido que la versión del jugador, con el diseño del panel.
//
// Props:
//   estado  "cargando" | "listo" | "vacio" | "error"
//   datos   lo que devuelve `obtenerSintesis` (solo cuando estado es "listo")
export default function SintesisPanel({ estado, datos }) {
  if (estado === "cargando") {
    return <div className={styles.aviso}>Cargando síntesis...</div>;
  }
  if (estado === "error") {
    return <div className={styles.aviso}>Error al cargar</div>;
  }
  if (estado !== "listo") {
    return <div className={styles.aviso}>Sin síntesis disponible</div>;
  }

  const eventos = eventosDeSintesis(datos);
  const hayFormacion = datos.formacion_local?.length > 0 || datos.formacion_visitante?.length > 0;
  if (!hayFormacion && eventos.length === 0) {
    return <div className={styles.aviso}>Sin síntesis disponible</div>;
  }

  return (
    <>
      {datos.formacion_local?.length > 0 && (
        <Equipo nombre={datos.partido.equipo_local} jugadores={datos.formacion_local} />
      )}
      {datos.formacion_visitante?.length > 0 && (
        <Equipo nombre={datos.partido.equipo_visitante} jugadores={datos.formacion_visitante} />
      )}
      {eventos.length > 0 && (
        <div className={styles.eventos}>
          {eventos.map((e, indice) => (
            <div key={indice} className={styles.evento}>
              <span className={styles.icono}>{e.icono}</span>
              <span className={styles.minuto}>{e.minuto != null ? `${e.minuto}'` : ""}</span>
              <span className={styles.nombre}>{e.nombre}</span>
              <span className={styles.detalle}>{e.detalle}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
