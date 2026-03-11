"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { TrendingUp } from "lucide-react";

interface ExerciseHistoryPoint {
  date: string;
  totalVolume: number;
  maxWeight: number;
  sets: number;
  reps: number;
}

interface ExerciseProgressProps {
  exerciseName: string;
  history: ExerciseHistoryPoint[];
}

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
    formattedDate = format(parseISO(label), "MMM d");
  } catch {
    formattedDate = label;
  }

  const vol = payload.find((p) => p.dataKey === "totalVolume");

  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2 shadow-lg">
      <p className="font-display text-[10px] text-text-muted mb-1">
        {formattedDate}
      </p>
      {vol && (
        <p className="font-display text-xs tabular-nums text-accent-teal">
          {vol.value.toLocaleString()} lbs volume
        </p>
      )}
    </div>
  );
}

export function ExerciseProgress({
  exerciseName,
  history,
}: ExerciseProgressProps) {
  const trend = useMemo(() => {
    if (history.length < 2) return null;
    const first = history[0].totalVolume;
    const last = history[history.length - 1].totalVolume;
    if (first === 0) return null;
    return Math.round(((last - first) / first) * 100);
  }, [history]);

  if (history.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-display text-xs font-semibold text-text-primary truncate">
          {exerciseName}
        </h4>
        {trend !== null && (
          <span className="flex items-center gap-1 font-display text-[10px] tabular-nums text-accent-teal shrink-0">
            <TrendingUp className="h-3 w-3" />
            {trend > 0 ? "+" : ""}
            {trend}%
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart
          data={history}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1e1e30"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{
              fill: "#8b8b9e",
              fontSize: 9,
              fontFamily: "var(--font-display)",
            }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => {
              try {
                return format(parseISO(v), "M/d");
              } catch {
                return v;
              }
            }}
            interval="preserveStartEnd"
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar
            dataKey="totalVolume"
            fill="#00e5c7"
            radius={[2, 2, 0, 0]}
            maxBarSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
