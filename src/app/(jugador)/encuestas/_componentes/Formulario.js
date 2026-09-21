import Link from "next/link";
import { Fragment } from "react";
import { cx } from "@/lib/cx";
import styles from "./Formulario.module.css";

// Piezas de formulario compartidas por las dos encuestas (post partido y
// wellness). La carpeta empieza con "_" para que Next.js no la tome como ruta.

// Tarjeta blanca que agrupa preguntas.
//   holgada  más espacio entre preguntas (lo usa wellness)
export function TarjetaFormulario({ holgada = false, children }) {
  return (
    <div className={cx(styles.tarjeta, holgada && styles.holgada)}>{children}</div>
  );
}

// Una pregunta: título, aclaración opcional y mensaje de error.
//   etiqueta      texto de la pregunta
//   obligatoria   agrega el asterisco rojo
//   opcional      agrega "(opcional)" en gris
//   notaEnLinea   agrega un texto gris en la misma línea del título
//   aclaracion    texto chico debajo del título
//   error         mensaje a mostrar en rojo (si hay)
//   compacta      versión más chica, para preguntas dentro de un recuadro
export function Pregunta({
  etiqueta,
  obligatoria,
  opcional,
  notaEnLinea,
  aclaracion,
  error,
  compacta = false,
  children,
}) {
  return (
    <div className={cx(styles.pregunta, compacta && styles.compacta)}>
      <div className={styles.etiqueta}>
        {etiqueta}
        {obligatoria && <span className={styles.obligatoria}> *</span>}
        {opcional && <span className={styles.opcional}> (opcional)</span>}
        {notaEnLinea && <span className={styles.opcional}> {notaEnLinea}</span>}
      </div>
      {aclaracion && <div className={styles.aclaracion}>{aclaracion}</div>}
      {children}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

// Opciones tipo botón para elegir una sola (radio). Se pueden elegir también
// con el teclado.
//   nombre      identificador del grupo (único en la pantalla)
//   opciones    lista de textos
//   valor       la opción elegida ahora ("" si ninguna)
//   alCambiar   función que recibe la opción elegida
export function OpcionesRadio({ nombre, opciones, valor, alCambiar }) {
  return (
    <div className={styles.opciones} role="radiogroup">
      {opciones.map((opcion, indice) => (
        <Fragment key={opcion}>
          <input
            type="radio"
            className={styles.entrada}
            id={`${nombre}-${indice}`}
            name={nombre}
            value={opcion}
            checked={valor === opcion}
            onChange={() => alCambiar(opcion)}
          />
          <label htmlFor={`${nombre}-${indice}`} className={styles.opcion}>
            {opcion}
          </label>
        </Fragment>
      ))}
    </div>
  );
}

// Escala del 1 al 10 (una fila de números para tocar).
//   nombre      identificador del grupo
//   valor       número elegido (o null)
//   alCambiar   función que recibe el número
//   extremos    [texto del 1, texto del 10]
//   textos      lista donde textos[n] describe el valor n
export function EscalaDiez({ nombre, valor, alCambiar, extremos, textos }) {
  return (
    <div className={styles.escala}>
      <div className={styles.extremos}>
        <span>{extremos[0]}</span>
        <span>{extremos[1]}</span>
      </div>
      <div className={styles.numeros} role="radiogroup">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((numero) => (
          <Fragment key={numero}>
            <input
              type="radio"
              className={styles.entrada}
              id={`${nombre}-${numero}`}
              name={nombre}
              value={numero}
              checked={valor === numero}
              onChange={() => alCambiar(numero)}
            />
            <label htmlFor={`${nombre}-${numero}`} className={styles.numero}>
              {numero}
            </label>
          </Fragment>
        ))}
      </div>
      <div className={styles.valorElegido}>
        {valor ? `${valor} — ${textos[valor] || ""}` : ""}
      </div>
    </div>
  );
}

// Campo de texto, número, fecha o texto largo con el estilo de la v1.
//   como   "input" (por defecto) o "textarea"; el resto de las props van al campo
export function Campo({ como: Etiqueta = "input", className, ...resto }) {
  return <Etiqueta className={cx(styles.campo, className)} {...resto} />;
}

// Botón grande de enviar.
//   variante  "principal" (azul, por defecto) | "verde" (más chico, para agregar)
export function BotonEnviar({ variante = "principal", ...resto }) {
  return (
    <button
      type="button"
      className={cx(styles.boton, variante === "verde" && styles.botonVerde)}
      {...resto}
    />
  );
}

// Pantalla de "¡Encuesta enviada!" que reemplaza al formulario.
//   icono, titulo, texto   contenido
//   enlace                 { href, texto } del botón para volver
export function TarjetaExito({ icono, titulo, texto, enlace }) {
  return (
    <div className={styles.exito}>
      <div className={styles.exitoIcono}>{icono}</div>
      <div className={styles.exitoTitulo}>{titulo}</div>
      <div className={styles.exitoTexto}>{texto}</div>
      <Link href={enlace.href} className={styles.exitoEnlace}>
        {enlace.texto}
      </Link>
    </div>
  );
}
