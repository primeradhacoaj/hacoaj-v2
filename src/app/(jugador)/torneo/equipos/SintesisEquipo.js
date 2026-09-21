import styles from "./SintesisEquipo.module.css";

const minutoDe = (m) => (m != null ? `${m}'` : "");

// Lo que pasó en un partido, en tres listas (goles, cambios y tarjetas), copiado
// de la v1. `datos` es lo que devuelve `obtenerSintesisPartido`: undefined
// mientras carga, "error" si falló, o null si no hay síntesis.
export default function SintesisEquipo({ datos }) {
  if (datos === undefined) return <div className={styles.aviso}>Cargando síntesis...</div>;
  if (datos === "error") return <div className={styles.aviso}>Error cargando síntesis</div>;
  if (datos === null) return <div className={styles.aviso}>No hay datos de síntesis</div>;

  const { partido: p, goles, cambios, tarjetas } = datos;
  const hayEventos = goles.length + cambios.length + tarjetas.length > 0;

  return (
    <>
      <div className={styles.encabezado}>
        {p.equipo_local} {p.goles_local} - {p.goles_visitante} {p.equipo_visitante}
        {p.arbitro && (
          <>
            <br />
            Árbitro: {p.arbitro}
          </>
        )}
      </div>

      {goles.length > 0 && (
        <Bloque titulo="Goles">
          {goles.map((g, i) => (
            <Fila key={i} minuto={g.minuto}>
              ⚽ {g.jugador_nombre} ({g.equipo_abrev})
              {g.en_contra ? <em> (en contra)</em> : null}
            </Fila>
          ))}
        </Bloque>
      )}

      {cambios.length > 0 && (
        <Bloque titulo="Cambios">
          {cambios.map((c, i) => (
            <Fila key={i} minuto={c.minuto}>
              🔄 {c.jugador_entra} x {c.jugador_sale} ({c.equipo_abrev})
            </Fila>
          ))}
        </Bloque>
      )}

      {tarjetas.length > 0 && (
        <Bloque titulo="Tarjetas">
          {tarjetas.map((t, i) => (
            <Fila key={i} minuto={t.minuto}>
              {t.tipo?.toLowerCase() === "roja" ? "🟥" : "🟨"} {t.jugador_nombre} ({t.equipo_abrev})
            </Fila>
          ))}
        </Bloque>
      )}

      {!hayEventos && <div className={styles.aviso}>No hay datos de síntesis</div>}

      {p.url && (
        <div className={styles.enlace}>
          <a href={p.url} target="_blank" rel="noopener noreferrer">
            Ver en SoloAscenso
          </a>
        </div>
      )}
    </>
  );
}

function Bloque({ titulo, children }) {
  return (
    <div className={styles.bloque}>
      <h5>{titulo}</h5>
      {children}
    </div>
  );
}

function Fila({ minuto, children }) {
  return (
    <div className={styles.fila}>
      <span className={styles.minuto}>{minutoDe(minuto)}</span>
      <span>{children}</span>
    </div>
  );
}
