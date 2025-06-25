import React from 'react';

const HeatMap = ({ data, width = 600, height = 400, margin = { top: 40, right: 100, bottom: 60, left: 100 } }) => {
  if (!data || data.length === 0) return null;

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Extrair categorias únicas
  const xCategories = [...new Set(data.map(d => d.x))];
  const yCategories = [...new Set(data.map(d => d.y))];
  
  // Escalas
  const cellWidth = chartWidth / xCategories.length;
  const cellHeight = chartHeight / yCategories.length;
  
  // Encontrar min/max para escala de cores
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  // Função para cor baseada no valor
  const getColor = (value) => {
    const normalized = (value - minValue) / (maxValue - minValue);
    const intensity = Math.floor(normalized * 255);
    return `rgb(${255 - intensity}, ${255 - intensity * 0.5}, 255)`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height}>
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Células do heatmap */}
          {data.map((cell, index) => {
            const x = xCategories.indexOf(cell.x) * cellWidth;
            const y = yCategories.indexOf(cell.y) * cellHeight;
            
            return (
              <g key={index}>
                <rect
                  x={x}
                  y={y}
                  width={cellWidth}
                  height={cellHeight}
                  fill={getColor(cell.value)}
                  stroke="#ffffff"
                  strokeWidth={1}
                />
                <text
                  x={x + cellWidth / 2}
                  y={y + cellHeight / 2 + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#1f2937"
                  fontWeight="bold"
                >
                  {cell.value.toFixed(2)}
                </text>
              </g>
            );
          })}
          
          {/* Labels do eixo X */}
          {xCategories.map((category, index) => (
            <text
              key={category}
              x={index * cellWidth + cellWidth / 2}
              y={chartHeight + 20}
              textAnchor="middle"
              fontSize="12"
              fill="#374151"
            >
              {category}
            </text>
          ))}
          
          {/* Labels do eixo Y */}
          {yCategories.map((category, index) => (
            <text
              key={category}
              x={-10}
              y={index * cellHeight + cellHeight / 2 + 4}
              textAnchor="end"
              fontSize="12"
              fill="#374151"
            >
              {category}
            </text>
          ))}
        </g>
      </svg>
      
      {/* Legenda */}
      <div className="mt-4 flex items-center gap-4">
        <span className="text-sm text-gray-600">Baixo</span>
        <div className="flex">
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <div
              key={ratio}
              className="w-6 h-4"
              style={{ backgroundColor: getColor(minValue + (maxValue - minValue) * ratio) }}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600">Alto</span>
        <span className="text-sm text-gray-500 ml-4">
          ({minValue.toFixed(2)} - {maxValue.toFixed(2)} kg/dia)
        </span>
      </div>
    </div>
  );
};

export default HeatMap;

