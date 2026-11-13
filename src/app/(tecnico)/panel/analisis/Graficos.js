"use client";

import { useState } from "react";
import { fechaCortaADate } from "@/lib/analisisPlantel";

// Gráficos de línea del dashboard, copiados de la v1 (SVG hecho a mano).

const TEXTO_EJE = { fontSize: 10, fill: "rgba(0,0,0,.45)", fontFamily: "inherit" };
const TEXTO_EJE_CHICO = { fontSize: 9, fill: "rgba(0,0,0,.4)", fontFamily: "inherit" };

function SinDatos({ texto, chico = false }) {
  return (
    <div style={{ padding: chico ? "20px 0" : "40px 0", textAlign: "center", fontSize: chico ? 12 : 13, color: "rgba(0,0,0,.4)" }}>
      {texto}
    </div>
  );
}

// Evolución del PROMEDIO del plantel por fecha (`buildLineChartSVG` de la v1):
// área suave debajo de la línea; los puntos aparecen al pasar el mouse y cada
// uno muestra fecha, valor y cuántos jugadores entraron en el promedio.
//
// Props:
//   puntos       [{ fecha: "dd/mm/aaaa", valor, cantidad }] en orden cronológico
//   color, etiqueta (nombre de la métrica en el globito), decimales
//   formatoFecha cómo se escribe la fecha en el eje X (por defecto, tal cual)
//   chico        etiquetas del eje X más chicas (Composición corporal)
//   textoVacio   mensaje si hay menos de 2 fechas
export function EvolucionPlantel({
  puntos: todos,
  color,
  etiqueta,
  decimales = 2,
  ancho = 480,
  alto = 260,
  formatoFecha = (f) => f,
  chico = false,
  textoVacio = "Sin datos suficientes",
}) {
  const [encima, setEncima] = useState(false);
  // la v1 descartaba fechas imposibles (año 2004 o antes)
  const puntos = todos.filter((p) => (fechaCortaADate(p.fecha)?.getFullYear() ?? 0) > 2004);
  if (puntos.length < 2) return <SinDatos texto={textoVacio} />;

  const valores = puntos.map((p) => p.valor);
  const minimo = Math.min(...valores);
  const rango = Math.max(...valores) - minimo || 1;
  const pad = { t: 20, b: 28, l: 50, r: 20 };
  const anchoUtil = ancho - pad.l - pad.r;
  const altoUtil = alto - pad.t - pad.b;
  const x = (i) => pad.l + (i / (puntos.length - 1)) * anchoUtil;
  const y = (v) => pad.t + altoUtil - ((v - minimo) / rango) * altoUtil;
  const paso = Math.max(1, Math.floor(puntos.length / 6));
  const linea = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const area = `${linea} L${x(puntos.length - 1)},${pad.t + altoUtil} L${pad.l},${pad.t + altoUtil} Z`;
  const ultimo = puntos[puntos.length - 1];

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${ancho} ${alto}`}
      style={{ display: "block", overflow: "visible" }}
      onMouseOver={() => setEncima(true)}
      onMouseOut={() => setEncima(false)}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const v = minimo + (rango * i) / 4;
        return (
          <g key={i}>
            <line x1={pad.l} y1={y(v)} x2={ancho - pad.r} y2={y(v)} stroke="rgba(0,0,0,.07)" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" {...TEXTO_EJE}>
              {v.toFixed(decimales)}
            </text>
          </g>
        );
      })}
      {puntos.map(
        (p, i) =>
          (i % paso === 0 || i === puntos.length - 1) && (
            <text key={p.fecha} x={x(i)} y={alto - 4} textAnchor="middle" {...(chico ? TEXTO_EJE_CHICO : TEXTO_EJE)}>
              {formatoFecha(p.fecha)}
            </text>
          ),
      )}
      <path d={area} fill={color} fillOpacity="0.06" />
      <path d={linea} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {puntos.map((p, i) => {
        const globito = `Fecha: ${p.fecha}\n${etiqueta}: ${p.valor.toFixed(decimales)}\nJugadores: ${p.cantidad}`;
        return (
          <g key={p.fecha} style={{ cursor: "pointer" }}>
            <circle cx={x(i).toFixed(1)} cy={y(p.valor).toFixed(1)} r="4" fill={color} stroke="#fff" strokeWidth="2" opacity={encima ? 1 : 0}>
              <title>{globito}</title>
            </circle>
            <circle cx={x(i).toFixed(1)} cy={y(p.valor).toFixed(1)} r="16" fill="transparent">
              <title>{globito}</title>
            </circle>
          </g>
        );
      })}
      <circle cx={x(puntos.length - 1).toFixed(1)} cy={y(ultimo.valor).toFixed(1)} r="3.5" fill={color} />
    </svg>
  );
}

// Evolución de UN jugador (`playerEvolutionSVG` / `playerPesoSVG` de la v1):
// una o varias series sobre las mismas fechas, con puntos siempre visibles.
//
// Props:
//   series       [{ nombre, color, puntos: [{ fecha, valor }] }]
//   decimales, unidad (para el globito), formatoFecha
//   pad          márgenes internos ({ t, b, l, r })
export function EvolucionJugador({
  series,
  decimales = 2,
  unidad = "",
  ancho = 380,
  alto = 160,
  pad = { t: 25, b: 35, l: 45, r: 15 },
  formatoFecha = (f) => f,
  minimoPuntos = 1,
  textoVacio = "Sin datos",
}) {
  const fechas = [...new Set(series.flatMap((s) => s.puntos.map((p) => p.fecha)).filter(Boolean))].sort(
    (a, b) => (fechaCortaADate(a) ?? 0) - (fechaCortaADate(b) ?? 0),
  );
  const valores = series.flatMap((s) => s.puntos.map((p) => p.valor)).filter((v) => v != null && v !== 0);
  if (fechas.length < minimoPuntos || valores.length < minimoPuntos) return <SinDatos texto={textoVacio} chico />;

  const minimo = Math.min(...valores);
  const rango = Math.max(...valores) - minimo || 1;
  const anchoUtil = ancho - pad.l - pad.r;
  const altoUtil = alto - pad.t - pad.b;
  const x = (i) => pad.l + (i / (fechas.length - 1 || 1)) * anchoUtil;
  const y = (v) => pad.t + altoUtil - ((v - minimo) / rango) * altoUtil;
  const paso = Math.max(1, Math.floor(fechas.length / 5));

  return (
    <svg width="100%" viewBox={`0 0 ${ancho} ${alto}`} style={{ display: "block", overflow: "visible" }}>
      {[0, 1, 2, 3].map((i) => {
        const v = minimo + (rango * i) / 3;
        return (
          <g key={i}>
            <line x1={pad.l} y1={y(v)} x2={ancho - pad.r} y2={y(v)} stroke="rgba(0,0,0,.06)" />
            <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" {...TEXTO_EJE_CHICO}>
              {v.toFixed(decimales)}
            </text>
          </g>
        );
      })}
      {fechas.map(
        (f, i) =>
          (i % paso === 0 || i === fechas.length - 1) && (
            <text key={f} x={x(i)} y={alto - 6} textAnchor="middle" {...TEXTO_EJE_CHICO}>
              {formatoFecha(f)}
            </text>
          ),
      )}
      {series.map((serie) => {
        const puntos = serie.puntos
          .filter((p) => p.fecha && p.valor != null)
          .map((p) => ({ ...p, i: fechas.indexOf(p.fecha) }))
          .sort((a, b) => a.i - b.i);
        if (puntos.length === 0) return null;
        const linea = puntos.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
        return (
          <g key={serie.nombre}>
            <path d={linea} fill="none" stroke={serie.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {puntos.map((p) => (
              <circle key={p.i} cx={x(p.i).toFixed(1)} cy={y(p.valor).toFixed(1)} r="3.5" fill={serie.color} stroke="#fff" strokeWidth="1.5" style={{ cursor: "pointer" }}>
                <title>
                  {p.fecha}: {p.valor.toFixed(decimales)}
                  {unidad}
                </title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
