// Mini gráfico de línea con relleno, copiado de la v1. `datos` puede traer
// huecos (null); se ignoran para trazar la línea.
export default function Sparkline({ datos, ancho = 180, alto = 28, color = "#00296b" }) {
  const valores = datos.filter((v) => v != null);
  if (valores.length < 2) return null;

  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const rango = maximo - minimo || 1;
  const puntos = valores.map((v, i) => [
    (i / (valores.length - 1)) * ancho,
    alto - ((v - minimo) / rango) * (alto - 4) - 2,
  ]);
  const linea = puntos.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${linea} L${ancho},${alto} L0,${alto} Z`;
  const [ultimoX, ultimoY] = puntos[puntos.length - 1];

  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden="true">
      <path d={area} fill={color} fillOpacity="0.08" />
      <path d={linea} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ultimoX.toFixed(1)} cy={ultimoY.toFixed(1)} r="2.2" fill={color} />
    </svg>
  );
}
