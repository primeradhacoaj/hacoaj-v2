"use client";

import FormularioContrasena from "@/components/FormularioContrasena";
import PantallaDatos from "@/components/PantallaDatos";
import { useSesion } from "@/components/SesionProvider";
import TarjetaJugador from "@/components/TarjetaJugador";
import TituloBloque from "@/components/TituloBloque";
import styles from "./CambiarContrasena.module.css";

// Ajustes → Cambiar contraseña. Pantalla nueva de la v2 (la v1 no la tenía: las
// contraseñas eran texto plano en la planilla y las veía el administrador).
export default function CambiarContrasena() {
  const { sesion } = useSesion();

  return (
    <PantallaDatos volverHref="/menu" ancho="angosto">
      <TarjetaJugador nombre={sesion.nombre} foto={sesion.foto} subtitulo="Cambiar contraseña" />
      <TituloBloque color="#c9a83e">Tu contraseña</TituloBloque>
      <div className={styles.tarjeta}>
        <FormularioContrasena />
      </div>
    </PantallaDatos>
  );
}
