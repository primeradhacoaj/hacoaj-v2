"use client";

import { useCallback, useRef, useState } from "react";

// Maneja el aviso emergente (toast) de una pantalla.
//   const { mensaje, tipo, visible, mostrar } = useAviso();
//   mostrar("Texto")            -> aviso oscuro común
//   mostrar("Texto", "exito")   -> aviso verde
//   mostrar("Texto", "error")   -> aviso rojo
// Se oculta solo a los 3 segundos (o los que se indiquen).
// Se usa junto con el componente <Aviso mensaje={mensaje} tipo={tipo} visible={visible} />.
export function useAviso(duracion = 3000) {
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("info");
  const [visible, setVisible] = useState(false);
  const temporizador = useRef(null);

  const mostrar = useCallback(
    (texto, tipoAviso = "info") => {
      setMensaje(texto);
      setTipo(tipoAviso);
      setVisible(true);
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setVisible(false), duracion);
    },
    [duracion],
  );

  return { mensaje, tipo, visible, mostrar };
}
