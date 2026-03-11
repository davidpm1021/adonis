"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrendChartDataPoint {
  date: string;
  value: number | null;
}

export interface TrendChartReferenceLine {
  value: number;
  label: string;
  color: string;
  dashed?: boolean;
}

export interface TrendChartReferenceBand {
  y1: number;
  y2: number;
  color: string;
  label: string;
}

interface TrendChartProps {
  data: TrendChartDataPoint[];
  referenceLines?: TrendChartReferenceLine[];
  referenceBands?: TrendChartReferenceBand[];
  yAxisLabel?: string;
  color: string;
  height?: number;
  yDomain?: [number | "auto", number | "auto"];
  showDots?: boolean;
  strokeWidth?: number;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayload {
  value: number;
  dataKey: string;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0 || !label) return null;

  let formattedDate: string;
  try {
    formattedDate = format(parseISO(label), "MMM d, yyyy");
  } catch {
    formattedDate = label;
  }

  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2 shadow-lg">
      <p className="mb-1 font-display text-xs text-text-muted">{formattedDate}</p>
      {payload.map((entry, i) => (
        <p
          key={i}
          className="font-display text-sm tabular-nums"
          style={{ color: entry.color }}
        >
          {entry.value != null ? Number(entry.value).toFixed(1) : "—"}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TrendChart({
  data,
  referenceLines = [],
  referenceBands = [],
  yAxisLabel,
  color,
  height = 280,
  yDomain,
  showDots = true,
  strokeWidth = 2,
}: TrendChartProps) {
  // Format X-axis tick labels
  const formatXTick = (value: string) => {
    try {
      return format(parseISO(value), "M/d");
    } catch {
      return value;
    }
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#1e1e30"
          vertical={false}
        />

        {/* Reference bands (drawn behind everything) */}
        {referenceBands.map((band, i) => (
          <ReferenceArea
            key={`band-${i}`}
            y1={band.y1}
            y2={band.y2}
            fill={band.color}
            fillOpacity={0.1}
            label={{
              value: band.label,
              position: "insideTopRight",
              fill: band.color,
              fontSize: 10,
              fontFamily: "var(--font-display)",
              opacity: 0.6,
            }}
          />
        ))}

        <XAxis
          dataKey="date"
          tick={{ fill: "#8b8b9e", fontSize: 10, fontFamily: "var(--font-display)" }}
          tickLine={false}
          axisLine={{ stroke: "#1e1e30" }}
          tickFormatter={formatXTick}
          interval="preserveStartEnd"
          minTickGap={40}
        />

        <YAxis
          tick={{ fill: "#8b8b9e", fontSize: 10, fontFamily: "var(--font-display)" }}
          tickLine={false}
          axisLine={false}
          domain={yDomain || ["auto", "auto"]}
          width={48}
          label={
            yAxisLabel
              ? {
                  value: yAxisLabel,
                  angle: -90,
                  position: "insideLeft",
                  fill: "#8b8b9e",
                  fontSize: 10,
                  fontFamily: "var(--font-display)",
                  dx: -4,
                }
              : undefined
          }
        />

        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: "#8b8b9e", strokeDasharray: "3 3" }}
        />

        {/* Reference lines */}
        {referenceLines.map((line, i) => (
          <ReferenceLine
            key={`line-${i}`}
            y={line.value}
            stroke={line.color}
            strokeDasharray={line.dashed !== false ? "6 4" : undefined}
            label={{
              value: line.label,
              position: "insideTopRight",
              fill: line.color,
              fontSize: 10,
              fontFamily: "var(--font-display)",
            }}
          />
        ))}

        {/* Main data line */}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={strokeWidth}
          dot={
            showDots
              ? {
                  r: 3,
                  fill: color,
                  stroke: "#12121a",
                  strokeWidth: 2,
                }
              : false
          }
          activeDot={{
            r: 5,
            fill: color,
            stroke: "#12121a",
            strokeWidth: 2,
          }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Dual-Line variant (for Blood Pressure: systolic + diastolic)
// ---------------------------------------------------------------------------

export interface DualLineDataPoint {
  date: string;
  value1: number | null;
  value2: number | null;
}

interface DualLineChartProps {
  data: DualLineDataPoint[];
  line1Label: string;
  line2Label: string;
  color1: string;
  color2: string;
  referenceLines?: TrendChartReferenceLine[];
  referenceBands?: TrendChartReferenceBand[];
  yAxisLabel?: string;
  height?: number;
  yDomain?: [number | "auto", number | "auto"];
}

function DualLineTooltip({
  active,
  payload,
  label,
  line1Label,
  line2Label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  line1Label: string;
  line2Label: string;
}) {
  if (!active || !payload || payload.length === 0 || !label) return null;

  let formattedDate: string;
  try {
    formattedDate = format(parseISO(label), "MMM d, yyyy");
  } catch {
    formattedDate = label;
  }

  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2 shadow-lg">
      <p className="mb-1 font-display text-xs text-text-muted">{formattedDate}</p>
      {payload.map((entry, i) => {
        const entryLabel = entry.dataKey === "value1" ? line1Label : line2Label;
        return (
          <p
            key={i}
            className="font-display text-sm tabular-nums"
            style={{ color: entry.color }}
          >
            {entryLabel}: {entry.value != null ? Math.round(entry.value) : "—"}
          </p>
        );
      })}
    </div>
  );
}

export function DualLineChart({
  data,
  line1Label,
  line2Label,
  color1,
  color2,
  referenceLines = [],
  referenceBands = [],
  yAxisLabel,
  height = 280,
  yDomain,
}: DualLineChartProps) {
  const formatXTick = (value: string) => {
    try {
      return format(parseISO(value), "M/d");
    } catch {
      return value;
    }
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#1e1e30"
          vertical={false}
        />

        {referenceBands.map((band, i) => (
          <ReferenceArea
            key={`band-${i}`}
            y1={band.y1}
            y2={band.y2}
            fill={band.color}
            fillOpacity={0.08}
            label={{
              value: band.label,
              position: "insideTopRight",
              fill: band.color,
              fontSize: 10,
              fontFamily: "var(--font-display)",
              opacity: 0.6,
            }}
          />
        ))}

        <XAxis
          dataKey="date"
          tick={{ fill: "#8b8b9e", fontSize: 10, fontFamily: "var(--font-display)" }}
          tickLine={false}
          axisLine={{ stroke: "#1e1e30" }}
          tickFormatter={formatXTick}
          interval="preserveStartEnd"
          minTickGap={40}
        />

        <YAxis
          tick={{ fill: "#8b8b9e", fontSize: 10, fontFamily: "var(--font-display)" }}
          tickLine={false}
          axisLine={false}
          domain={yDomain || ["auto", "auto"]}
          width={48}
          label={
            yAxisLabel
              ? {
                  value: yAxisLabel,
                  angle: -90,
                  position: "insideLeft",
                  fill: "#8b8b9e",
                  fontSize: 10,
                  fontFamily: "var(--font-display)",
                  dx: -4,
                }
              : undefined
          }
        />

        <Tooltip
          content={
            <DualLineTooltip line1Label={line1Label} line2Label={line2Label} />
          }
          cursor={{ stroke: "#8b8b9e", strokeDasharray: "3 3" }}
        />

        {referenceLines.map((line, i) => (
          <ReferenceLine
            key={`line-${i}`}
            y={line.value}
            stroke={line.color}
            strokeDasharray={line.dashed !== false ? "6 4" : undefined}
            label={{
              value: line.label,
              position: "insideTopRight",
              fill: line.color,
              fontSize: 10,
              fontFamily: "var(--font-display)",
            }}
          />
        ))}

        <Line
          type="monotone"
          dataKey="value1"
          name={line1Label}
          stroke={color1}
          strokeWidth={2}
          dot={{ r: 3, fill: color1, stroke: "#12121a", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: color1, stroke: "#12121a", strokeWidth: 2 }}
          connectNulls
        />

        <Line
          type="monotone"
          dataKey="value2"
          name={line2Label}
          stroke={color2}
          strokeWidth={2}
          dot={{ r: 3, fill: color2, stroke: "#12121a", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: color2, stroke: "#12121a", strokeWidth: 2 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
