"use client";

import { useCallback, useRef, useState } from "react";

// Maneja el aviso emergente (toast) de una pantalla.
//   const { mensaje, visible, mostrar } = useAviso();
//   mostrar("Texto") -> lo muestra y lo oculta solo a los 3 segundos.
// Se usa junto con el componente <Aviso mensaje={mensaje} visible={visible} />.
export function useAviso(duracion = 3000) {
  const [mensaje, setMensaje] = useState("");
  const [visible, setVisible] = useState(false);
  const temporizador = useRef(null);

  const mostrar = useCallback(
    (texto) => {
      setMensaje(texto);
      setVisible(true);
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setVisible(false), duracion);
    },
    [duracion],
  );

  return { mensaje, visible, mostrar };
}
