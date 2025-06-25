import React from 'react';

const BoxPlot = ({ data, width = 400, height = 300, margin = { top: 20, right: 30, bottom: 40, left: 40 } }) => {
  if (!data || data.length === 0) return null;

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calcular estatísticas para cada grupo
  const groups = data.map(group => {
    const values = group.values.sort((a, b) => a - b);
    const n = values.length;
    
    const q1 = values[Math.floor(n * 0.25)];
    const median = n % 2 === 0 ? (values[n/2 - 1] + values[n/2]) / 2 : values[Math.floor(n/2)];
    const q3 = values[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    
    const min = Math.max(values[0], q1 - 1.5 * iqr);
    const max = Math.min(values[n-1], q3 + 1.5 * iqr);
    
    const outliers = values.filter(v => v < min || v > max);
    
    return {
      ...group,
      q1,
      median,
      q3,
      min,
      max,
      outliers
    };
  });

  // Escalas
  const allValues = data.flatMap(d => d.values);
  const yMin = Math.min(...allValues) * 0.9;
  const yMax = Math.max(...allValues) * 1.1;
  
  const xScale = (index) => (index + 0.5) * (chartWidth / data.length);
  const yScale = (value) => chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight;
  
  const boxWidth = Math.min(60, chartWidth / data.length * 0.6);

  return (
    <svg width={width} height={height}>
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {/* Eixos */}
        <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#e5e7eb" strokeWidth={1} />
        <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#e5e7eb" strokeWidth={1} />
        
        {/* Boxplots */}
        {groups.map((group, index) => {
          const x = xScale(index);
          const boxLeft = x - boxWidth / 2;
          const boxRight = x + boxWidth / 2;
          
          return (
            <g key={group.name}>
              {/* Linha vertical (min-max) */}
              <line
                x1={x}
                y1={yScale(group.min)}
                x2={x}
                y2={yScale(group.max)}
                stroke="#6b7280"
                strokeWidth={1}
              />
              
              {/* Linha min */}
              <line
                x1={boxLeft}
                y1={yScale(group.min)}
                x2={boxRight}
                y2={yScale(group.min)}
                stroke="#6b7280"
                strokeWidth={1}
              />
              
              {/* Linha max */}
              <line
                x1={boxLeft}
                y1={yScale(group.max)}
                x2={boxRight}
                y2={yScale(group.max)}
                stroke="#6b7280"
                strokeWidth={1}
              />
              
              {/* Caixa (Q1-Q3) */}
              <rect
                x={boxLeft}
                y={yScale(group.q3)}
                width={boxWidth}
                height={yScale(group.q1) - yScale(group.q3)}
                fill={group.color || '#3b82f6'}
                fillOpacity={0.7}
                stroke="#1f2937"
                strokeWidth={1}
              />
              
              {/* Mediana */}
              <line
                x1={boxLeft}
                y1={yScale(group.median)}
                x2={boxRight}
                y2={yScale(group.median)}
                stroke="#1f2937"
                strokeWidth={2}
              />
              
              {/* Outliers */}
              {group.outliers.map((outlier, outlierIndex) => (
                <circle
                  key={outlierIndex}
                  cx={x}
                  cy={yScale(outlier)}
                  r={3}
                  fill="#ef4444"
                  stroke="#dc2626"
                  strokeWidth={1}
                />
              ))}
              
              {/* Label */}
              <text
                x={x}
                y={chartHeight + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#374151"
              >
                {group.name}
              </text>
            </g>
          );
        })}
        
        {/* Eixo Y - labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const value = yMin + (yMax - yMin) * ratio;
          const y = yScale(value);
          return (
            <g key={ratio}>
              <line x1={-5} y1={y} x2={0} y2={y} stroke="#6b7280" strokeWidth={1} />
              <text x={-10} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">
                {value.toFixed(2)}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export default BoxPlot;

