import Guardia from "@/components/Guardia";

// Todas las pantallas dentro de (jugador) pasan por este layout: solo entra
// quien inició sesión como jugador. Los paréntesis en el nombre de la carpeta
// no forman parte de la dirección web: /menu, no /(jugador)/menu.
export default function JugadorLayout({ children }) {
  return <Guardia roles={["jugador"]}>{children}</Guardia>;
}
