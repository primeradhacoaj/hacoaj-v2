import { aNumero, fechaLegible } from "@/lib/fuerza";
import styles from "./Graficos.module.css";

// Gráfico combinado: barras azules = carga (eje izquierdo) y línea dorada =
// VMP (eje derecho). Misma matemática que la v1.
//
// Props:
//   registros      mediciones, de la más nueva a la más vieja
//   campoFecha, campoCarga, campoVmp   columnas a usar
//   alSeleccionar(lineas)              se llama con el detalle del punto tocado
export default function GraficoCombinado({
  registros,
  campoFecha,
  campoCarga,
  campoVmp,
  alSeleccionar,
}) {
  const datos = [...registros].reverse();
  const n = datos.length;
  const cargas = datos.map((r) => aNumero(r[campoCarga]));
  const vmps = datos.map((r) => aNumero(r[campoVmp]));
  const fechas = datos.map((r) => fechaLegible(r[campoFecha]) || "—");
  const cargasValidas = cargas.filter((v) => v !== null);
  const vmpsValidas = vmps.filter((v) => v !== null);

  if (cargasValidas.length === 0 && vmpsValidas.length === 0) {
    return <div className={styles.vacio}>Sin datos</div>;
  }

  const ancho = 460;
  const alto = 220;
  const margenArriba = 16;
  const margenAbajo = 44;
  const margenIzq = 44;
  const margenDer = 44;
  const anchoUtil = ancho - margenIzq - margenDer;
  const altoUtil = alto - margenArriba - margenAbajo;

  const maxCarga = Math.max(...cargasValidas) * 1.15 || 1;
  const maxVmp = Math.max(...vmpsValidas) * 1.15 || 1;

  const separacion = anchoUtil / n;
  const anchoBarra = Math.min(28, separacion * 0.55);
  const centroX = (i) => margenIzq + separacion * i + separacion / 2;
  const yVmp = (v) => margenArriba + altoUtil - (v / maxVmp) * altoUtil;

  let trazo = "";
  let empezo = false;
  vmps.forEach((v, i) => {
    if (v === null) return;
    trazo += `${empezo ? " L" : "M"}${centroX(i).toFixed(1)},${yVmp(v).toFixed(1)}`;
    empezo = true;
  });

  const teclado = (accion) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      accion();
    }
  };

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${ancho} ${alto}`}
      style={{ overflow: "visible" }}
      role="img"
      aria-label="Gráfico de carga y velocidad"
    >
      {/* Guías: carga a la izquierda, VMP a la derecha */}
      {[0, 1, 2, 3, 4].map((g) => {
        const y = margenArriba + altoUtil - (altoUtil * g) / 4;
        return (
          <g key={g}>
            <line
              x1={margenIzq}
              y1={y}
              x2={ancho - margenDer}
              y2={y}
              stroke="rgba(0,0,0,0.06)"
              strokeWidth="1"
            />
            <text x={margenIzq - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
              {((maxCarga * g) / 4).toFixed(0)}
            </text>
            <text
              x={ancho - margenDer + 6}
              y={y + 3}
              textAnchor="start"
              fontSize="9"
              fill="#94a3b8"
            >
              {((maxVmp * g) / 4).toFixed(2)}
            </text>
          </g>
        );
      })}

      {/* Barras de carga */}
      {cargas.map((valor, i) => {
        if (valor === null) return null;
        const altoBarra = (valor / maxCarga) * altoUtil;
        const alTocar = () =>
          alSeleccionar?.([
            `📅 ${fechas[i]}`,
            `Carga: ${valor.toFixed(1)} kg`,
            ...(vmps[i] !== null ? [`VMP: ${vmps[i].toFixed(2)} m/s`] : []),
          ]);
        return (
          <rect
            key={i}
            x={centroX(i) - anchoBarra / 2}
            y={margenArriba + altoUtil - altoBarra}
            width={anchoBarra}
            height={altoBarra}
            rx="3"
            fill="#00296b"
            opacity="0.85"
            className={styles.punto}
            role="button"
            tabIndex={0}
            aria-label={`${fechas[i]}: carga ${valor.toFixed(1)} kg`}
            onClick={alTocar}
            onKeyDown={teclado(alTocar)}
          />
        );
      })}

      {/* Fechas debajo */}
      {fechas.map((fecha, i) => (
        <text key={i} x={centroX(i)} y={alto - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">
          {fecha}
        </text>
      ))}

      {/* Línea y puntos de VMP */}
      <path
        d={trazo}
        fill="none"
        stroke="#c9a83e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {vmps.map((valor, i) => {
        if (valor === null) return null;
        const alTocar = () =>
          alSeleccionar?.([
            `📅 ${fechas[i]}`,
            ...(cargas[i] !== null ? [`Carga: ${cargas[i].toFixed(1)} kg`] : []),
            `VMP: ${valor.toFixed(2)} m/s`,
          ]);
        return (
          <circle
            key={i}
            cx={centroX(i).toFixed(1)}
            cy={yVmp(valor).toFixed(1)}
            r="5"
            fill="#c9a83e"
            stroke="#fff"
            strokeWidth="2"
            className={styles.punto}
            role="button"
            tabIndex={0}
            aria-label={`${fechas[i]}: VMP ${valor.toFixed(2)} m/s`}
            onClick={alTocar}
            onKeyDown={teclado(alTocar)}
          />
        );
      })}

      {/* Nombres de los ejes */}
      <text
        x="12"
        y={margenArriba + altoUtil / 2}
        textAnchor="middle"
        fontSize="9"
        fill="#94a3b8"
        transform={`rotate(-90,12,${margenArriba + altoUtil / 2})`}
      >
        Carga (kg)
      </text>
      <text
        x={ancho - 8}
        y={margenArriba + altoUtil / 2}
        textAnchor="middle"
        fontSize="9"
        fill="#94a3b8"
        transform={`rotate(90,${ancho - 8},${margenArriba + altoUtil / 2})`}
      >
        VMP (m/s)
      </text>
    </svg>
  );
}
