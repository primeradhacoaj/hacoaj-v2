// Gráfico de barras verticales con grilla y valores arriba de cada barra,
// copiado de la v1.
//
// Props:
//   datos       [{ etiqueta, valor }]
//   color       color de las barras
//   decimales   decimales del valor mostrado arriba de la barra
//   decimalesEjes   decimales de los números del eje vertical
export default function BarChart({ datos, color = "#00296b", decimales = 0, decimalesEjes = 0, alto = 220 }) {
  if (datos.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", fontSize: 13, color: "rgba(0,0,0,.4)" }}>Sin datos</div>
    );
  }

  const maximo = Math.max(...datos.map((d) => d.valor), 0.01);
  const anchoBarra = 32;
  const separacion = 4;
  const inicioX = 40;
  const altoGrafico = alto - 50;
  const ancho = Math.max(500, inicioX + datos.length * (anchoBarra + separacion) + 10);

  const marcas = Array.from({ length: 5 }, (_, i) => maximo - (maximo / 4) * i);

  return (
    <svg width="100%" viewBox={`0 0 ${ancho} ${alto}`} style={{ display: "block" }}>
      {marcas.map((valor, i) => {
        const y = 10 + (altoGrafico / 4) * i;
        return (
          <g key={i}>
            <line x1={inicioX} y1={y} x2={inicioX + datos.length * (anchoBarra + separacion)} y2={y} stroke="#eceef2" />
            <text x={inicioX - 4} y={y + 3} fill="rgba(0,0,0,.45)" fontSize="10" textAnchor="end">
              {decimalesEjes > 0 ? valor.toFixed(decimalesEjes) : Math.round(valor)}
            </text>
          </g>
        );
      })}
      {datos.map((d, i) => {
        const altoBarra = (d.valor / maximo) * altoGrafico;
        const x = inicioX + i * (anchoBarra + separacion) + 2;
        const y = 10 + altoGrafico - altoBarra;
        const etiqueta = d.etiqueta.length > 12 ? `${d.etiqueta.slice(0, 11)}…` : d.etiqueta;
        return (
          <g key={d.etiqueta}>
            <rect x={x} y={y} width={anchoBarra} height={altoBarra} fill={color} rx="3">
              <title>{`${d.etiqueta}: ${d.valor.toFixed(decimales)}`}</title>
            </rect>
            <text x={x + anchoBarra / 2} y={y - 4} fill="rgba(0,0,0,.7)" fontSize="10" textAnchor="middle" fontWeight="500">
              {d.valor.toFixed(decimales)}
            </text>
            <text
              x={x + anchoBarra / 2}
              y={10 + altoGrafico + 12}
              fill="rgba(0,0,0,.6)"
              fontSize="9"
              textAnchor="middle"
              transform={`rotate(-35 ${x + anchoBarra / 2} ${10 + altoGrafico + 12})`}
            >
              {etiqueta}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
