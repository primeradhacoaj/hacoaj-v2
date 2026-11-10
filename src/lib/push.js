// Notificaciones push del lado del navegador: permiso, suscripción de este dispositivo y alta/baja en la base.
//
// Cómo funciona (igual que en la v1):
//  1. La persona toca "Notificaciones" y el navegador le pide permiso.
//  2. Si acepta, el navegador crea una suscripción (una dirección propia del dispositivo + dos claves).
//  3. Esa suscripción se guarda en la base (`push_suscripciones`), a nombre de quien tiene la sesión abierta.
//  4. Para enviar un aviso, el servidor usa esa dirección; el service worker (`public/sw.js`) lo muestra.
//
// La clave PÚBLICA de VAPID identifica a este servidor ante el servicio de push del navegador. La privada (la
// que firma los envíos) vive solo en las variables de entorno del servidor, nunca acá.
export const CLAVE_PUBLICA_VAPID =
  "BPTOJNziGT75DIZRBhd08PFVK_jJ9rzE5QADZ5nJ1onaLI4jAaC5jMNRj93AsV60hZAWURJ6FOsXK8-L54E8dP0";

// Estados posibles del permiso (los mismos que usa el navegador) más "no-soportado".
export const PUSH_NO_SOPORTADO = "no-soportado";

const oyentes = new Set();

function avisarCambio() {
  oyentes.forEach((oyente) => oyente());
}

// Para `useSyncExternalStore`: se avisa cuando cambia el permiso (desde acá o desde la configuración del navegador).
export function observarPermisoPush(oyente) {
  oyentes.add(oyente);
  let estadoPermiso = null;
  if (typeof navigator !== "undefined" && navigator.permissions?.query) {
    navigator.permissions
      .query({ name: "notifications" })
      .then((estado) => {
        estadoPermiso = estado;
        estado.onchange = avisarCambio;
      })
      .catch(() => {});
  }
  return () => {
    oyentes.delete(oyente);
    if (estadoPermiso) estadoPermiso.onchange = null;
  };
}

export function permisoPush() {
  if (typeof window === "undefined") return "default";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return PUSH_NO_SOPORTADO;
  }
  return Notification.permission; // "default" | "granted" | "denied"
}

// Mientras se arma la página en el servidor no se sabe nada del navegador: se asume el estado inicial.
export function permisoPushServidor() {
  return "default";
}

// La clave VAPID viene en base64 "url-safe"; el navegador la pide como bytes.
function claveABytes(clave) {
  const relleno = "=".repeat((4 - (clave.length % 4)) % 4);
  const crudo = atob((clave + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

function iguales(a, b) {
  if (!a || !b || a.byteLength !== b.byteLength) return false;
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  return x.every((valor, i) => valor === y[i]);
}

// Pide el permiso (solo si hace falta: tiene que ser tras un toque de la persona) y devuelve el resultado.
export async function pedirPermisoPush() {
  const resultado = await Notification.requestPermission();
  avisarCambio();
  return resultado;
}

// Suscribe este dispositivo (si todavía no lo está) y guarda la suscripción a nombre de quien tiene la sesión.
// Se puede llamar las veces que haga falta: si ya existe, solo la vuelve a registrar.
//
// Si ya hay un registro en curso, quien llama espera ese mismo en vez de empezar otro: al aceptar el permiso se
// disparan dos a la vez (el toque y el registro automático del menú) y, pisándose, el navegador llegaba a crear
// varias suscripciones para el mismo celular.
let registroEnCurso = null;

export function activarPush(supabase) {
  registroEnCurso ??= registrarDispositivo(supabase).finally(() => {
    registroEnCurso = null;
  });
  return registroEnCurso;
}

async function registrarDispositivo(supabase) {
  const registro = await navigator.serviceWorker.ready;
  const clave = claveABytes(CLAVE_PUBLICA_VAPID);

  let suscripcion = await registro.pushManager.getSubscription();
  // Una suscripción hecha con otra clave (p. ej. de una versión anterior de la app) no sirve: se cambia.
  if (suscripcion && !iguales(suscripcion.options?.applicationServerKey, clave)) {
    await suscripcion.unsubscribe();
    suscripcion = null;
  }
  suscripcion ??= await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: clave,
  });

  const { endpoint, keys } = suscripcion.toJSON();
  const { error } = await supabase.rpc("registrar_suscripcion_push", {
    p_endpoint: endpoint,
    p_p256dh: keys?.p256dh,
    p_auth: keys?.auth,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
}

// Al cerrar sesión: este dispositivo deja de recibir los avisos de esa cuenta (así no le llegan a la persona
// siguiente que use el mismo celular). La suscripción del navegador se conserva; se vuelve a registrar sola
// la próxima vez que alguien con permiso activo entre al menú.
export async function olvidarDispositivoPush(supabase) {
  try {
    if (permisoPush() === PUSH_NO_SOPORTADO) return;
    const registro = await navigator.serviceWorker.getRegistration();
    const suscripcion = await registro?.pushManager.getSubscription();
    if (suscripcion) await supabase.rpc("quitar_suscripcion_push", { p_endpoint: suscripcion.endpoint });
  } catch {
    // Cerrar sesión nunca debe fallar por esto.
  }
}
