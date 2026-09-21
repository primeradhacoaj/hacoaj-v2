import { cx } from "@/lib/cx";
import styles from "./TextField.module.css";

// Campo de texto con su etiqueta y su mensaje de error. Es "controlado": el
// valor lo maneja quien lo usa (con useState) y se lo pasa por `value`.
//
// Props:
//   id, label      identificador y texto de la etiqueta (obligatorios: accesibilidad)
//   type           "text" (por defecto), "password", etc.
//   value          valor actual
//   onChange       función que se llama en cada tecla; recibe el evento
//   error          mensaje de error (si hay, el campo se marca en rojo)
//   accion         elemento opcional a la derecha del campo (ej. "ver contraseña")
//   ...resto       autoComplete, placeholder, disabled, etc. van directo al <input>
export default function TextField({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  accion,
  ...resto
}) {
  const idError = `${id}-error`;

  return (
    <div className={styles.campo}>
      <label htmlFor={id} className={styles.etiqueta}>
        {label}
      </label>
      <div className={cx(styles.contenedor, error && styles.conError)}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          className={styles.entrada}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : undefined}
          {...resto}
        />
        {accion}
      </div>
      {error && (
        <p id={idError} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
