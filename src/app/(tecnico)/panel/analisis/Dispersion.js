"use client";

import { useEffect, useRef, useState } from "react";
import { nombreCorto, regresionLineal } from "@/lib/analisisPlantel";
import styles from "./Dispersion.module.css";

const ANCHO = 480;
const ALTO = 280;
const PAD = { t: 20, b: 40, l: 50, r: 20 };
const ANCHO_UTIL = ANCHO - PAD.l - PAD.r;
const ALTO_UTIL = ALTO - PAD.t - PAD.b;
const INICIAL = { x: 0, y: 0, w: ANCHO, h: ALTO };
const TEXTO_EJE = { fontSize: 9, fill: "rgba(0,0,0,.4)", fontFamily: "inherit" };
const TEXTO_TITULO = { fontSize: 10, fill: "rgba(0,0,0,.5)", fontFamily: "inherit" };

// Vista (viewBox) después de un zoom por `factor` centrado en (cx, cy), en
// coordenadas del dibujo (por defecto, el centro). Entre 15% y 110% del tamaño.
function conZoom(v, factor, cx = v.x + v.w / 2, cy = v.y + v.h / 2) {
  const w = Math.max(ANCHO * 0.15, Math.min(ANCHO * 1.1, v.w / factor));
  const h = Math.max(ALTO * 0.15, Math.min(ALTO * 1.1, v.h / factor));
  return { x: cx - (cx - v.x) * (w / v.w), y: cy - (cy - v.y) * (h / v.h), w, h };
}

// Gráfico de dispersión del dashboard, copiado de la v1 (Peso vs RM en Fuerza;
// Σ6 pliegues vs peso y altura vs peso en Composición corporal): un punto por
// jugador con su nombre, la recta de tendencia del plantel (punteada; al pasar
// el mouse explica qué significa), zoom con la ruedita o los botones + / − y
// "Reset", y se arrastra para moverse. Al pasar por un punto muestra sus datos
// y cuánto se aleja de la tendencia.
//
// Props:
//   puntos        [{ nombre, x, y, posicion, activo }] — los inactivos (activo:
//                 false) se dibujan tenues y sin nombre: solo suman a la tendencia
//   color         color de los puntos
//   etiquetaX/Y   títulos de los ejes
//   decimalesY    decimales de las marcas del eje Y
//   margenY       aire arriba y abajo de los valores (en unidades del eje Y)
//   globito       (punto, residuo) => contenido del globito de un punto
//   textoTendencia contenido del globito de la recta
//   colorEncima/colorDebajo  color del "N por encima / N por debajo" del pie
export default function Dispersion({
  puntos,
  color,
  etiquetaX,
  etiquetaY,
  decimalesY = 0,
  margenY = 5,
  globito,
  textoTendencia,
  colorEncima = "#0e8a4f",
  colorDebajo = "#c2410c",
}) {
  const [vista, setVista] = useState(INICIAL);
  const vistaRef = useRef(INICIAL);
  const contenedorRef = useRef(null);
  const svgRef = useRef(null);
  const arrastre = useRef(null);
  const [encima, setEncima] = useState(null); // índice del punto bajo el mouse
  const [tip, setTip] = useState(null); // { contenido, left, top }
  const [arrastrando, setArrastrando] = useState(false);

  const cambiarVista = (nueva) => {
    vistaRef.current = nueva;
    setVista(nueva);
  };

  const zoom = (factor) => cambiarVista(conZoom(vistaRef.current, factor));
  const hayDatos = puntos.length >= 2;

  // La ruedita del mouse hace zoom donde está el puntero (y no mueve la página):
  // hace falta un listener "no pasivo", que React no permite con onWheel.
  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return undefined;
    const alGirar = (e) => {
      e.preventDefault();
      const rect = svgRef.current.getBoundingClientRect();
      const v = vistaRef.current;
      const cx = v.x + ((e.clientX - rect.left) / rect.width) * v.w;
      const cy = v.y + ((e.clientY - rect.top) / rect.height) * v.h;
      const nueva = conZoom(v, e.deltaY < 0 ? 1.2 : 1 / 1.2, cx, cy);
      vistaRef.current = nueva;
      setVista(nueva);
    };
    contenedor.addEventListener("wheel", alGirar, { passive: false });
    return () => contenedor.removeEventListener("wheel", alGirar);
  }, [hayDatos]);

  if (!hayDatos) {
    return <div className={styles.sinDatos}>Sin datos suficientes</div>;
  }

  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const minX = Math.min(...xs) - 2;
  const maxX = Math.max(...xs) + 2;
  const minY = Math.min(...ys) - margenY;
  const maxY = Math.max(...ys) + margenY;
  const rangoX = maxX - minX || 1;
  const rangoY = maxY - minY || 1;
  const px = (v) => PAD.l + ((v - minX) / rangoX) * ANCHO_UTIL;
  const py = (v) => PAD.t + ALTO_UTIL - ((v - minY) / rangoY) * ALTO_UTIL;

  const tendencia = regresionLineal(puntos);
  const activos = puntos.filter((p) => p.activo);
  const cantidadEncima = activos.filter((p) => p.y > tendencia.valorEn(p.x)).length;
  const escala = vista.w / ANCHO;
  // los inactivos van primero, para que queden detrás
  const ordenados = [...puntos.map((p, i) => ({ ...p, i }))].sort((a, b) => Number(a.activo) - Number(b.activo));

  const mostrarTip = (contenido, cx, cy) => {
    const rect = svgRef.current.getBoundingClientRect();
    const v = vistaRef.current;
    setTip({
      contenido,
      left: ((cx - v.x) / v.w) * rect.width + 14,
      top: ((cy - v.y) / v.h) * rect.height - 10,
    });
  };

  const alApretar = (e) => {
    if (e.target.closest("[data-punto]") || e.target.closest("[data-tendencia]")) return;
    arrastre.current = { x: e.clientX, y: e.clientY, vista: vistaRef.current };
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastrando(true);
  };
  const alMover = (e) => {
    if (!arrastre.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const { x, y, vista: inicio } = arrastre.current;
    cambiarVista({
      ...inicio,
      x: inicio.x - ((e.clientX - x) / rect.width) * inicio.w,
      y: inicio.y - ((e.clientY - y) / rect.height) * inicio.h,
    });
  };
  const alSoltar = () => {
    arrastre.current = null;
    setArrastrando(false);
  };

  return (
    <>
      <div className={styles.marco} ref={contenedorRef}>
        <svg
          ref={svgRef}
          width="100%"
          viewBox={`${vista.x} ${vista.y} ${vista.w} ${vista.h}`}
          preserveAspectRatio="xMidYMid meet"
          className={styles.svg}
          style={{ cursor: arrastrando ? "grabbing" : "grab" }}
          onPointerDown={alApretar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
        >
          {[0, 1, 2, 3, 4].map((i) => {
            const v = minY + (rangoY * i) / 4;
            return (
              <g key={`h${i}`}>
                <line x1={PAD.l} y1={py(v)} x2={ANCHO - PAD.r} y2={py(v)} stroke="rgba(0,0,0,.06)" strokeWidth="0.5" />
                <text x={PAD.l - 6} y={py(v) + 3.5} textAnchor="end" {...TEXTO_EJE}>
                  {v.toFixed(decimalesY)}
                </text>
              </g>
            );
          })}
          {[0, 1, 2, 3, 4].map((i) => {
            const v = minX + (rangoX * i) / 4;
            return (
              <g key={`v${i}`}>
                <line x1={px(v)} y1={PAD.t} x2={px(v)} y2={ALTO - PAD.b} stroke="rgba(0,0,0,.06)" strokeWidth="0.5" />
                <text x={px(v)} y={ALTO - PAD.b + 14} textAnchor="middle" {...TEXTO_EJE}>
                  {v.toFixed(0)}
                </text>
              </g>
            );
          })}
          <text x={PAD.l + ANCHO_UTIL / 2} y={ALTO - 4} textAnchor="middle" {...TEXTO_TITULO}>
            {etiquetaX}
          </text>
          <text x={13} y={PAD.t + ALTO_UTIL / 2} textAnchor="middle" transform={`rotate(-90,13,${PAD.t + ALTO_UTIL / 2})`} {...TEXTO_TITULO}>
            {etiquetaY}
          </text>

          <line
            x1={px(minX)}
            y1={py(tendencia.valorEn(minX))}
            x2={px(maxX)}
            y2={py(tendencia.valorEn(maxX))}
            stroke="rgba(0,0,0,.25)"
            strokeWidth="1.5"
            strokeDasharray="6,4"
          />
          <line
            data-tendencia
            x1={px(minX)}
            y1={py(tendencia.valorEn(minX))}
            x2={px(maxX)}
            y2={py(tendencia.valorEn(maxX))}
            stroke="transparent"
            strokeWidth="14"
            style={{ cursor: "help" }}
            onPointerEnter={() => {
              const rect = svgRef.current.getBoundingClientRect();
              setTip({ contenido: textoTendencia, left: rect.width / 2 - 80, top: 10 });
            }}
            onPointerLeave={() => setTip(null)}
          />

          {ordenados.map((p) => {
            const cx = px(p.x);
            const cy = py(p.y);
            const residuo = p.y - tendencia.valorEn(p.x);
            const radioBase = (p.activo ? 5 : 4) * escala;
            const resaltado = encima === p.i;
            return (
              <g
                key={`${p.nombre}-${p.i}`}
                data-punto
                style={{ cursor: "pointer" }}
                onPointerEnter={() => {
                  setEncima(p.i);
                  mostrarTip(globito(p, residuo), cx, cy);
                }}
                onPointerLeave={() => {
                  setEncima(null);
                  setTip(null);
                }}
              >
                {p.activo ? (
                  <>
                    <circle
                      cx={cx.toFixed(1)}
                      cy={cy.toFixed(1)}
                      r={(resaltado ? radioBase * 1.6 : radioBase).toFixed(1)}
                      fill={color}
                      fillOpacity={resaltado ? 1 : 0.65}
                      stroke="#fff"
                      strokeWidth={(1.5 * escala).toFixed(1)}
                    />
                    <text x={(cx + 8).toFixed(1)} y={(cy - 5).toFixed(1)} fontSize={(8.5 * escala).toFixed(1)} fill="rgba(0,0,0,.5)" fontFamily="inherit">
                      {nombreCorto(p.nombre)}
                    </text>
                  </>
                ) : (
                  <circle
                    cx={cx.toFixed(1)}
                    cy={cy.toFixed(1)}
                    r={(resaltado ? radioBase * 1.6 : radioBase).toFixed(1)}
                    fill={color}
                    fillOpacity={resaltado ? 1 : 0.2}
                    stroke={color}
                    strokeOpacity="0.3"
                    strokeWidth="1"
                  />
                )}
              </g>
            );
          })}
        </svg>
        {tip && (
          <div className={styles.tip} style={{ left: tip.left, top: tip.top }}>
            {tip.contenido}
          </div>
        )}
        <div className={styles.zoom}>
          <button type="button" className={styles.botonZoom} onClick={() => zoom(1.4)} aria-label="Acercar">
            +
          </button>
          <button type="button" className={styles.botonZoom} onClick={() => zoom(1 / 1.4)} aria-label="Alejar">
            −
          </button>
          <button type="button" className={styles.botonReset} onClick={() => cambiarVista(INICIAL)}>
            Reset
          </button>
        </div>
      </div>
      <div className={styles.pie}>
        <div className={styles.resumen}>
          <span className={styles.tendencia}>
            <span className={styles.rayaPunteada} />
            Tendencia lineal
          </span>{" "}
          · <span style={{ color: colorEncima, fontWeight: 500 }}>{cantidadEncima} por encima</span> ·{" "}
          <span style={{ color: colorDebajo, fontWeight: 500 }}>{activos.length - cantidadEncima} por debajo</span>
        </div>
        <div className={styles.ayuda}>Scroll o botones para zoom · arrastrá para mover</div>
      </div>
    </>
  );
}
