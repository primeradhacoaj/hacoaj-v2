"use client";

import { useState } from "react";
import Aviso from "@/components/Aviso";
import PantallaDatos from "@/components/PantallaDatos";
import { useSesion } from "@/components/SesionProvider";
import TarjetaJugador from "@/components/TarjetaJugador";
import TituloBloque from "@/components/TituloBloque";
import { guardarWellness } from "@/lib/data/encuestas";
import { ESCALAS_WELLNESS } from "@/lib/encuestas";
import { useAviso } from "@/lib/useAviso";
import {
  BotonEnviar,
  Campo,
  EscalaDiez,
  Pregunta,
  TarjetaExito,
  TarjetaFormulario,
} from "../_componentes/Formulario";

// Encuesta de wellness (diseño y lógica de la v1): cuatro escalas del 1 al 10
// (sueño, estrés, fatiga y dolor muscular) y un comentario opcional.
export default function Wellness() {
  const { sesion } = useSesion();
  const aviso = useAviso();

  // Respuestas: null = todavía sin elegir
  const [respuestas, setRespuestas] = useState({
    sueno: null,
    estres: null,
    fatiga: null,
    dolor: null,
  });
  const [comentario, setComentario] = useState("");
  const [sinResponder, setSinResponder] = useState({}); // preguntas con error
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);

  function elegir(nombre, valor) {
    setRespuestas((actuales) => ({ ...actuales, [nombre]: valor }));
    // Al elegir un valor se quita el error de esa pregunta
    setSinResponder((actuales) => ({ ...actuales, [nombre]: false }));
  }

  async function enviar() {
    // Todas las escalas son obligatorias
    const faltantes = {};
    ESCALAS_WELLNESS.forEach(({ nombre }) => {
      if (!respuestas[nombre]) faltantes[nombre] = true;
    });
    setSinResponder(faltantes);

    if (Object.keys(faltantes).length > 0) {
      aviso.mostrar("Completá todos los campos", "error");
      return;
    }

    setEnviando(true);
    try {
      const resultado = await guardarWellness({
        ...respuestas,
        comentario: comentario.trim(),
      });
      if (resultado.status !== "success") {
        throw new Error(resultado.message || "Error al guardar");
      }
      setEnviada(true);
      aviso.mostrar("Encuesta guardada", "exito");
    } catch (error) {
      aviso.mostrar(error.message, "error");
      setEnviando(false);
    }
  }

  return (
    <PantallaDatos volverHref="/encuestas" ancho="angosto">
      <TarjetaJugador nombre={sesion.nombre} foto={sesion.foto} subtitulo="Encuesta Wellness" />

      {enviada ? (
        <TarjetaExito
          icono="✅"
          titulo="¡Encuesta enviada!"
          texto="Gracias por completar tu wellness de hoy."
          enlace={{ href: "/encuestas", texto: "Volver a encuestas" }}
        />
      ) : (
        <>
          <TituloBloque color="#c9a83e">¿Cómo te sentís hoy?</TituloBloque>

          <TarjetaFormulario holgada>
            {ESCALAS_WELLNESS.map((escala) => (
              <Pregunta
                key={escala.nombre}
                etiqueta={escala.pregunta}
                obligatoria
                error={sinResponder[escala.nombre] ? "Seleccioná un valor" : ""}
              >
                <EscalaDiez
                  nombre={escala.nombre}
                  valor={respuestas[escala.nombre]}
                  alCambiar={(valor) => elegir(escala.nombre, valor)}
                  extremos={escala.extremos}
                  textos={escala.textos}
                />
              </Pregunta>
            ))}
          </TarjetaFormulario>

          <TituloBloque color="#c9a83e">Comentario (opcional)</TituloBloque>

          <TarjetaFormulario holgada>
            <Pregunta etiqueta="En caso de haber tenido un golpe o molestia en competencia, ¿cómo evolucionó?">
              <Campo
                como="textarea"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Escribí acá si tenés algo para comentar..."
                maxLength={500}
              />
            </Pregunta>
          </TarjetaFormulario>

          <BotonEnviar onClick={enviar} disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar encuesta"}
          </BotonEnviar>
        </>
      )}

      <Aviso mensaje={aviso.mensaje} tipo={aviso.tipo} visible={aviso.visible} />
    </PantallaDatos>
  );
}
