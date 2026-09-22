import SectionLabel from "@/components/SectionLabel";
import { FORMACIONES } from "@/lib/formaciones";
import styles from "./Alineaciones.module.css";

// Ubica cada titular en un puesto del esquema: primero por coincidencia exacta
// de posición, y los que sobran, en los lugares que quedan libres.
function ubicarEnCancha(formacion, titulares) {
  const puestos = FORMACIONES[formacion];
  if (!puestos) return null;

  const slots = puestos.map((p) => ({ ...p, jugador: null }));
  const sinUbicar = [...titulares];

  for (const slot of slots) {
    const indice = sinUbicar.findIndex((j) => j.posicion === slot.pos);
    if (indice !== -1) {
      slot.jugador = sinUbicar[indice];
      sinUbicar.splice(indice, 1);
    }
  }
  for (const slot of slots) {
    if (!slot.jugador && sinUbicar.length > 0) slot.jugador = sinUbicar.shift();
  }
  return slots.filter((slot) => slot.jugador);
}

// Alternativa sin esquema reconocido: arquero atrás, después defensores,
// mediocampistas y delanteros, cada línea repartida en su ancho.
function ubicarPorLineas(titulares) {
  const arquero = titulares.filter((t) => t.posicion === "PO");
  const defensores = titulares.filter((t) => ["DFI", "DFC", "DFD"].includes(t.posicion));
  const mediocampistas = titulares.filter((t) =>
    ["MI", "MC", "MD", "MCD", "MCO", "EI", "ED"].includes(t.posicion),
  );
  const delanteros = titulares.filter((t) => t.posicion === "DC");
  const otros = titulares.filter(
    (t) => !arquero.includes(t) && !defensores.includes(t) && !mediocampistas.includes(t) && !delanteros.includes(t),
  );
  const lineas = [delanteros, [...mediocampistas, ...otros], defensores, arquero];
  const alturas = [90, 74, 52, 22];

  const slots = [];
  lineas.forEach((linea, indiceLinea) => {
    linea.forEach((jugador, indice) => {
      slots.push({ jugador, x: ((indice + 1) * 100) / (linea.length + 1), y: alturas[indiceLinea] ?? 50 });
    });
  });
  return slots;
}

function iniciales(nombre) {
  const partes = nombre.trim().split(/\s+/);
  return partes.length >= 2
    ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
    : nombre.slice(0, 2).toUpperCase();
}

function apellido(nombre) {
  const partes = nombre.trim().split(/\s+/);
  return partes.length >= 2 ? partes[partes.length - 1] : nombre;
}

// Cancha con los 11 titulares, copiada de la v1: círculo con iniciales,
// apellido, minutos, cinta de capitán y, si salió, la flechita roja; además
// los íconos de gol/asistencia/tarjeta.
function Jugador({ jugador: j, esCapitan, fueSustituido }) {
  return (
    <div className={styles.jugador} style={{ left: `${j.x}%`, top: `${j.y}%` }}>
      <div className={styles.circulo}>
        <span className={styles.iniciales}>{iniciales(j.jugador.jugador)}</span>
      </div>
      <span className={styles.nombre}>
        {apellido(j.jugador.jugador)}
        {esCapitan && <span className={styles.capitan}>C</span>}
      </span>
      <span className={styles.minutos}>
        {j.jugador.minutos}&apos;{fueSustituido && <span className={styles.salio}>▼</span>}
      </span>
      {(j.jugador.goles > 0 || j.jugador.asistencias > 0 || j.jugador.amarillas > 0 || j.jugador.rojas > 0) && (
        <div className={styles.iconos}>
          {Array.from({ length: j.jugador.goles }, (_, i) => (
            <span key={`g${i}`} className={styles.iconoGol}>
              G
            </span>
          ))}
          {Array.from({ length: j.jugador.asistencias }, (_, i) => (
            <span key={`a${i}`} className={styles.iconoAsist}>
              A
            </span>
          ))}
          {j.jugador.amarillas > 0 && <span className={styles.iconoAmarilla} />}
          {j.jugador.rojas > 0 && <span className={styles.iconoRoja} />}
        </div>
      )}
    </div>
  );
}

// El minuto en que entró un suplente: recorre "a quién reemplazó" hasta el
// titular, sumando los minutos jugados por cada eslabón de la cadena.
function minutoDeIngreso(jugador, porNombre) {
  let acumulado = 0;
  let actual = jugador;
  while (actual?.ingreso_por) {
    const reemplazado = porNombre.get(actual.ingreso_por);
    if (!reemplazado) break;
    acumulado += reemplazado.minutos;
    actual = reemplazado;
  }
  return acumulado;
}

// Pestaña "Alineaciones": la cancha con los titulares, los cambios realizados
// y el banco. Copiada de la v1 (ahí se armaba con JS del lado del cliente).
export default function Alineaciones({ formacion, capitan, jugadores }) {
  const porNombre = new Map(jugadores.map((j) => [j.jugador, j]));
  const titulares = jugadores.filter((j) => j.titular);
  const usados = jugadores.filter((j) => !j.titular && j.minutos > 0 && j.ingreso_por);
  const banco = jugadores.filter((j) => !j.titular && !(j.minutos > 0 && j.ingreso_por));
  const sustituidos = new Set(usados.map((j) => j.ingreso_por));

  const slots = (formacion && ubicarEnCancha(formacion, titulares)) || ubicarPorLineas(titulares);

  const cambios = usados
    .map((j) => ({ jugador: j, minuto: minutoDeIngreso(j, porNombre) }))
    .sort((a, b) => a.minuto - b.minuto);

  return (
    <>
      <SectionLabel nota={formacion || undefined}>Formación</SectionLabel>
      <div className={styles.canchaContenedor}>
        <div className={styles.cancha}>
          <div className={styles.lineaH} />
          <div className={styles.circuloCentral} />
          <div className={styles.areaArriba} />
          <div className={styles.areaAbajo} />
          <div className={styles.arcoArriba} />
          <div className={styles.arcoAbajo} />
          <div className={styles.puntoCentral} />
          {formacion && <div className={styles.insignia}>{formacion}</div>}
          {slots.map((slot) => (
            <Jugador
              key={slot.jugador.jugador}
              jugador={slot}
              esCapitan={slot.jugador.jugador === capitan}
              fueSustituido={sustituidos.has(slot.jugador.jugador)}
            />
          ))}
        </div>
      </div>

      {cambios.length > 0 && (
        <>
          <SectionLabel nota={`${cambios.length} ${cambios.length === 1 ? "cambio" : "cambios"}`} separada>
            Sustituciones
          </SectionLabel>
          <div className={styles.listaCambios}>
            {cambios.map(({ jugador: j, minuto }) => (
              <div key={j.jugador} className={styles.tarjetaCambio}>
                <span className={styles.minutoCambio}>{minuto}&apos;</span>
                <div className={styles.jugadoresCambio}>
                  <div className={styles.entra}>{j.jugador}</div>
                  <div className={styles.sale}>{j.ingreso_por}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {banco.length > 0 && (
        <>
          <SectionLabel nota={`${banco.length} ${banco.length === 1 ? "jugador" : "jugadores"}`} separada>
            Banco
          </SectionLabel>
          <div className={styles.grillaBanco}>
            {banco.map((j) => (
              <div key={j.jugador} className={styles.chipBanco}>
                <div className={styles.avatarBanco}>{iniciales(j.jugador)}</div>
                <div>
                  <div className={styles.nombreBanco}>{apellido(j.jugador)}</div>
                  {j.posicion && <div className={styles.posicionBanco}>{j.posicion}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
