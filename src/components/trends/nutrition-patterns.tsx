"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Utensils, Target } from "lucide-react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { parseISO, getDay, startOfWeek, format } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NutritionEntry {
  id: number;
  date: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
}

interface NutritionPatternsProps {
  entries: NutritionEntry[];
  proteinTarget: number | null;
  fiberTarget: number | null;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Tooltips
// ---------------------------------------------------------------------------

interface BarTooltipPayload {
  value: number;
  dataKey: string;
  fill: string;
  name: string;
}

function MacroTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: BarTooltipPayload[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2 shadow-lg">
      <p className="mb-1 font-display text-xs text-text-muted">{label}</p>
      {payload.map((entry, i) => (
        <p
          key={i}
          className="font-display text-xs tabular-nums"
          style={{ color: entry.fill }}
        >
          {entry.name}: {Math.round(entry.value)}g
        </p>
      ))}
    </div>
  );
}

interface LineTooltipPayload {
  value: number;
  dataKey: string;
  color: string;
}

function ProteinTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: LineTooltipPayload[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0 || !label) return null;

  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2 shadow-lg">
      <p className="mb-1 font-display text-xs text-text-muted">{label}</p>
      {payload.map((entry, i) => (
        <p
          key={i}
          className="font-display text-xs tabular-nums"
          style={{ color: entry.color }}
        >
          {entry.value != null ? `${entry.value.toFixed(0)}g` : "--"}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NutritionPatterns({
  entries,
  proteinTarget,
  fiberTarget,
  loading,
}: NutritionPatternsProps) {
  // Aggregate data by day type and weekly averages
  const { weekdayVsWeekend, weeklyProtein, proteinCompliancePct, fiberCompliancePct } =
    useMemo(() => {
      // Group by date, sum macros per day
      const byDate: Record<
        string,
        { calories: number; protein: number; carbs: number; fat: number; fiber: number }
      > = {};

      for (const e of entries) {
        if (!byDate[e.date]) {
          byDate[e.date] = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
          };
        }
        byDate[e.date].calories += e.calories ?? 0;
        byDate[e.date].protein += e.proteinG ?? 0;
        byDate[e.date].carbs += e.carbsG ?? 0;
        byDate[e.date].fat += e.fatG ?? 0;
        byDate[e.date].fiber += e.fiberG ?? 0;
      }

      const dates = Object.keys(byDate).sort();

      // Weekend vs weekday
      const weekday = { protein: 0, carbs: 0, fat: 0, fiber: 0, count: 0 };
      const weekend = { protein: 0, carbs: 0, fat: 0, fiber: 0, count: 0 };

      for (const date of dates) {
        const dayOfWeek = getDay(parseISO(date));
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const target = isWeekend ? weekend : weekday;
        target.protein += byDate[date].protein;
        target.carbs += byDate[date].carbs;
        target.fat += byDate[date].fat;
        target.fiber += byDate[date].fiber;
        target.count++;
      }

      const wvw = [
        {
          label: "Weekday",
          Protein: weekday.count > 0 ? weekday.protein / weekday.count : 0,
          Carbs: weekday.count > 0 ? weekday.carbs / weekday.count : 0,
          Fat: weekday.count > 0 ? weekday.fat / weekday.count : 0,
        },
        {
          label: "Weekend",
          Protein: weekend.count > 0 ? weekend.protein / weekend.count : 0,
          Carbs: weekend.count > 0 ? weekend.carbs / weekend.count : 0,
          Fat: weekend.count > 0 ? weekend.fat / weekend.count : 0,
        },
      ];

      // Weekly protein averages
      const weeklyBuckets: Record<string, { total: number; count: number }> =
        {};
      for (const date of dates) {
        const weekStart = startOfWeek(parseISO(date), { weekStartsOn: 1 });
        const weekLabel = format(weekStart, "M/d");
        if (!weeklyBuckets[weekLabel]) {
          weeklyBuckets[weekLabel] = { total: 0, count: 0 };
        }
        weeklyBuckets[weekLabel].total += byDate[date].protein;
        weeklyBuckets[weekLabel].count++;
      }

      const wp = Object.entries(weeklyBuckets).map(([week, data]) => ({
        week,
        avgProtein: data.count > 0 ? data.total / data.count : 0,
      }));

      // Protein compliance
      let proteinHitDays = 0;
      let fiberHitDays = 0;
      const totalDays = dates.length;

      for (const date of dates) {
        if (proteinTarget && byDate[date].protein >= proteinTarget)
          proteinHitDays++;
        if (fiberTarget && byDate[date].fiber >= fiberTarget) fiberHitDays++;
      }

      return {
        weekdayVsWeekend: wvw,
        weeklyProtein: wp,
        proteinCompliancePct:
          totalDays > 0 && proteinTarget
            ? (proteinHitDays / totalDays) * 100
            : null,
        fiberCompliancePct:
          totalDays > 0 && fiberTarget
            ? (fiberHitDays / totalDays) * 100
            : null,
      };
    }, [entries, proteinTarget, fiberTarget]);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-accent-teal" />
          <CardTitle>Nutrition Patterns</CardTitle>
        </div>
        <CardContent className="mt-3">
          <div className="h-[300px] animate-pulse rounded bg-border/30" />
        </CardContent>
      </Card>
    );
  }

  const hasData = entries.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      <Card>
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-accent-teal" />
          <CardTitle>Nutrition Patterns</CardTitle>
        </div>
        <CardContent className="mt-3">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Utensils className="h-8 w-8 text-text-muted mb-2" />
              <p className="text-sm text-text-secondary">
                No nutrition data available for pattern analysis.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Compliance stats */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {proteinCompliancePct != null && (
                  <div className="rounded-lg border border-border bg-bg-card-hover/30 px-3 py-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-3.5 w-3.5 text-accent-teal" />
                      <span className="font-display text-xs text-text-muted uppercase tracking-wide">
                        Protein Target Hit Rate
                      </span>
                    </div>
                    <span
                      className={cn(
                        "font-display text-2xl font-bold tabular-nums",
                        proteinCompliancePct >= 80
                          ? "text-accent-green"
                          : proteinCompliancePct >= 60
                            ? "text-accent-amber"
                            : "text-accent-red"
                      )}
                    >
                      {proteinCompliancePct.toFixed(0)}%
                    </span>
                    <span className="ml-1 text-xs text-text-muted">
                      ({proteinTarget}g target)
                    </span>
                  </div>
                )}

                {fiberCompliancePct != null && (
                  <div className="rounded-lg border border-border bg-bg-card-hover/30 px-3 py-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-3.5 w-3.5 text-accent-amber" />
                      <span className="font-display text-xs text-text-muted uppercase tracking-wide">
                        Fiber Target Hit Rate
                      </span>
                    </div>
                    <span
                      className={cn(
                        "font-display text-2xl font-bold tabular-nums",
                        fiberCompliancePct >= 80
                          ? "text-accent-green"
                          : fiberCompliancePct >= 60
                            ? "text-accent-amber"
                            : "text-accent-red"
                      )}
                    >
                      {fiberCompliancePct.toFixed(0)}%
                    </span>
                    <span className="ml-1 text-xs text-text-muted">
                      ({fiberTarget}g target)
                    </span>
                  </div>
                )}
              </div>

              {/* Weekend vs Weekday bar chart */}
              <div>
                <p className="mb-2 font-display text-xs text-text-secondary uppercase tracking-wide">
                  Average Daily Macros: Weekday vs Weekend
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={weekdayVsWeekend}
                    margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e1e30"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fill: "#8b8b9e",
                        fontSize: 11,
                        fontFamily: "var(--font-display)",
                      }}
                      tickLine={false}
                      axisLine={{ stroke: "#1e1e30" }}
                    />
                    <YAxis
                      tick={{
                        fill: "#8b8b9e",
                        fontSize: 10,
                        fontFamily: "var(--font-display)",
                      }}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                      label={{
                        value: "grams",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#8b8b9e",
                        fontSize: 10,
                        fontFamily: "var(--font-display)",
                        dx: -4,
                      }}
                    />
                    <Tooltip content={<MacroTooltip />} />
                    <Bar
                      dataKey="Protein"
                      fill="#00e5c7"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="Carbs"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="Fat"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-1 flex items-center justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-accent-teal" />
                    <span className="text-text-muted">Protein</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-accent-amber" />
                    <span className="text-text-muted">Carbs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-accent-red" />
                    <span className="text-text-muted">Fat</span>
                  </div>
                </div>
              </div>

              {/* Weekly protein trend */}
              {weeklyProtein.length >= 2 && (
                <div>
                  <p className="mb-2 font-display text-xs text-text-secondary uppercase tracking-wide">
                    Weekly Average Protein (g/day)
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart
                      data={weeklyProtein}
                      margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1e1e30"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="week"
                        tick={{
                          fill: "#8b8b9e",
                          fontSize: 10,
                          fontFamily: "var(--font-display)",
                        }}
                        tickLine={false}
                        axisLine={{ stroke: "#1e1e30" }}
                      />
                      <YAxis
                        tick={{
                          fill: "#8b8b9e",
                          fontSize: 10,
                          fontFamily: "var(--font-display)",
                        }}
                        tickLine={false}
                        axisLine={false}
                        width={36}
                      />
                      <Tooltip content={<ProteinTrendTooltip />} />
                      {proteinTarget && (
                        <ReferenceLine
                          y={proteinTarget}
                          stroke="#22c55e"
                          strokeDasharray="6 4"
                          label={{
                            value: `Target: ${proteinTarget}g`,
                            position: "insideTopRight",
                            fill: "#22c55e",
                            fontSize: 10,
                            fontFamily: "var(--font-display)",
                          }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="avgProtein"
                        stroke="#00e5c7"
                        strokeWidth={2}
                        dot={{
                          r: 3,
                          fill: "#00e5c7",
                          stroke: "#12121a",
                          strokeWidth: 2,
                        }}
                        activeDot={{
                          r: 5,
                          fill: "#00e5c7",
                          stroke: "#12121a",
                          strokeWidth: 2,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
