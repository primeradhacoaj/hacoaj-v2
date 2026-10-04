"use client";

import { useEffect, useState } from "react";
import Icono from "@/components/Icono";
import { borrarFoto, contarDatosDeJugador, eliminarJugador } from "@/lib/data/gestionJugadores";
import { createClient } from "@/lib/supabase/client";
import ficha from "./FichaJugador.module.css";
import styles from "./Gestion.module.css";

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Confirmación para eliminar un jugador (solo administrador). A diferencia de la v1 (que solo
// sacaba la fila de la hoja de Usuarios y dejaba los datos sueltos), acá se elimina a la persona Y
// todo lo que tiene asociado; por eso se muestra qué se va a perder. Si jugó partidos de Hacoaj no
// se puede eliminar: hay que pasarlo a Inactivo.
//
// Props: jugador, alCerrar(), alEliminado(nombre)
export default function EliminarJugador({ jugador: j, alCerrar, alEliminado }) {
  const [datos, setDatos] = useState(null); // null = cargando
  const [error, setError] = useState("");
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    let vigente = true;
    contarDatosDeJugador(createClient(), j.jugador_id)
      .then((contados) => vigente && setDatos(contados))
      .catch(() => vigente && setDatos("error"));
    const alTeclear = (e) => e.key === "Escape" && alCerrar();
    document.addEventListener("keydown", alTeclear);
    return () => {
      vigente = false;
      document.removeEventListener("keydown", alTeclear);
    };
  }, [j.jugador_id, alCerrar]);

  async function eliminar() {
    setEliminando(true);
    const supabase = createClient();
    const resultado = await eliminarJugador(supabase, j.jugador_id);
    if (!resultado.ok) {
      setEliminando(false);
      return setError(resultado.error);
    }
    await borrarFoto(supabase, j.fotoPath);
    alEliminado(j.nombre);
  }

  const bloqueado = datos && datos !== "error" && datos.partidos > 0;
  const lineas =
    datos && datos !== "error"
      ? [
          datos.fuerza && plural(datos.fuerza, "test de fuerza", "tests de fuerza"),
          datos.pliegues && plural(datos.pliegues, "medición de pliegues", "mediciones de pliegues"),
          datos.pesos && plural(datos.pesos, "pesaje", "pesajes"),
          datos.wellness && plural(datos.wellness, "encuesta wellness", "encuestas wellness"),
          datos.postPartido && plural(datos.postPartido, "encuesta post partido", "encuestas post partido"),
          j.tieneAcceso && "su acceso a la app",
        ].filter(Boolean)
      : [];

  return (
    <div className={ficha.fondo} style={{ zIndex: 300 }} onClick={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className={`${ficha.modal} ${styles.ventanaChica}`} role="dialog" aria-modal="true" aria-labelledby="eliminar-titulo">
        <div className={`${ficha.cabecera} ${styles.cabeceraPeligro}`}>
          <button type="button" className={ficha.cerrar} onClick={alCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" tamano={16} strokeWidth={2} />
          </button>
          <div className={styles.iconoCabecera}>
            <Icono nombre="papelera" tamano={28} strokeWidth={1.7} />
          </div>
          <div className={styles.textoCabecera}>
            <h2 id="eliminar-titulo">Eliminar jugador</h2>
            <div className={styles.metaCabecera}>Esta acción no se puede deshacer</div>
          </div>
        </div>
        <div className={styles.cuerpoEliminar}>
          <p>¿Estás seguro que querés eliminar a</p>
          <div className={styles.nombreEliminar}>{j.nombre}</div>

          {datos === null && <p>Revisando qué datos tiene cargados…</p>}
          {datos === "error" && <div className={styles.advertencia}>No se pudo revisar qué datos tiene. Probá de nuevo.</div>}

          {bloqueado && (
            <div className={styles.advertencia} role="alert">
              No se puede eliminar: figura en {plural(datos.partidos, "partido", "partidos")} de Hacoaj. Si ya no está en el plantel,
              pasalo a <strong>Inactivo</strong> desde la pestaña Editar.
            </div>
          )}

          {datos && datos !== "error" && !bloqueado && (
            <>
              {lineas.length > 0 ? (
                <>
                  <p>Se va a eliminar también:</p>
                  <ul className={styles.lista}>
                    {lineas.map((linea) => (
                      <li key={linea}>• {linea}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>No tiene datos cargados.</p>
              )}
              <div className={styles.advertencia}>
                Si solo querés que deje de aparecer como activo, es mejor pasarlo a <strong>Inactivo</strong>: así no se pierde nada.
              </div>
            </>
          )}

          {error && (
            <div className={styles.advertencia} role="alert">
              {error}
            </div>
          )}

          <div className={styles.botonesCentro}>
            {!bloqueado && datos && datos !== "error" && (
              <button type="button" className={`${styles.boton} ${styles.botonPeligro}`} onClick={eliminar} disabled={eliminando}>
                {eliminando ? "Eliminando..." : "Sí, eliminar"}
              </button>
            )}
            <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={alCerrar}>
              {bloqueado ? "Cerrar" : "Cancelar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
