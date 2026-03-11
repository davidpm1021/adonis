"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { BrainCircuit } from "lucide-react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CorrelationInput {
  label: string;
  xLabel: string;
  yLabel: string;
  xData: number[];
  yData: number[];
  color: string;
  interpretation: (r: number) => string;
}

interface CorrelationCardProps {
  input: CorrelationInput;
  index: number;
}

// ---------------------------------------------------------------------------
// Pearson correlation coefficient
// ---------------------------------------------------------------------------

function pearson(x: number[], y: number[]): number | null {
  const n = Math.min(x.length, y.length);
  if (n < 3) return null;

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const denom = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );
  if (denom === 0) return null;

  return (n * sumXY - sumX * sumY) / denom;
}

function strengthLabel(r: number | null): { label: string; color: string } {
  if (r == null) return { label: "Insufficient data", color: "text-text-muted" };
  const absR = Math.abs(r);
  if (absR >= 0.7) return { label: "Strong", color: "text-accent-green" };
  if (absR >= 0.4) return { label: "Moderate", color: "text-accent-amber" };
  if (absR >= 0.2) return { label: "Weak", color: "text-accent-amber" };
  return { label: "Negligible", color: "text-text-muted" };
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface ScatterTooltipPayload {
  payload: { x: number; y: number };
}

function ScatterTooltip({
  active,
  payload,
  xLabel,
  yLabel,
}: {
  active?: boolean;
  payload?: ScatterTooltipPayload[];
  xLabel: string;
  yLabel: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2 shadow-lg">
      <p className="font-display text-xs tabular-nums text-text-primary">
        {xLabel}: {pt.x.toFixed(1)}
      </p>
      <p className="font-display text-xs tabular-nums text-text-primary">
        {yLabel}: {pt.y.toFixed(1)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CorrelationCard({ input, index }: CorrelationCardProps) {
  const { r, scatterData } = useMemo(() => {
    const n = Math.min(input.xData.length, input.yData.length);
    const data = Array.from({ length: n }, (_, i) => ({
      x: input.xData[i],
      y: input.yData[i],
    }));

    return {
      r: pearson(input.xData.slice(0, n), input.yData.slice(0, n)),
      scatterData: data,
    };
  }, [input.xData, input.yData]);

  const strength = strengthLabel(r);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.1, duration: 0.4 }}
    >
      <Card>
        <CardTitle>{input.label}</CardTitle>
        <CardContent className="mt-2">
          {/* Correlation stats */}
          <div className="mb-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-xs text-text-muted">r =</span>
              <span
                className={cn(
                  "font-display text-sm font-semibold tabular-nums",
                  strength.color
                )}
              >
                {r != null ? r.toFixed(3) : "--"}
              </span>
            </div>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-display text-[10px] uppercase tracking-wider",
                strength.color,
                r != null && Math.abs(r) >= 0.4
                  ? "bg-accent-green/10"
                  : "bg-border/30"
              )}
            >
              {strength.label}
            </span>
          </div>

          <p className="mb-3 text-xs text-text-muted">
            {r != null ? input.interpretation(r) : "Need at least 3 paired data points."}
          </p>

          {/* Scatter plot */}
          {scatterData.length >= 3 ? (
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e1e30"
                />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={input.xLabel}
                  tick={{
                    fill: "#8b8b9e",
                    fontSize: 10,
                    fontFamily: "var(--font-display)",
                  }}
                  tickLine={false}
                  axisLine={{ stroke: "#1e1e30" }}
                  label={{
                    value: input.xLabel,
                    position: "insideBottomRight",
                    offset: -5,
                    fill: "#8b8b9e",
                    fontSize: 10,
                    fontFamily: "var(--font-display)",
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={input.yLabel}
                  tick={{
                    fill: "#8b8b9e",
                    fontSize: 10,
                    fontFamily: "var(--font-display)",
                  }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  label={{
                    value: input.yLabel,
                    angle: -90,
                    position: "insideLeft",
                    fill: "#8b8b9e",
                    fontSize: 10,
                    fontFamily: "var(--font-display)",
                    dx: -4,
                  }}
                />
                <Tooltip
                  content={
                    <ScatterTooltip
                      xLabel={input.xLabel}
                      yLabel={input.yLabel}
                    />
                  }
                  cursor={{ strokeDasharray: "3 3" }}
                />
                <Scatter
                  data={scatterData}
                  fill={input.color}
                  fillOpacity={0.7}
                  r={4}
                />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-xs text-text-muted">
                Need at least 3 data points for scatter plot
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Wrapper with section title
// ---------------------------------------------------------------------------

interface CorrelationsProps {
  correlations: CorrelationInput[];
  loading?: boolean;
}

export function Correlations({ correlations, loading }: CorrelationsProps) {
  if (loading) {
    return (
      <div>
        <div className="mb-3 flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-accent-teal" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-secondary">
            AI-Powered Correlations
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <div className="h-[260px] animate-pulse rounded bg-border/30" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <BrainCircuit className="h-4 w-4 text-accent-teal" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-secondary">
          AI-Powered Correlations
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {correlations.map((c, i) => (
          <CorrelationCard key={c.label} input={c} index={i} />
        ))}
      </div>
    </div>
  );
}
