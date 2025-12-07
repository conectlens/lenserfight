
import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';

interface ChartDataPoint {
  label: string;
  value: number;
}

interface ChartProps {
  data: ChartDataPoint[];
  color?: string;
  height?: number;
  className?: string;
}

// Helper to get max value for scaling
const getMax = (data: ChartDataPoint[]) => Math.max(...data.map(d => d.value)) * 1.1;

export const AreaChart: React.FC<ChartProps> = ({ data, color = '#3b82f6', height = 200, className = '' }) => {
  const { theme } = useTheme();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  
  const max = useMemo(() => getMax(data) || 10, [data]);
  const points = useMemo(() => {
    return data.map((d, i) => ({
      x: (i / (data.length - 1)) * 100,
      y: 100 - (d.value / max) * 100,
      ...d
    }));
  }, [data, max]);

  const pathD = points.length > 0 
    ? `M 0,${points[0].y} ` + points.map(p => `L ${p.x},${p.y}`).join(' ') 
    : '';

  const areaD = pathD + ` L 100,100 L 0,100 Z`;

  return (
    <div className={`relative w-full select-none ${className}`} style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        {/* Grid Lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <line 
            key={y} 
            x1="0" 
            y1={y} 
            x2="100" 
            y2={y} 
            stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} 
            strokeWidth="0.5" 
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Area Fill */}
        <path d={areaD} fill={color} fillOpacity="0.15" />
        
        {/* Stroke Line */}
        <path 
          d={pathD} 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          vectorEffect="non-scaling-stroke" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />

        {/* Hover Points (Invisible hit targets) */}
        {points.map((p, i) => (
          <g key={i}>
             {/* Visible Dot on Hover */}
             <circle 
                cx={p.x} 
                cy={p.y} 
                r={hoverIndex === i ? 4 : 0} 
                fill={theme === 'dark' ? '#1f2937' : '#fff'} 
                stroke={color}
                strokeWidth={2}
                className="transition-all duration-200"
                vectorEffect="non-scaling-stroke"
             />
             {/* Hit Area */}
             <rect
                x={p.x - 2} 
                y="0" 
                width="4" 
                height="100" 
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                className="cursor-crosshair"
             />
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hoverIndex !== null && (
        <div 
            className="absolute top-0 pointer-events-none bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-lg transform -translate-x-1/2 -translate-y-full mb-2 z-10"
            style={{ left: `${points[hoverIndex].x}%`, top: `${points[hoverIndex].y}%`, marginTop: '-10px' }}
        >
            <div className="font-bold">{points[hoverIndex].value}</div>
            <div className="text-gray-400 text-[10px]">{points[hoverIndex].label}</div>
        </div>
      )}
    </div>
  );
};

export const BarChart: React.FC<ChartProps> = ({ data, color = '#10b981', height = 200, className = '' }) => {
  const { theme } = useTheme();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  
  const max = useMemo(() => getMax(data) || 10, [data]);
  const barWidth = 100 / data.length;
  const gap = barWidth * 0.2;
  const actualWidth = barWidth - gap;

  return (
    <div className={`relative w-full select-none ${className}`} style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
         {/* Grid Lines */}
         {[0, 25, 50, 75, 100].map(y => (
          <line 
            key={y} 
            x1="0" 
            y1={y} 
            x2="100" 
            y2={y} 
            stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} 
            strokeWidth="0.5" 
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {data.map((d, i) => {
            const h = (d.value / max) * 100;
            const x = i * barWidth + (gap / 2);
            return (
                <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                    <rect
                        x={x}
                        y={100 - h}
                        width={actualWidth}
                        height={h}
                        fill={color}
                        rx="1" // Rounded top roughly
                        opacity={hoverIndex === i ? 1 : 0.8}
                        className="transition-opacity duration-200"
                    />
                </g>
            );
        })}
      </svg>

      {/* Tooltip */}
      {hoverIndex !== null && (
        <div 
            className="absolute pointer-events-none bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-lg transform -translate-x-1/2 -translate-y-full z-10"
            style={{ 
                left: `${(hoverIndex * barWidth) + (barWidth / 2)}%`, 
                top: `${100 - (data[hoverIndex].value / max) * 100}%`,
                marginTop: '-8px'
            }}
        >
            <div className="font-bold">{data[hoverIndex].value}</div>
            <div className="text-gray-400 text-[10px]">{data[hoverIndex].label}</div>
        </div>
      )}
    </div>
  );
};
