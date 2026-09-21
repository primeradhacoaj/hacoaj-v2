"use client";

import { useState } from "react";
import { Campo } from "../_componentes/Formulario";
import { filtrarZonas } from "@/lib/encuestas";
import styles from "./SelectorZona.module.css";

// Buscador de zona del cuerpo: se escribe y aparece una lista filtrada (sin
// importar acentos ni mayúsculas). Copiado de la v1.
//
// Props:
//   texto       lo que hay escrito en el buscador
//   alEscribir  función que recibe el texto cada vez que cambia
//   alElegir    función que recibe la zona elegida de la lista
export default function SelectorZona({ texto, alEscribir, alElegir }) {
  const [abierto, setAbierto] = useState(false);
  const opciones = filtrarZonas(texto);
  const mostrarLista = abierto && opciones.length > 0;

  return (
    <div className={styles.contenedor}>
      <Campo
        type="text"
        value={texto}
        onChange={(e) => {
          alEscribir(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        placeholder="Escribí para buscar (ej: cuá, gem, rod...)"
        autoComplete="off"
        role="combobox"
        aria-expanded={mostrarLista}
        aria-controls="lista-zonas"
        aria-autocomplete="list"
      />
      {mostrarLista && (
        <div id="lista-zonas" className={styles.lista} role="listbox">
          {opciones.map((zona) => (
            <div
              key={zona}
              role="option"
              aria-selected={zona === texto}
              className={styles.opcion}
              // mousedown (y no click) para elegir antes de que el buscador pierda el foco
              onMouseDown={(e) => {
                e.preventDefault();
                alElegir(zona);
                setAbierto(false);
              }}
            >
              {zona}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
