"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/components/SesionProvider";
import { rutaInicio } from "@/lib/sesion";
import styles from "./Guardia.module.css";

// Protege un grupo de pantallas: solo deja ver el contenido a los roles
// indicados. Si no hay sesión manda al login; si el rol no corresponde,
// manda a la pantalla de inicio de su propio rol.
//
// Props:
//   roles  lista de roles permitidos, ej. ["tecnico", "administrador"]
export default function Guardia({ roles, children }) {
  const { sesion, cargando } = useSesion();
  const router = useRouter();
  const permitido = Boolean(sesion) && roles.includes(sesion.rol);

  useEffect(() => {
    if (cargando) return;
    if (!sesion) router.replace("/login");
    else if (!permitido) router.replace(rutaInicio(sesion.rol));
  }, [cargando, sesion, permitido, router]);

  if (cargando || !permitido) {
    return (
      <p className={styles.mensaje} role="status">
        Cargando…
      </p>
    );
  }

  return children;
}
