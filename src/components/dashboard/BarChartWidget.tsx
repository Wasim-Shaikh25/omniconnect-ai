import type { ChartData } from "@/modules/ai";

interface BarChartWidgetProps {
  data: ChartData;
}

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"];

export function BarChartWidget({ data }: BarChartWidgetProps) {
  const width = 400;
  const height = 160;
  const padding = { top: 10, right: 10, bottom: 32, left: 32 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = data.datasets.flatMap((d) => d.data);
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const range = max - min || 1;

  const groupWidth = chartWidth / data.labels.length;
  const barGap = 2;
  const barWidth =
    (groupWidth - barGap * (data.datasets.length + 1)) / data.datasets.length;

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

      {/* Bars */}
      {data.labels.map((label, groupIndex) => (
        <g key={groupIndex}>
          {data.datasets.map((dataset, datasetIndex) => {
            const value = dataset.data[groupIndex] ?? 0;
            const x =
              padding.left +
              groupIndex * groupWidth +
              barGap +
              datasetIndex * (barWidth + barGap);
            const y = yFor(value);
            const h = yFor(min) - y;
            return (
              <rect
                key={datasetIndex}
                x={x}
                y={y}
                width={Math.max(barWidth, 1)}
                height={Math.max(h, 0)}
                fill={dataset.color ?? COLORS[datasetIndex % COLORS.length]}
                rx={2}
              />
            );
          })}
          <text
            x={padding.left + groupIndex * groupWidth + groupWidth / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize="10"
            fill="#6b7280"
          >
            {label.slice(0, 6)}
          </text>
        </g>
      ))}
    </svg>
  );
}
