"use client";

import Link from "next/link";
import Aviso from "@/components/Aviso";
import FormularioContrasena from "@/components/FormularioContrasena";
import IconoPanel from "@/components/IconoPanel";
import { cx } from "@/lib/cx";
import { TODOS_LOS_ACCESOS } from "@/lib/menus";
import { useAccesosRapidos } from "@/lib/useAccesosRapidos";
import { useAviso } from "@/lib/useAviso";
import { useNotificacionesPush } from "@/lib/useNotificacionesPush";
import styles from "./ConfiguracionPanel.module.css";

// Configuración del panel técnico, copiada de la v1: enlace a "Enviar
// notificación" y la lista para activar/desactivar y reordenar los accesos
// directos del menú principal. A diferencia de la v1 (que además dejaba
// crear/editar usuarios acá — pantallas de carga de datos, quedan afuera por
// ahora), esto SÍ es una pantalla real: no necesita base de datos, guarda la
// preferencia en este navegador (useAccesosRapidos.js).
export default function ConfiguracionPanel() {
  const { config, alternar, mover } = useAccesosRapidos();
  const porId = new Map(TODOS_LOS_ACCESOS.map((a) => [a.id, a]));
  const aviso = useAviso();

  return (
    <>
      <p className={styles.descripcion}>
        Notificaciones push, tu contraseña y personalización de los accesos directos del panel principal.
      </p>

      <h2 className={styles.rotulo}>Notificaciones</h2>
      <Link href="/panel/notificaciones" className={styles.enlaceNotificacion}>
        <span className={cx(styles.iconoEnlace, styles.iconoNaranja)}>
          <IconoPanel nombre="campana" tamano={18} />
        </span>
        <span className={styles.textoEnlace}>
          <span className={styles.tituloEnlace}>Enviar notificación</span>
          <span className={styles.subEnlace}>Enviá una notificación push a todos los jugadores suscriptos</span>
        </span>
        <IconoPanel nombre="flechaSalir" tamano={17} className={styles.flechaEnlace} />
      </Link>
      <RecibirAvisos mostrar={aviso.mostrar} />

      <h2 className={styles.rotulo}>Cuenta</h2>
      <div className={styles.tarjeta}>
        <div className={styles.cabeceraTarjeta}>
          <div className={styles.tituloTarjeta}>Cambiar contraseña</div>
          <div className={styles.subTarjeta}>Elegí una contraseña nueva para tu cuenta</div>
        </div>
        <div className={styles.cuerpoContrasena}>
          <FormularioContrasena />
        </div>
      </div>

      <h2 className={styles.rotulo}>Accesos directos del menú</h2>
      <div className={styles.tarjeta}>
        <div className={styles.cabeceraTarjeta}>
          <div className={styles.tituloTarjeta}>Personalizar accesos directos</div>
          <div className={styles.subTarjeta}>
            Activá, desactivá y reordená los accesos rápidos que aparecen en el menú principal
          </div>
        </div>
        <ul className={styles.lista}>
          {config.map((item, indice) => {
            const acceso = porId.get(item.id);
            if (!acceso) return null;
            return (
              <li key={item.id} className={cx(styles.fila, !item.enabled && styles.filaApagada)}>
                <span className={styles.iconoFila}>
                  <IconoPanel nombre={acceso.icono} tamano={18} />
                </span>
                <span className={styles.infoFila}>
                  <span className={styles.nombreFila}>{acceso.titulo}</span>
                  <span className={styles.urlFila}>{acceso.href}</span>
                </span>
                <span className={styles.accionesFila}>
                  <button
                    type="button"
                    className={styles.botonMover}
                    disabled={indice === 0}
                    onClick={() => mover(item.id, -1)}
                    aria-label={`Subir ${acceso.titulo}`}
                  >
                    <IconoPanel nombre="flechaArriba" tamano={15} />
                  </button>
                  <button
                    type="button"
                    className={styles.botonMover}
                    disabled={indice === config.length - 1}
                    onClick={() => mover(item.id, 1)}
                    aria-label={`Bajar ${acceso.titulo}`}
                  >
                    <IconoPanel nombre="flechaArriba" tamano={15} className={styles.flechaAbajo} />
                  </button>
                </span>
                <label className={styles.interruptor}>
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={() => alternar(item.id)}
                    aria-label={`Mostrar ${acceso.titulo} en accesos rápidos`}
                  />
                  <span className={styles.pista} />
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <p className={styles.notaDatos}>
        Esta preferencia se guarda en este navegador (como en la v1): cada técnico/admin ve sus propios
        accesos rápidos, no es algo compartido entre todos.
      </p>

      <Aviso mensaje={aviso.mensaje} tipo={aviso.tipo} visible={aviso.visible} />
    </>
  );
}

// Avisos push en ESTE dispositivo (p. ej. "Pago recibido" para el administrador). Si el navegador no puede
// recibirlos, no se muestra.
function RecibirAvisos({ mostrar }) {
  const { soportado, activas, bloqueadas, ocupado, activar } = useNotificacionesPush(mostrar);
  if (!soportado) return null;

  return (
    <button
      type="button"
      className={cx(styles.enlaceNotificacion, styles.enlaceSeparado)}
      onClick={activar}
      disabled={ocupado}
    >
      <span className={cx(styles.iconoEnlace, activas ? styles.iconoVerde : styles.iconoAzul)}>
        <IconoPanel nombre="campana" tamano={18} />
      </span>
      <span className={styles.textoEnlace}>
        <span className={styles.tituloEnlace}>Recibir avisos en este dispositivo</span>
        <span className={styles.subEnlace}>
          {activas
            ? "Activados: te llegan los avisos de la app en este navegador"
            : bloqueadas
              ? "Bloqueados en el navegador: habilitalos desde su configuración"
              : "Tocá para activar los avisos de la app (por ejemplo, pagos recibidos)"}
        </span>
      </span>
      {(activas || bloqueadas) && (
        <span className={cx(styles.insignia, activas ? styles.insigniaActiva : styles.insigniaBloqueada)}>
          {activas ? "Activo" : "Bloqueado"}
        </span>
      )}
    </button>
  );
}
