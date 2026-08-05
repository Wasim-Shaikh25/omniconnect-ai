import type { ChartData } from "@/modules/ai";

interface LineChartWidgetProps {
  data: ChartData;
}

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"];

export function LineChartWidget({ data }: LineChartWidgetProps) {
  const width = 400;
  const height = 160;
  const padding = { top: 10, right: 10, bottom: 24, left: 32 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = data.datasets.flatMap((d) => d.data);
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const range = max - min || 1;

  const xFor = (index: number) =>
    data.labels.length <= 1
      ? padding.left + chartWidth / 2
      : padding.left + (index / (data.labels.length - 1)) * chartWidth;

  const yFor = (value: number) =>
    padding.top + chartHeight - ((value - min) / range) * chartHeight;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-48 w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Y-axis ticks */}
      {[0, 0.5, 1].map((t) => {
        const value = min + t * range;
        const y = yFor(value);
        return (
          <g key={t}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#e5e7eb"
              strokeDasharray="4 2"
            />
            <text
              x={padding.left - 4}
              y={y + 3}
              textAnchor="end"
              fontSize="10"
              fill="#6b7280"
            >
              {Math.round(value)}
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {data.labels.map((label, i) => (
        <text
          key={i}
          x={xFor(i)}
          y={height - 4}
          textAnchor="middle"
          fontSize="10"
          fill="#6b7280"
        >
          {label.slice(0, 8)}
        </text>
      ))}

      {/* Lines */}
      {data.datasets.map((dataset, di) => {
        const points = dataset.data
          .map((value, i) => `${xFor(i)},${yFor(value)}`)
          .join(" ");
        return (
          <g key={di}>
            <polyline
              fill="none"
              stroke={dataset.color ?? COLORS[di % COLORS.length]}
              strokeWidth={2}
              points={points}
            />
            {dataset.data.map((value, i) => (
              <circle
                key={i}
                cx={xFor(i)}
                cy={yFor(value)}
                r={3}
                fill={dataset.color ?? COLORS[di % COLORS.length]}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
