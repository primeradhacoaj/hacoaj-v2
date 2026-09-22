import { cx } from "@/lib/cx";
import styles from "./TimelinePanel.module.css";

// Línea de tiempo del partido (goles, cambios y tarjetas), copiada de la v1
// ("estilo 365Scores"): Hacoaj a la izquierda, el rival a la derecha.
export default function TimelinePanel({ rival, eventos, disciplina }) {
  if (eventos.length === 0 && disciplina.length === 0) {
    return <p className={styles.vacio}>No hay datos del resumen para este partido</p>;
  }

  const indiceEntretiempo = eventos.findIndex((ev) => ev.min !== null && ev.min <= 45);

  return (
    <div className={styles.tarjeta}>
      <div className={styles.cabecera}>
        <span className={styles.equipo}>Hacoaj</span>
        <span className={cx(styles.equipo, styles.rival)}>{rival || "Rival"}</span>
      </div>
      <div className={styles.linea}>
        {eventos.map((ev, indice) => (
          <div key={indice}>
            {indice === indiceEntretiempo && (
              <div className={styles.separador}>
                <span>Entretiempo</span>
              </div>
            )}
            <Evento evento={ev} />
          </div>
        ))}

        {disciplina.length > 0 && (
          <>
            <div className={styles.separador}>
              <span>Disciplina</span>
            </div>
            {disciplina.map((d, indice) => (
              <div key={indice} className={styles.fila}>
                <div className={styles.izquierda}>
                  {d.equipo === "hacoaj" && (
                    <>
                      <span className={styles.jugadorSalido}>{d.jugador}</span> <Tarjeta tipo={d.tipo} />
                    </>
                  )}
                </div>
                <div className={styles.centro} />
                <div className={styles.derecha}>
                  {d.equipo === "rival" && (
                    <>
                      <Tarjeta tipo={d.tipo} /> <span className={styles.jugadorSalido}>{d.jugador}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function Evento({ evento: ev }) {
  return (
    <div className={styles.fila}>
      <div className={styles.izquierda}>
        {ev.equipo === "hacoaj" && (
          <>
            {ev.tipo === "gol" && (
              <>
                <span className={styles.jugador}>{ev.jugador}</span> <span className={styles.icono}>⚽</span>
                {ev.asistencia && (
                  <>
                    <br />
                    <span className={styles.asistencia}>Asist: {ev.asistencia}</span>
                  </>
                )}
              </>
            )}
            {ev.tipo === "cambio" && (
              <>
                <span className={styles.flechaEntra}>▲</span> <span className={styles.jugador}>{ev.entra}</span>
                <br />
                <span className={styles.flechaSale}>▼</span>{" "}
                <span className={styles.jugadorSalido}>{ev.sale}</span>
              </>
            )}
          </>
        )}
      </div>
      <div className={styles.centro}>{ev.min !== null ? `${ev.min}'` : ""}</div>
      <div className={styles.derecha}>
        {ev.equipo === "rival" && (
          <>
            {ev.tipo === "gol" && (
              <>
                <span className={styles.icono}>⚽</span> <span className={styles.jugador}>{ev.jugador}</span>
                {ev.enContra && <span className={styles.asistencia}> (en contra)</span>}
              </>
            )}
            {ev.tipo === "cambio" && (
              <>
                <span className={styles.flechaEntra}>▲</span> <span className={styles.jugador}>{ev.entra}</span>
                <br />
                <span className={styles.flechaSale}>▼</span>{" "}
                <span className={styles.jugadorSalido}>{ev.sale}</span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Tarjeta({ tipo }) {
  return <span className={cx(styles.tarjetaIcono, tipo === "roja" && styles.roja)} />;
}
