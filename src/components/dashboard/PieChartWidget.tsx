import type { ChartData } from "@/modules/ai";

interface PieChartWidgetProps {
  data: ChartData;
}

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

export function PieChartWidget({ data }: PieChartWidgetProps) {
  const primaryDataset = data.datasets[0];
  if (!primaryDataset) return null;

  const total = primaryDataset.data.reduce((sum, v) => sum + v, 0) || 1;
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 70;

  let currentAngle = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-40 w-40 shrink-0"
      >
        {primaryDataset.data.map((value, i) => {
          const angle = (value / total) * 360;
          const start = currentAngle;
          const end = currentAngle + angle;
          const d = describeArc(cx, cy, radius, start, end);
          currentAngle = end;
          return (
            <path
              key={i}
              d={d}
              fill={COLORS[i % COLORS.length]}
              stroke="#ffffff"
              strokeWidth={2}
            />
          );
        })}
      </svg>
      <ul className="flex flex-wrap gap-3 text-xs sm:flex-col">
        {data.labels.map((label, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">
              {primaryDataset.data[i] ?? 0} ({Math.round(((primaryDataset.data[i] ?? 0) / total) * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
