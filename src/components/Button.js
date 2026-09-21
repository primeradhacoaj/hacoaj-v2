import Link from "next/link";
import { cx } from "@/lib/cx";
import styles from "./Button.module.css";

// Botón principal de la app. Si recibe `href` se comporta como un link
// (navega a otra pantalla); si no, es un botón común (por ejemplo, para enviar
// un formulario).
//
// Props:
//   variante  "principal" (azul, por defecto) | "secundario" (blanco con borde)
//   bloque    ocupa todo el ancho disponible
//   href      si está, navega a esa ruta
//   type      "button" (por defecto) | "submit" | "reset" — solo si no hay href
//   disabled  deshabilita el botón — solo si no hay href
//   onClick   función a ejecutar al hacer clic — solo si no hay href, y solo
//             cuando el botón se usa dentro de un componente de cliente
export default function Button({
  variante = "principal",
  bloque = false,
  href,
  type = "button",
  disabled = false,
  onClick,
  children,
}) {
  const clases = cx(styles.boton, styles[variante], bloque && styles.bloque);

  if (href) {
    return (
      <Link href={href} className={clases}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={clases}>
      {children}
    </button>
  );
}
