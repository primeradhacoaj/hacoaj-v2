"use client";

import { useState } from "react";
import Aviso from "@/components/Aviso";
import PantallaDatos from "@/components/PantallaDatos";
import { useSesion } from "@/components/SesionProvider";
import TarjetaJugador from "@/components/TarjetaJugador";
import TituloBloque from "@/components/TituloBloque";
import { guardarPostPartido } from "@/lib/data/encuestas";
import {
  CATEGORIAS,
  LADOS,
  OPCIONES_EMOCIONAL,
  OPCIONES_FISICA,
  OPCIONES_LLEGADA,
  TIPOS_GOLPE,
  ZONAS_CON_LADO,
  fechaParaGuardar,
  validarGolpe,
} from "@/lib/encuestas";
import { useAviso } from "@/lib/useAviso";
import {
  BotonEnviar,
  Campo,
  OpcionesRadio,
  Pregunta,
  TarjetaExito,
  TarjetaFormulario,
} from "../_componentes/Formulario";
import SelectorZona from "./SelectorZona";
import styles from "./PostPartido.module.css";

// Un golpe o molestia en preparación (todavía no agregado a la lista)
const GOLPE_VACIO = {
  tipo: "",
  tipoOtro: "",
  zona: "", // zona elegida de la lista
  zonaTexto: "", // lo que hay escrito en el buscador
  zonaOtro: "",
  lado: "",
  comentario: "",
};

// Encuesta post partido (diseño y lógica de la v1): datos del partido, golpes
// o molestias (se pueden cargar varios) y un comentario opcional.
export default function PostPartido() {
  const { sesion } = useSesion();
  const aviso = useAviso();

  // Datos del partido
  const [fecha, setFecha] = useState("");
  const [llegada, setLlegada] = useState("");
  const [emocional, setEmocional] = useState("");
  const [fisica, setFisica] = useState("");
  const [categoria, setCategoria] = useState("");
  const [categoriaOtro, setCategoriaOtro] = useState("");
  const [minutos, setMinutos] = useState("");

  // Golpes y molestias
  const [huboGolpe, setHuboGolpe] = useState(""); // "Sí" | "No" | ""
  const [golpes, setGolpes] = useState([]); // ya agregados
  const [golpe, setGolpe] = useState(GOLPE_VACIO); // el que se está cargando

  const [comentario, setComentario] = useState("");
  const [errores, setErrores] = useState({}); // por ejemplo { fecha: true }
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);

  // Cambia un dato y quita el error de ese campo
  function limpiarError(clave) {
    setErrores((actuales) => ({ ...actuales, [clave]: false }));
  }

  function elegirHuboGolpe(valor) {
    setHuboGolpe(valor);
    limpiarError("golpe");
    if (valor === "No") {
      // Sin golpes: se descarta todo lo cargado
      setGolpes([]);
      setGolpe(GOLPE_VACIO);
    }
  }

  // Al cambiar el tipo se vuelve a empezar con la zona y el lado
  function elegirTipo(tipo) {
    setGolpe({ ...GOLPE_VACIO, tipo, comentario: golpe.comentario });
    limpiarError("tipo");
    limpiarError("zona");
    limpiarError("lado");
  }

  function escribirZona(texto) {
    // Si se vuelve a escribir, la zona elegida antes ya no vale
    setGolpe({ ...golpe, zonaTexto: texto, zona: "", zonaOtro: "", lado: "" });
    limpiarError("zona");
  }

  function elegirZona(zona) {
    setGolpe({ ...golpe, zona, zonaTexto: zona, zonaOtro: "", lado: "" });
    limpiarError("zona");
  }

  function agregarGolpe() {
    const resultado = validarGolpe(golpe);
    setErrores((actuales) => ({
      ...actuales,
      tipo: resultado.error === "tipo",
      zona: resultado.error === "zona",
      lado: resultado.error === "lado",
    }));
    if (resultado.error) return;

    const total = golpes.length + 1;
    setGolpes([...golpes, resultado.golpe]);
    setGolpe(GOLPE_VACIO);
    aviso.mostrar(`Golpe agregado (${total})`, "exito");
  }

  function quitarGolpe(indice) {
    setGolpes(golpes.filter((_, i) => i !== indice));
  }

  async function enviar() {
    const faltantes = {};

    if (!fecha) faltantes.fecha = true;
    if (!llegada) faltantes.llegada = true;
    if (!emocional) faltantes.emocional = true;
    if (!fisica) faltantes.fisica = true;

    let categoriaFinal = categoria;
    if (!categoria) {
      faltantes.categoria = true;
    } else if (categoria === "Otro") {
      categoriaFinal = categoriaOtro.trim();
      if (!categoriaFinal) faltantes.categoria = true;
    }

    if (minutos === "" || parseInt(minutos, 10) < 0) faltantes.minutos = true;
    if (!huboGolpe) faltantes.golpe = true;

    // Dijo "Sí" pero no agregó ningún golpe: si el que está cargando está
    // completo se agrega solo; si no, se marca lo que falta
    let golpesFinales = golpes;
    if (huboGolpe === "Sí" && golpes.length === 0) {
      const resultado = validarGolpe(golpe);
      if (resultado.error) {
        faltantes[resultado.error] = true;
      } else {
        golpesFinales = [resultado.golpe];
        setGolpes(golpesFinales);
        setGolpe(GOLPE_VACIO);
      }
    }

    setErrores(faltantes);
    if (Object.keys(faltantes).length > 0) {
      aviso.mostrar("Completá todos los campos obligatorios", "error");
      return;
    }

    setEnviando(true);
    try {
      const resultado = await guardarPostPartido({
        fecha_partido: fechaParaGuardar(fecha),
        llegada,
        emocional,
        fisica,
        categoria: categoriaFinal,
        minutos: parseInt(minutos, 10),
        golpes: huboGolpe === "Sí" ? golpesFinales : [],
        comentario: comentario.trim(),
      });
      if (resultado.status !== "success") {
        throw new Error(resultado.message);
      }
      setEnviada(true);
    } catch (error) {
      aviso.mostrar(`Error: ${error.message}`, "error");
      setEnviando(false);
    }
  }

  const necesitaLado = ZONAS_CON_LADO.includes(golpe.zona);

  return (
    <PantallaDatos volverHref="/encuestas" ancho="angosto">
      <TarjetaJugador nombre={sesion.nombre} subtitulo="Encuesta post partido" />

      {enviada ? (
        <TarjetaExito
          icono="✓"
          titulo="¡Encuesta enviada!"
          texto="Tu respuesta se guardó correctamente."
          enlace={{ href: "/menu", texto: "Volver al menú" }}
        />
      ) : (
        <>
          <TituloBloque color="#c9a83e">Datos del partido</TituloBloque>

          <TarjetaFormulario>
            <Pregunta
              etiqueta="📅 Fecha del partido"
              obligatoria
              error={errores.fecha ? "Seleccioná la fecha del partido" : ""}
            >
              <Campo
                type="date"
                value={fecha}
                onChange={(e) => {
                  setFecha(e.target.value);
                  limpiarError("fecha");
                }}
              />
            </Pregunta>

            <Pregunta
              etiqueta="¿Cómo llegaste al partido?"
              obligatoria
              aclaracion="(Fatiga, sueño, alimentación, etc.)"
              error={errores.llegada ? "Seleccioná una opción" : ""}
            >
              <OpcionesRadio
                nombre="llegada"
                opciones={OPCIONES_LLEGADA}
                valor={llegada}
                alCambiar={(valor) => {
                  setLlegada(valor);
                  limpiarError("llegada");
                }}
              />
            </Pregunta>

            <Pregunta
              etiqueta="¿Qué carga emocional te representó el partido?"
              obligatoria
              error={errores.emocional ? "Seleccioná una opción" : ""}
            >
              <OpcionesRadio
                nombre="emocional"
                opciones={OPCIONES_EMOCIONAL}
                valor={emocional}
                alCambiar={(valor) => {
                  setEmocional(valor);
                  limpiarError("emocional");
                }}
              />
            </Pregunta>

            <Pregunta
              etiqueta="¿Qué carga física te representó el partido?"
              obligatoria
              error={errores.fisica ? "Seleccioná una opción" : ""}
            >
              <OpcionesRadio
                nombre="fisica"
                opciones={OPCIONES_FISICA}
                valor={fisica}
                alCambiar={(valor) => {
                  setFisica(valor);
                  limpiarError("fisica");
                }}
              />
            </Pregunta>

            <Pregunta
              etiqueta="¿En qué categoría jugaste?"
              obligatoria
              error={errores.categoria ? "Seleccioná una categoría" : ""}
            >
              <OpcionesRadio
                nombre="categoria"
                opciones={CATEGORIAS}
                valor={categoria}
                alCambiar={(valor) => {
                  setCategoria(valor);
                  if (valor !== "Otro") setCategoriaOtro("");
                  limpiarError("categoria");
                }}
              />
              {categoria === "Otro" && (
                <div className={styles.separado}>
                  <Campo
                    type="text"
                    value={categoriaOtro}
                    onChange={(e) => {
                      setCategoriaOtro(e.target.value);
                      limpiarError("categoria");
                    }}
                    placeholder="¿Cuál?"
                  />
                </div>
              )}
            </Pregunta>

            <Pregunta
              etiqueta="¿Cuántos minutos jugaste?"
              obligatoria
              error={errores.minutos ? "Ingresá los minutos jugados" : ""}
            >
              <Campo
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={minutos}
                onChange={(e) => {
                  setMinutos(e.target.value);
                  limpiarError("minutos");
                }}
                placeholder="Ej: 70"
              />
            </Pregunta>
          </TarjetaFormulario>

          <TituloBloque color="#60a5fa">Golpes y molestias</TituloBloque>

          <TarjetaFormulario>
            <Pregunta
              etiqueta="¿Sentiste algún golpe o molestia durante el partido?"
              obligatoria
              error={errores.golpe ? "Seleccioná una opción" : ""}
            >
              <OpcionesRadio
                nombre="golpe"
                opciones={["Sí", "No"]}
                valor={huboGolpe}
                alCambiar={elegirHuboGolpe}
              />

              {huboGolpe === "Sí" && (
                <div className={styles.condicional}>
                  {/* Golpes ya agregados */}
                  {golpes.length > 0 && (
                    <div className={styles.lista}>
                      {golpes.map((agregado, indice) => (
                        <div key={indice} className={styles.golpe}>
                          <div className={styles.golpeInfo}>
                            <span className={styles.golpeNumero}>{indice + 1}</span>
                            <strong>
                              {agregado.tipo_golpe}
                              {agregado.ubicacion_golpe && ` — ${agregado.ubicacion_golpe}`}
                              {agregado.lado_golpe && ` (${agregado.lado_golpe})`}
                            </strong>
                            {agregado.comentario_lesion && (
                              <div className={styles.golpeDetalle}>
                                {agregado.comentario_lesion}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className={styles.golpeQuitar}
                            onClick={() => quitarGolpe(indice)}
                            aria-label={`Eliminar el golpe ${indice + 1}`}
                            title="Eliminar"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulario para cargar un golpe */}
                  <div className={styles.formularioGolpe}>
                    <Pregunta
                      compacta
                      etiqueta={
                        golpes.length === 0
                          ? "¿Qué tipo de golpe o molestia sentiste?"
                          : "¿Otro golpe o molestia?"
                      }
                      obligatoria={golpes.length === 0}
                      notaEnLinea={golpes.length > 0 ? "(si no, enviá la encuesta)" : ""}
                      error={errores.tipo ? "Seleccioná un tipo" : ""}
                    >
                      <OpcionesRadio
                        nombre="tipo_golpe"
                        opciones={TIPOS_GOLPE}
                        valor={golpe.tipo}
                        alCambiar={elegirTipo}
                      />
                    </Pregunta>

                    {golpe.tipo === "Otro" && (
                      <Campo
                        type="text"
                        value={golpe.tipoOtro}
                        onChange={(e) => setGolpe({ ...golpe, tipoOtro: e.target.value })}
                        placeholder="Describí qué sentiste..."
                      />
                    )}

                    {golpe.tipo && golpe.tipo !== "Otro" && (
                      <Pregunta
                        compacta
                        etiqueta="¿En qué zona?"
                        obligatoria
                        error={errores.zona ? "Seleccioná la zona" : ""}
                      >
                        <SelectorZona
                          texto={golpe.zonaTexto}
                          alEscribir={escribirZona}
                          alElegir={elegirZona}
                        />
                        {golpe.zona === "Otro" && (
                          <div className={styles.separado}>
                            <Campo
                              type="text"
                              value={golpe.zonaOtro}
                              onChange={(e) => setGolpe({ ...golpe, zonaOtro: e.target.value })}
                              placeholder="Especificá la zona..."
                            />
                          </div>
                        )}
                      </Pregunta>
                    )}

                    {necesitaLado && (
                      <Pregunta
                        compacta
                        etiqueta="¿De qué lado?"
                        error={errores.lado ? "Seleccioná un lado" : ""}
                      >
                        <OpcionesRadio
                          nombre="lado"
                          opciones={LADOS}
                          valor={golpe.lado}
                          alCambiar={(valor) => {
                            setGolpe({ ...golpe, lado: valor });
                            limpiarError("lado");
                          }}
                        />
                      </Pregunta>
                    )}

                    <Pregunta
                      compacta
                      etiqueta="💬 Comentario sobre el golpe/lesión"
                      opcional
                    >
                      <Campo
                        como="textarea"
                        rows={2}
                        value={golpe.comentario}
                        onChange={(e) => setGolpe({ ...golpe, comentario: e.target.value })}
                        placeholder="Detallá si querés..."
                        className={styles.comentarioChico}
                      />
                    </Pregunta>

                    <BotonEnviar variante="verde" onClick={agregarGolpe}>
                      ＋ Agregar otro golpe / molestia
                    </BotonEnviar>
                  </div>
                </div>
              )}
            </Pregunta>
          </TarjetaFormulario>

          <TituloBloque color="#00296b">Comentarios</TituloBloque>

          <TarjetaFormulario>
            <Pregunta etiqueta="💬 Comentarios para el Chano" opcional>
              <Campo
                como="textarea"
                rows={3}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Si querés agregar algo, escribilo acá..."
              />
            </Pregunta>
          </TarjetaFormulario>

          <BotonEnviar onClick={enviar} disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar encuesta"}
          </BotonEnviar>
        </>
      )}

      <Aviso mensaje={aviso.mensaje} tipo={aviso.tipo} visible={aviso.visible} />
    </PantallaDatos>
  );
}
