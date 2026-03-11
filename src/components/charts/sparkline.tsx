"use client";

import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
  referenceLow?: number;
  referenceHigh?: number;
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 28,
  color = "var(--accent-teal)",
  showDots = false,
  referenceLow,
  referenceHigh,
  className,
}: SparklineProps) {
  if (data.length < 2) return null;

  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Scale points to fit within the chart area
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return { x, y, value };
  });

  const pathData = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  // Reference band
  let refBand = null;
  if (referenceLow != null && referenceHigh != null) {
    const yLow = padding + chartHeight - ((referenceLow - min) / range) * chartHeight;
    const yHigh = padding + chartHeight - ((referenceHigh - min) / range) * chartHeight;
    const clampedYLow = Math.min(Math.max(yHigh, padding), height - padding);
    const clampedYHigh = Math.min(Math.max(yLow, padding), height - padding);
    refBand = (
      <rect
        x={padding}
        y={clampedYLow}
        width={chartWidth}
        height={Math.max(0, clampedYHigh - clampedYLow)}
        fill="var(--accent-green)"
        opacity={0.08}
        rx={1}
      />
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0", className)}
      aria-label="Sparkline chart"
    >
      {refBand}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDots &&
        points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 2.5 : 1.5}
            fill={i === points.length - 1 ? color : "transparent"}
            stroke={color}
            strokeWidth={1}
          />
        ))}
    </svg>
  );
}
