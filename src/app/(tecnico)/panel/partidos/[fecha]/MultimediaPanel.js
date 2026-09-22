import EtiquetaSeccion from "@/components/EtiquetaSeccion";
import Icono from "@/components/Icono";
import VacioPanel from "../../../_componentes/VacioPanel";
import styles from "./MultimediaPanel.module.css";

// Pestaña "Multimedia" del detalle de partido, en el panel técnico: links y
// videos que se subieron para el partido. Acá solo se ven (el alta de
// contenido, que en la v1 hace el administrador con un formulario aparte,
// queda para cuando se hagan las pantallas de carga de datos).
export default function MultimediaPanel({ videos, links }) {
  if (videos.length === 0 && links.length === 0) {
    return <VacioPanel titulo="Sin multimedia" mensaje="Todavía no se subió contenido para este partido." />;
  }

  return (
    <>
      {links.length > 0 && (
        <div className={styles.seccionLinks}>
          <EtiquetaSeccion>Links</EtiquetaSeccion>
          <div className={styles.listaLinks}>
            {links.map((l) => (
              <div key={l.url} className={styles.tarjetaLink}>
                <div className={styles.iconoLink}>
                  <Icono nombre="documento" tamano={18} />
                </div>
                <div className={styles.infoLink}>
                  <div className={styles.tituloLink}>{l.titulo}</div>
                  <div className={styles.urlLink}>{l.url}</div>
                </div>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className={styles.abrirLink}>
                  Abrir
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <>
          <EtiquetaSeccion>Videos</EtiquetaSeccion>
          <div className={styles.listaVideos}>
            {videos.map((v) => (
              <div key={v.id} className={styles.tarjetaVideo}>
                <div className={styles.embed}>
                  <iframe
                    src={`https://drive.google.com/file/d/${v.drive_id}/preview`}
                    allow="autoplay"
                    allowFullScreen
                    title={v.titulo}
                  />
                </div>
                <div className={styles.infoVideo}>
                  <span className={styles.tituloVideo}>{v.titulo}</span>
                  <a
                    href={`https://drive.google.com/uc?export=download&id=${v.drive_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.descargar}
                  >
                    <Icono nombre="descargar" tamano={14} strokeWidth={2.2} />
                    Descargar
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
