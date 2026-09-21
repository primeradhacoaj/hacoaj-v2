import { aNumero, fechaLegible } from "@/lib/fuerza";
import styles from "./Graficos.module.css";

// Gráfico de línea dibujado a mano en SVG (misma matemática que la v1): una
// medición por punto, de la más vieja a la más nueva. Al tocar un punto se
// llama a `alSeleccionar` con el detalle.
//
// Props:
//   registros      mediciones, de la más nueva a la más vieja
//   campoFecha, campoValor   columnas a usar
//   decimales, unidad        formato del valor
//   colorLinea               color de la línea
//   colorPunto(valor)        (opcional) color de cada punto según su valor
//   zonas                    (opcional) bandas de color de fondo [{min, max, color}]
//   extras                   datos extra para el detalle [{campo, etiqueta, decimales, unidad}]
//   alSeleccionar(lineas)    se llama con las líneas de texto del punto tocado
export default function GraficoLinea({
  registros,
  campoFecha,
  campoValor,
  decimales = 2,
  unidad = "",
  colorLinea = "#00296b",
  colorPunto,
  zonas,
  extras = [],
  alSeleccionar,
}) {
  const datos = [...registros].reverse(); // de izquierda (vieja) a derecha (nueva)
  const n = datos.length;
  const valores = datos.map((r) => aNumero(r[campoValor]));
  const fechas = datos.map((r) => fechaLegible(r[campoFecha]) || "—");
  const validos = valores.filter((v) => v !== null);

  if (validos.length === 0) {
    return <div className={styles.vacio}>Sin datos</div>;
  }

  const ancho = 460;
  const alto = 220;
  const margenArriba = 20;
  const margenAbajo = 44;
  const margenIzq = 44;
  const margenDer = 16;
  const anchoUtil = ancho - margenIzq - margenDer;
  const altoUtil = alto - margenArriba - margenAbajo;

  let minimo = Math.min(...validos);
  let maximo = Math.max(...validos);
  if (zonas) {
    zonas.forEach((zona) => {
      if (zona.max < 10) maximo = Math.max(maximo, zona.max);
    });
  }
  let rango = maximo - minimo;
  if (rango === 0) rango = maximo * 0.2 || 1;
  let graficoMin = minimo - rango * 0.15;
  const graficoMax = maximo + rango * 0.15;
  if (graficoMin < 0) graficoMin = 0;
  const graficoRango = graficoMax - graficoMin;

  const posY = (v) => margenArriba + altoUtil - ((v - graficoMin) / graficoRango) * altoUtil;
  const separacion = n > 1 ? anchoUtil / (n - 1) : anchoUtil;
  const posX = (i) => margenIzq + (n > 1 ? separacion * i : anchoUtil / 2);

  // Línea que une los puntos
  let trazo = "";
  let empezo = false;
  valores.forEach((v, i) => {
    if (v === null) return;
    trazo += `${empezo ? " L" : "M"}${posX(i).toFixed(1)},${posY(v).toFixed(1)}`;
    empezo = true;
  });

  function detalle(i) {
    const lineas = [
      `📅 ${fechas[i]}`,
      valores[i].toFixed(decimales) + (unidad ? ` ${unidad}` : ""),
    ];
    extras.forEach((extra) => {
      const valorExtra = aNumero(datos[i][extra.campo]);
      if (valorExtra !== null) {
        lineas.push(
          `${extra.etiqueta}: ${valorExtra.toFixed(extra.decimales ?? 2)}${extra.unidad ?? ""}`,
        );
      }
    });
    return lineas;
  }

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${ancho} ${alto}`}
      style={{ overflow: "visible" }}
      role="img"
      aria-label="Gráfico de evolución"
    >
      {/* Líneas de guía con su valor */}
      {[0, 1, 2, 3, 4].map((g) => {
        const valorGuia = graficoMin + (graficoRango * g) / 4;
        const y = posY(valorGuia);
        return (
          <g key={g}>
            <line
              x1={margenIzq}
              y1={y.toFixed(1)}
              x2={ancho - margenDer}
              y2={y.toFixed(1)}
              stroke="rgba(0,0,0,0.06)"
              strokeWidth="1"
            />
            <text
              x={margenIzq - 6}
              y={(y + 3).toFixed(1)}
              textAnchor="end"
              fontSize="9"
              fill="#94a3b8"
              fontFamily="inherit"
            >
              {valorGuia.toFixed(decimales)}
            </text>
          </g>
        );
      })}

      {/* Bandas de color de fondo (verde / amarillo / rojo) */}
      {zonas &&
        zonas.map((zona, indice) => {
          const arriba = Math.min(zona.max, graficoMax);
          const abajo = Math.max(zona.min, graficoMin);
          if (arriba <= graficoMin || abajo >= graficoMax) return null;
          const y1 = posY(arriba);
          const y2 = posY(abajo);
          return (
            <rect
              key={indice}
              x={margenIzq}
              y={y1.toFixed(1)}
              width={anchoUtil}
              height={(y2 - y1).toFixed(1)}
              fill={zona.color}
              opacity="0.1"
            />
          );
        })}

      <path
        d={trazo}
        fill="none"
        stroke={colorLinea}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Puntos: al tocarlos muestran el detalle */}
      {valores.map((v, i) => {
        if (v === null) return null;
        const alTocar = () => alSeleccionar?.(detalle(i));
        return (
          <circle
            key={i}
            cx={posX(i).toFixed(1)}
            cy={posY(v).toFixed(1)}
            r="6"
            fill={colorPunto ? colorPunto(v) : colorLinea}
            stroke="#fff"
            strokeWidth="2"
            className={styles.punto}
            role="button"
            tabIndex={0}
            aria-label={`${fechas[i]}: ${v.toFixed(decimales)}`}
            onClick={alTocar}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                alTocar();
              }
            }}
          />
        );
      })}

      {/* Fechas debajo */}
      {fechas.map((fecha, i) => (
        <text
          key={i}
          x={posX(i).toFixed(1)}
          y={alto - 8}
          textAnchor="middle"
          fontSize="9"
          fill="#94a3b8"
          fontFamily="inherit"
        >
          {fecha}
        </text>
      ))}
    </svg>
  );
}
