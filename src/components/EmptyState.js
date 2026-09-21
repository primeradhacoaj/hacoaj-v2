import styles from "./EmptyState.module.css";

// Mensaje claro para cuando todavía no hay datos. Evita pantallas rotas o
// vacías y nunca muestra errores técnicos.
//
// Props:
//   icono    emoji que acompaña el mensaje (📋 por defecto)
//   mensaje  texto para el usuario
export default function EmptyState({ icono = "📋", mensaje }) {
  return (
    <div className={styles.vacio}>
      <span className={styles.icono} aria-hidden="true">
        {icono}
      </span>
      <p>{mensaje}</p>
    </div>
  );
}
