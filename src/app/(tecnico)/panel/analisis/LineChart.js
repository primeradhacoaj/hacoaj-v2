// Gráfico de línea con grilla y ejes, copiado de la v1 (evolución de una
// métrica en el tiempo). Soporta una o varias series superpuestas.
//
// Props:
//   series    [{ nombre, color, puntos: [{ fecha, valor }] }] — cada serie ya
//             viene en orden cronológico; los huecos (valor null) se saltean.
//   decimales cantidad de decimales de los valores del eje Y
export default function LineChart({ series, ancho = 480, alto = 260, decimales = 2 }) {
  const fechas = [...new Set(series.flatMap((s) => s.puntos.filter((p) => p.valor != null).map((p) => p.fecha)))];
  const valores = series.flatMap((s) => s.puntos.map((p) => p.valor)).filter((v) => v != null);

  if (fechas.length < 2 || valores.length < 2) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "rgba(0,0,0,.4)" }}>
        Sin datos suficientes
      </div>
    );
  }

  const padding = { arriba: 20, abajo: 28, izquierda: 46, derecha: 16 };
  const anchoUtil = ancho - padding.izquierda - padding.derecha;
  const altoUtil = alto - padding.arriba - padding.abajo;
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const rango = maximo - minimo || 1;

  const x = (indice) => padding.izquierda + (indice / (fechas.length - 1)) * anchoUtil;
  const y = (valor) => padding.arriba + altoUtil - ((valor - minimo) / rango) * altoUtil;

  const lineasY = Array.from({ length: 5 }, (_, i) => minimo + (rango * i) / 4);
  const paso = Math.max(1, Math.floor(fechas.length / 6));

  return (
    <svg width="100%" viewBox={`0 0 ${ancho} ${alto}`} style={{ display: "block", overflow: "visible" }}>
      {lineasY.map((v) => (
        <g key={v}>
          <line
            x1={padding.izquierda}
            y1={y(v)}
            x2={ancho - padding.derecha}
            y2={y(v)}
            stroke="rgba(0,0,0,.07)"
          />
          <text x={padding.izquierda - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="rgba(0,0,0,.45)">
            {v.toFixed(decimales)}
          </text>
        </g>
      ))}
      {fechas.map(
        (f, i) =>
          (i % paso === 0 || i === fechas.length - 1) && (
            <text key={f} x={x(i)} y={alto - 4} textAnchor="middle" fontSize="10" fill="rgba(0,0,0,.45)">
              {f}
            </text>
          ),
      )}
      {series.map((serie) => {
        const puntos = fechas
          .map((f, i) => {
            const punto = serie.puntos.find((p) => p.fecha === f);
            return punto && punto.valor != null ? { i, valor: punto.valor } : null;
          })
          .filter(Boolean);
        if (puntos.length === 0) return null;
        const linea = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
        return (
          <g key={serie.nombre}>
            <path d={linea} fill="none" stroke={serie.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {puntos.map((p) => (
              <circle key={p.i} cx={x(p.i).toFixed(1)} cy={y(p.valor).toFixed(1)} r="3.5" fill={serie.color} stroke="#fff" strokeWidth="1.5">
                <title>
                  {fechas[p.i]}: {p.valor.toFixed(decimales)}
                </title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
