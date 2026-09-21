import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import CommentBox from "@/components/CommentBox";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import styles from "./page.module.css";

export const metadata = {
  title: "Componentes",
  robots: { index: false },
};

// Página TEMPORAL para revisar las piezas de diseño. Se borra cuando ya no haga falta.
export default function ComponentesPage() {
  return (
    <div className={styles.pagina}>
      <PageHeader titulo="Componentes" volverHref="/" fija={false}>
        <span>Salir</span>
      </PageHeader>

      <main className={styles.contenido}>
        <Seccion titulo="Badge" nota="Etiquetas chicas. El puntito dorado es opcional.">
          <div className={styles.fila}>
            <Badge>Azul</Badge>
            <Badge punto>Con punto</Badge>
            <Badge tono="neutro">Neutro</Badge>
            <Badge tono="exito">Bueno</Badge>
            <Badge tono="aviso">Regular</Badge>
            <Badge tono="peligro">Alto</Badge>
          </div>
        </Seccion>

        <Seccion titulo="Button" nota="Principal y secundario. Con href navega, sin href es un botón común.">
          <div className={styles.fila}>
            <Button>Principal</Button>
            <Button variante="secundario">Secundario</Button>
            <Button disabled>Deshabilitado</Button>
          </div>
          <Button bloque href="/">
            Ocupa todo el ancho (es un link a Inicio)
          </Button>
        </Seccion>

        <Seccion titulo="Card" nota="La tarjeta base. Adentro se pone cualquier contenido.">
          <Card>
            <Badge tono="neutro">Ejemplo</Badge>
            <p className={styles.texto}>
              Una Card con un Badge adentro: los componentes se combinan como piezas.
            </p>
          </Card>
        </Seccion>

        <Seccion titulo="EmptyState" nota="Para cuando todavía no hay datos.">
          <EmptyState mensaje="Todavía no hay mediciones cargadas" />
        </Seccion>

        <Seccion titulo="CommentBox" nota="Con comentario y sin comentario (vacío).">
          <CommentBox comentario="Muy buena progresión en el press de pecho. Seguimos con el plan y en 4 semanas volvemos a medir." />
          <CommentBox comentario="" />
        </Seccion>
      </main>
    </div>
  );
}

function Seccion({ titulo, nota, children }) {
  return (
    <section className={styles.seccion}>
      <h2 className={styles.tituloSeccion}>{titulo}</h2>
      <p className={styles.nota}>{nota}</p>
      <div className={styles.cuerpo}>{children}</div>
    </section>
  );
}
