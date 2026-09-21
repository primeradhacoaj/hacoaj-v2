import Icono from "@/components/Icono";
import styles from "./TarjetaRecurso.module.css";

// Tarjeta con documentos PDF para ver o descargar (pautas nutricionales,
// suplementación, rutinas…). Copiada de la v1.
//
// Props:
//   icono         clave de <Icono> para el recuadro dorado
//   titulo, descripcion
//   aviso         (opcional) recuadro amarillo de advertencia
//   documentos    lista de { nombre, archivo }, con `archivo` = nombre del PDF en /public/rutinas
export default function TarjetaRecurso({
  icono,
  titulo,
  descripcion,
  aviso,
  documentos,
}) {
  return (
    <section className={styles.tarjeta}>
      <div className={styles.cabecera}>
        <div className={styles.icono}>
          <Icono nombre={icono} tamano={20} />
        </div>
        <div>
          <div className={styles.titulo}>{titulo}</div>
          <div className={styles.descripcion}>{descripcion}</div>
        </div>
      </div>

      {aviso && <div className={styles.aviso}>{aviso}</div>}

      <div className={styles.documentos}>
        {documentos.map((documento) => {
          // Los nombres de archivo tienen espacios: hay que codificarlos en la dirección
          const direccion = `/rutinas/${encodeURIComponent(documento.archivo)}`;
          return (
            <div key={documento.archivo} className={styles.documento}>
              <span className={styles.nombre}>{documento.nombre}</span>
              <div className={styles.acciones}>
                <a
                  href={direccion}
                  target="_blank"
                  rel="noopener"
                  className={`${styles.boton} ${styles.principal}`}
                >
                  Abrir
                </a>
                <a
                  href={direccion}
                  download
                  className={`${styles.boton} ${styles.secundario}`}
                >
                  Descargar
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
