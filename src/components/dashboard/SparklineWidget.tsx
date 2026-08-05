import type { ChartData } from "@/modules/ai";

interface SparklineWidgetProps {
  data: ChartData;
}

export function SparklineWidget({ data }: SparklineWidgetProps) {
  const primaryDataset = data.datasets[0];
  if (!primaryDataset) return null;

  const values = primaryDataset.data;
  const width = 200;
  const height = 60;
  const padding = 4;

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const xFor = (index: number) =>
    values.length <= 1
      ? width / 2
      : padding + (index / (values.length - 1)) * (width - padding * 2);

  const yFor = (value: number) =>
    height - padding - ((value - min) / range) * (height - padding * 2);

  const points = values.map((value, i) => `${xFor(i)},${yFor(value)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-14 w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <polyline
        fill="none"
        stroke={primaryDataset.color ?? "#2563eb"}
        strokeWidth={2}
        points={points}
      />
      {values.map((value, i) => (
        <circle
          key={i}
          cx={xFor(i)}
          cy={yFor(value)}
          r={2}
          fill={primaryDataset.color ?? "#2563eb"}
        />
      ))}
    </svg>
  );
}
