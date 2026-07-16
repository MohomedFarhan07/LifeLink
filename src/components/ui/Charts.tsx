interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: DataPoint[];
  height?: number;
  unit?: string;
}

const palette = ['#dc2626', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function BarChart({ data, height = 220, unit = '' }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-3" style={{ height }}>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 40);
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">
                {d.value}
                {unit}
              </span>
              <div
                className="w-full max-w-[48px] rounded-t-md transition-all duration-500 hover:opacity-80"
                style={{ height: Math.max(h, 4), backgroundColor: d.color || palette[i % palette.length] }}
                title={`${d.label}: ${d.value}${unit}`}
              />
              <span className="text-xs text-slate-500">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DonutChartProps {
  data: DataPoint[];
  size?: number;
}

export function DonutChart({ data, size = 180 }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = size / 2;
  const strokeWidth = 28;
  const circumference = 2 * Math.PI * (radius - strokeWidth / 2);
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="shrink-0">
        <circle cx={radius} cy={radius} r={radius - strokeWidth / 2} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        {data.map((d, i) => {
          const fraction = d.value / total;
          const dash = fraction * circumference;
          const seg = (
            <circle
              key={d.label}
              cx={radius}
              cy={radius}
              r={radius - strokeWidth / 2}
              fill="none"
              stroke={d.color || palette[i % palette.length]}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${radius} ${radius})`}
              className="transition-all duration-500"
            />
          );
          offset += dash;
          return seg;
        })}
        <text x={radius} y={radius - 4} textAnchor="middle" className="fill-slate-900 text-2xl font-bold">
          {total}
        </text>
        <text x={radius} y={radius + 14} textAnchor="middle" className="fill-slate-400 text-xs">
          Total
        </text>
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: d.color || palette[i % palette.length] }} />
            <span className="text-sm text-slate-600">{d.label}</span>
            <span className="ml-auto text-sm font-semibold text-slate-900">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LineChartProps {
  data: DataPoint[];
  height?: number;
}

export function LineChart({ data, height = 200 }: LineChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const width = 100;
  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - 30 - (d.value / max) * (height - 50);
    return `${x},${y}`;
  });
  const areaPoints = `0,${height - 30} ${points.join(' ')} ${width},${height - 30}`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#lineGrad)" />
        <polyline points={points.join(' ')} fill="none" stroke="#dc2626" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => {
          const x = (i / Math.max(data.length - 1, 1)) * width;
          const y = height - 30 - (d.value / max) * (height - 50);
          return <circle key={i} cx={x} cy={y} r="1.5" fill="#dc2626" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="flex justify-between px-1">
        {data.map((d) => (
          <span key={d.label} className="text-xs text-slate-500">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
