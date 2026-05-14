import './LineChart.css';

interface LineSeries {
  data: (number | null | string)[];
  color: string;
  label: string;
  showLine?: boolean; // New property to toggle line drawing
}

interface Props {
  lines: LineSeries[];
  labels: string[];
  title: string;
}

export function LineChart({ lines, labels, title }: Props) {
  if (!lines || lines.length === 0) return null;

  const width = 400;
  const height = 180;
  const paddingLeft = 30;
  const paddingRight = 10;
  const paddingTop = 20;
  const paddingBottom = 20;

  let maxVal = -Infinity;
  let minVal = Infinity;
  lines.forEach(line => {
    line.data.forEach(val => {
      const numVal = typeof val === 'string' ? parseFloat(val) : val;
      if (numVal !== null && !isNaN(numVal)) {
        if (numVal > maxVal) maxVal = numVal;
        if (numVal < minVal) minVal = numVal;
      }
    });
  });

  if (maxVal === -Infinity) {
    maxVal = 10;
    minVal = 0;
  } else {
    maxVal = Math.ceil(maxVal) + 1;
    minVal = Math.max(0, Math.floor(minVal) - 1);
  }

  const getX = (index: number, total: number) => paddingLeft + (index * (width - paddingLeft - paddingRight)) / (total - 1 || 1);
  const getY = (val: number) => height - paddingBottom - ((val - minVal) / (maxVal - minVal || 1)) * (height - paddingTop - paddingBottom);

  const ySteps = [];
  for (let i = minVal; i <= maxVal; i++) {
    ySteps.push(i);
  }

  return (
    <div className="line-chart-container">
      <div className="chart-title">{title}</div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* Y-axis grid lines and labels */}
        {ySteps.map((step, i) => {
          const y = getY(step);
          return (
            <g key={`y-${i}`}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray={step === 0 ? "0" : "4 4"} />
              <text x={paddingLeft - 5} y={y + 3} fill="var(--text-secondary)" fontSize="10" textAnchor="end">{step}</text>
            </g>
          );
        })}
        
        {/* Lines and Dots */}
        {lines.map((line, lineIndex) => {
          const validPoints = line.data.map((val, i) => {
            const numVal = typeof val === 'string' ? parseFloat(val) : val;
            return numVal !== null && !isNaN(numVal) ? { x: getX(i, labels.length), y: getY(numVal), val: numVal, i } : null;
          }).filter(p => p !== null) as {x: number, y: number, val: number, i: number}[];
          
          if (validPoints.length === 0) return null;

          const pathD = validPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

          return (
            <g key={lineIndex}>
              {line.showLine !== false && (
                <path d={pathD} fill="none" stroke={line.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />
              )}
              {validPoints.map((p, i) => (
                <circle 
                  key={i} 
                  cx={p.x} 
                  cy={p.y} 
                  r={line.showLine === false ? "4" : "2"} 
                  fill={line.showLine === false ? "transparent" : line.color} 
                  stroke={line.color} 
                  strokeWidth="2" 
                  opacity={line.showLine === false ? "1" : "0.8"}
                >
                  <title>{`${labels[p.i] || `Point ${p.i + 1}`}: ${p.val.toFixed(1)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        
        {/* X-axis labels */}
        {labels.map((label, i) => {
          if (!label) return null;
          const x = getX(i, labels.length);
          return <text key={`x-${i}`} x={x} y={height - 2} fill="var(--text-secondary)" fontSize="10" textAnchor="middle">{label}</text>;
        })}
      </svg>
      
      {/* Legend */}
      <div className="chart-legend">
        {lines.map((line, i) => (
          <div key={i} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: line.color, border: line.showLine === false ? `2px solid ${line.color}` : 'none', background: line.showLine === false ? 'transparent' : line.color }}></span>
            {line.label}
          </div>
        ))}
      </div>
    </div>
  );
}
