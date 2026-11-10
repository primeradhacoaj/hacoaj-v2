import Image from "next/image";
import styles from "./page.module.css";

export const metadata = {
  title: "Resultado del pago",
};

// Pantalla a la que Mercado Pago devuelve a quien acaba de pagar (las tres `back_urls` de la preferencia apuntan
// acá con `?estado=exito|pendiente|fallo`). Solo informa: NO cambia el estado de ningún cobro, porque quien vuelve
// del pago podría haber cerrado la pestaña o escribir la dirección a mano. El estado lo concilia el webhook.
const MENSAJES = {
  exito: {
    icono: "✓",
    tono: "exito",
    titulo: "¡Gracias! Recibimos tu pago",
    texto: "En unos instantes queda registrado. No hace falta que hagas nada más.",
  },
  pendiente: {
    icono: "…",
    tono: "pendiente",
    titulo: "Tu pago está en proceso",
    texto: "Mercado Pago todavía no lo acreditó (por ejemplo, un pago en efectivo o una transferencia). Cuando se acredite, queda registrado solo.",
  },
  fallo: {
    icono: "!",
    tono: "fallo",
    titulo: "No se pudo completar el pago",
    texto: "No se te cobró nada. Podés volver a abrir el link que te pasaron e intentar de nuevo.",
  },
};

export default async function ResultadoPagoPage({ searchParams }) {
  const { estado } = await searchParams;
  const mensaje = MENSAJES[estado] ?? MENSAJES.pendiente;

  return (
    <main className={styles.pantalla}>
      <div className={styles.tarjeta}>
        <Image src="/escudo.png" alt="Club Náutico Hacoaj" width={40} height={48} className={styles.escudo} priority />
        <div className={`${styles.icono} ${styles[mensaje.tono]}`} aria-hidden="true">
          {mensaje.icono}
        </div>
        <h1 className={styles.titulo}>{mensaje.titulo}</h1>
        <p className={styles.texto}>{mensaje.texto}</p>
        <p className={styles.pie}>Primera D · Club Náutico Hacoaj</p>
      </div>
    </main>
  );
}
