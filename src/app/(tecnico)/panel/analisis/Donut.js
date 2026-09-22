// Gráfico de dona (distribución por posición), copiado de la v1.
//
// Props:
//   datos    [{ etiqueta, valor, color }]
export default function Donut({ datos, tamano = 140, grosor = 22 }) {
  const total = datos.reduce((suma, d) => suma + d.valor, 0);
  if (total === 0) return null;

  const radio = tamano / 2 - grosor / 2;
  const centro = tamano / 2;

  // Ángulo acumulado al empezar cada tramo (el de después de cada uno).
  const acumulados = datos.reduce((lista, d) => [...lista, lista[lista.length - 1] + d.valor], [0]);

  const tramos = datos.map((d, indice) => {
    const inicio = (acumulados[indice] / total) * 2 * Math.PI - Math.PI / 2;
    const fin = (acumulados[indice + 1] / total) * 2 * Math.PI - Math.PI / 2;
    const grande = fin - inicio > Math.PI ? 1 : 0;
    const x1 = centro + radio * Math.cos(inicio);
    const y1 = centro + radio * Math.sin(inicio);
    const x2 = centro + radio * Math.cos(fin);
    const y2 = centro + radio * Math.sin(fin);
    return { ...d, camino: `M${x1},${y1} A${radio},${radio} 0 ${grande} 1 ${x2},${y2}` };
  });

  return (
    <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`} role="img" aria-label="Distribución por posición">
      {tramos.map((t) => (
        <path key={t.etiqueta} d={t.camino} stroke={t.color} strokeWidth={grosor} fill="none" />
      ))}
      <text x={centro} y={centro - 2} textAnchor="middle" fontSize="22" fontWeight="600" fill="#0a1535">
        {total}
      </text>
      <text x={centro} y={centro + 14} textAnchor="middle" fontSize="10" fill="rgba(0,0,0,.55)">
        jugadores
      </text>
    </svg>
  );
}
