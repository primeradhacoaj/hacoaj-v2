import { iniciales } from "@/lib/sesion";
import styles from "./TarjetaJugador.module.css";

// Tarjeta azul del jugador que abre las pantallas de datos (fuerza, pliegues,
// historiales…): iniciales, nombre, sección y etiquetas. Copiada de la v1.
//
// Props:
//   nombre, subtitulo   (ej. "Juan Pérez" / "Mi fuerza")
//   foto                URL de la foto (opcional): se ve sobre las iniciales
//   posicion            si existe, muestra 📍 posición
//   piernaHabil         si existe, muestra 🦶 pierna
//   peso                si se pasa (aunque sea null), muestra ⚖ peso; null se ve "--"
export default function TarjetaJugador({
  nombre,
  foto,
  subtitulo,
  posicion,
  piernaHabil,
  peso,
}) {
  const hayEtiquetas = Boolean(posicion || piernaHabil || peso !== undefined);

  return (
    <div className={styles.tarjeta}>
      <div className={styles.interior}>
        <div className={styles.avatar}>
          {iniciales(nombre)}
          {foto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto} alt="" className={styles.foto} />
          )}
        </div>
        <div className={styles.info}>
          <div className={styles.nombre}>{nombre}</div>
          <div className={styles.subtitulo}>{subtitulo}</div>
          {hayEtiquetas && (
            <div className={styles.etiquetas}>
              {posicion && <span className={styles.etiqueta}>📍 {posicion}</span>}
              {piernaHabil && <span className={styles.etiqueta}>🦶 {piernaHabil}</span>}
              {peso !== undefined && (
                <span className={styles.etiqueta}>⚖ {peso ? peso : "--"} kg</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
