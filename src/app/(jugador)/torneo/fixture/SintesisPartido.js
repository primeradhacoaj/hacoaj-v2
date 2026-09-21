import styles from "./SintesisPartido.module.css";

const ORDEN_POSICIONES = ["arquero", "defensor", "mediocampista", "delantero"];
const ETIQUETAS = { arquero: "ARQ", defensor: "DEF", mediocampista: "MED", delantero: "DEL" };
const ORDEN_SORT = { arquero: 0, defensor: 1, mediocampista: 2, delantero: 3, suplente: 4 };

function ordenar(jugadores) {
  return [...jugadores].sort((a, b) => {
    const pa = ORDEN_SORT[a.posicion_partido] ?? 3;
    const pb = ORDEN_SORT[b.posicion_partido] ?? 3;
    if (pa !== pb) return pa - pb;
    return (a.numero_camiseta || 99) - (b.numero_camiseta || 99);
  });
}

// Formación de un equipo: una línea por puesto con los titulares, y los suplentes.
function Equipo({ nombre, jugadores }) {
  const titulares = ordenar(jugadores.filter((j) => j.titular));
  const suplentes = ordenar(jugadores.filter((j) => !j.titular));

  const lineas = Object.fromEntries(ORDEN_POSICIONES.map((pos) => [pos, []]));
  for (const jugador of titulares) {
    const pos = (jugador.posicion_partido || "").toLowerCase();
    lineas[lineas[pos] ? pos : "mediocampista"].push(jugador);
  }
  // Ej. "4-4-2": defensores, mediocampistas y delanteros.
  const esquema = ["defensor", "mediocampista", "delantero"]
    .map((pos) => lineas[pos].length)
    .join("-");

  return (
    <div className={styles.equipo}>
      <div className={styles.nombreEquipo}>
        {nombre} <span className={styles.esquema}>{esquema}</span>
      </div>
      {ORDEN_POSICIONES.filter((pos) => lineas[pos].length > 0).map((pos) => (
        <div key={pos} className={styles.linea}>
          {lineas[pos].map((j, indice) => (
            <span key={j.numero_camiseta ?? j.apellido}>
              <span className={styles.numero}>{j.numero_camiseta || "-"}</span>
              {j.apellido}
              {indice < lineas[pos].length - 1 && " · "}
            </span>
          ))}{" "}
          <span className={styles.puesto}>{ETIQUETAS[pos]}</span>
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

// Goles, cambios y tarjetas juntos, en orden de minuto.
function eventosDe(datos) {
  return [
    ...(datos.goles ?? []).map((g) => ({
      minuto: g.minuto,
      icono: "⚽",
      nombre: g.jugador_nombre,
      detalle: g.equipo_abrev,
    })),
    ...(datos.cambios ?? []).map((c) => ({
      minuto: c.minuto,
      icono: "🔄",
      nombre: c.jugador_entra,
      detalle: `← ${c.jugador_sale} ${c.equipo_abrev || ""}`,
    })),
    ...(datos.tarjetas ?? []).map((t) => ({
      minuto: t.minuto,
      icono: t.tipo === "Roja" ? "🟥" : "🟨",
      nombre: t.jugador_nombre,
      detalle: t.equipo_abrev || "",
    })),
  ].sort((a, b) => (a.minuto || 0) - (b.minuto || 0));
}

// Síntesis de un partido jugado (formaciones y eventos), copiada de la v1.
//
// Props:
//   estado  "cargando" | "listo" | "vacio" | "error"
//   datos   lo que devuelve `obtenerSintesis` (solo cuando estado es "listo")
export default function SintesisPartido({ estado, datos }) {
  if (estado === "cargando") {
    return <div className={styles.cargando}>Cargando síntesis...</div>;
  }
  if (estado === "error") {
    return <div className={styles.sinDatos}>Error al cargar</div>;
  }
  if (estado !== "listo") {
    return <div className={styles.sinDatos}>Sin síntesis disponible</div>;
  }

  const eventos = eventosDe(datos);
  const hayFormacion = datos.formacion_local?.length > 0 || datos.formacion_visitante?.length > 0;
  if (!hayFormacion && eventos.length === 0) {
    return <div className={styles.sinDatos}>Sin síntesis disponible</div>;
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
