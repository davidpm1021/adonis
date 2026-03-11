"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TestTubes } from "lucide-react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { LAB_BIOMARKERS } from "@/lib/constants";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";

export interface LabEntry {
  id: number;
  date: string;
  testName: string;
  value: number;
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  flag: string | null;
}

interface LabTrajectoryProps {
  labs: LabEntry[];
  loading?: boolean;
}

// Focus biomarkers for the trajectory chart
const FOCUS_BIOMARKERS = [
  "Fasting Glucose",
  "Total Testosterone",
  "ALT",
  "Triglycerides",
  "HDL",
];

const BIOMARKER_COLORS: Record<string, string> = {
  "Fasting Glucose": "#00e5c7",
  "Total Testosterone": "#f59e0b",
  ALT: "#ef4444",
  Triglycerides: "#60a5fa",
  HDL: "#22c55e",
};

interface TooltipPayloadItem {
  value: number;
  dataKey: string;
  name: string;
  color: string;
}

function NormalizedTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
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
          className="font-display text-xs tabular-nums"
          style={{ color: entry.color }}
        >
          {entry.name}: {entry.value != null ? `${entry.value.toFixed(0)}%` : "--"}
        </p>
      ))}
    </div>
  );
}

/**
 * Normalize a lab value to a percentage of optimal range.
 *
 * 100% = value is at the midpoint of the reference range (ideal).
 * Values outside the range scale below 100% or above 100%.
 * For "lower is better" markers (low=0), we treat close to low as better.
 */
function normalizeToOptimal(
  value: number,
  low: number,
  high: number
): number {
  if (high === low) return 100;

  const mid = (low + high) / 2;
  const halfRange = (high - low) / 2;

  // Distance from midpoint relative to half-range
  const dist = Math.abs(value - mid) / halfRange;

  // 100% at midpoint, decreasing linearly; clamp to 0-150
  const pct = Math.max(0, Math.min(150, (1 - dist) * 100));
  return Math.round(pct);
}

export function LabTrajectory({ labs, loading }: LabTrajectoryProps) {
  const { chartData, availableBiomarkers } = useMemo(() => {
    // Group labs by test name and date
    const byTest: Record<string, { date: string; value: number }[]> = {};

    for (const lab of labs) {
      if (!FOCUS_BIOMARKERS.includes(lab.testName)) continue;
      if (!byTest[lab.testName]) byTest[lab.testName] = [];
      byTest[lab.testName].push({ date: lab.date, value: lab.value });
    }

    // Get all unique dates across focus biomarkers
    const allDates = new Set<string>();
    for (const entries of Object.values(byTest)) {
      for (const e of entries) {
        allDates.add(e.date);
      }
    }

    const sortedDates = Array.from(allDates).sort();
    const available = Object.keys(byTest);

    // Build chart data: each date has normalized values for each biomarker
    const data = sortedDates.map((date) => {
      const point: Record<string, string | number | null> = { date };

      for (const testName of available) {
        const entry = byTest[testName]?.find((e) => e.date === date);
        if (entry) {
          const ref = LAB_BIOMARKERS[testName];
          if (ref) {
            point[testName] = normalizeToOptimal(
              entry.value,
              ref.low,
              ref.high
            );
          }
        } else {
          point[testName] = null;
        }
      }

      return point;
    });

    return { chartData: data, availableBiomarkers: available };
  }, [labs]);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <TestTubes className="h-4 w-4 text-accent-teal" />
          <CardTitle>Lab Trajectory</CardTitle>
        </div>
        <CardContent className="mt-3">
          <div className="h-[320px] animate-pulse rounded bg-border/30" />
        </CardContent>
      </Card>
    );
  }

  const formatXTick = (value: string) => {
    try {
      return format(parseISO(value), "M/d");
    } catch {
      return value;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
    >
      <Card>
        <div className="flex items-center gap-2">
          <TestTubes className="h-4 w-4 text-accent-teal" />
          <CardTitle>Lab Trajectory</CardTitle>
        </div>
        <CardContent className="mt-3">
          <p className="mb-3 text-xs text-text-muted">
            Values normalized to reference ranges. 100% = optimal midpoint.
          </p>

          {chartData.length >= 1 && availableBiomarkers.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e1e30"
                  vertical={false}
                />

                {/* Optimal zone */}
                <ReferenceArea
                  y1={80}
                  y2={120}
                  fill="#22c55e"
                  fillOpacity={0.06}
                  label={{
                    value: "Optimal Zone",
                    position: "insideTopRight",
                    fill: "#22c55e",
                    fontSize: 10,
                    fontFamily: "var(--font-display)",
                    opacity: 0.5,
                  }}
                />

                <XAxis
                  dataKey="date"
                  tick={{
                    fill: "#8b8b9e",
                    fontSize: 10,
                    fontFamily: "var(--font-display)",
                  }}
                  tickLine={false}
                  axisLine={{ stroke: "#1e1e30" }}
                  tickFormatter={formatXTick}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />

                <YAxis
                  tick={{
                    fill: "#8b8b9e",
                    fontSize: 10,
                    fontFamily: "var(--font-display)",
                  }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 150]}
                  width={48}
                  label={{
                    value: "% Optimal",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#8b8b9e",
                    fontSize: 10,
                    fontFamily: "var(--font-display)",
                    dx: -4,
                  }}
                />

                <Tooltip
                  content={<NormalizedTooltip />}
                  cursor={{ stroke: "#8b8b9e", strokeDasharray: "3 3" }}
                />

                <Legend
                  wrapperStyle={{
                    fontSize: 11,
                    fontFamily: "var(--font-display)",
                  }}
                />

                {availableBiomarkers.map((testName) => (
                  <Line
                    key={testName}
                    type="monotone"
                    dataKey={testName}
                    name={testName}
                    stroke={BIOMARKER_COLORS[testName] ?? "#8b8b9e"}
                    strokeWidth={2}
                    dot={{
                      r: 3,
                      fill: BIOMARKER_COLORS[testName] ?? "#8b8b9e",
                      stroke: "#12121a",
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 5,
                      fill: BIOMARKER_COLORS[testName] ?? "#8b8b9e",
                      stroke: "#12121a",
                      strokeWidth: 2,
                    }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <TestTubes className="h-8 w-8 text-text-muted mb-2" />
              <p className="text-sm text-text-secondary">
                No lab data available for trajectory analysis.
              </p>
              <p className="text-xs text-text-muted mt-1">
                Lab results for Glucose, Testosterone, ALT, Triglycerides, or
                HDL will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
