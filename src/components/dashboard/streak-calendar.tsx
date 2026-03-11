"use client";

import { motion } from "framer-motion";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { useState } from "react";

interface DayData {
  date: string;
  completedCount: number;
  total: number;
}

interface StreakCalendarProps {
  days: DayData[];
}

function getColor(completedCount: number, total: number, isFuture: boolean): string {
  if (isFuture) return "bg-bg-card-hover/50";
  if (total === 0) return "bg-bg-card-hover/50"; // no data
  const ratio = completedCount / total;
  if (ratio >= 1) return "bg-accent-green"; // all 5 hit
  if (ratio >= 0.6) return "bg-accent-amber"; // 3-4 of 5
  return "bg-accent-red"; // 0-2 of 5
}

function getTooltipColor(completedCount: number, total: number, isFuture: boolean): string {
  if (isFuture) return "text-text-muted";
  if (total === 0) return "text-text-muted";
  const ratio = completedCount / total;
  if (ratio >= 1) return "text-accent-green";
  if (ratio >= 0.6) return "text-accent-amber";
  return "text-accent-red";
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function StreakCalendar({ days }: StreakCalendarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Today in ET for future detection
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

  // Build last 30 days
  const last30: Array<DayData & { isFuture: boolean }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const isFuture = dateStr > todayStr;
    const dayData = days.find((dd) => dd.date === dateStr);
    last30.push({
      date: dateStr,
      completedCount: dayData?.completedCount ?? 0,
      total: dayData?.total ?? 0,
      isFuture,
    });
  }

  // Current streak (counting back from today)
  let currentStreak = 0;
  for (let i = last30.length - 1; i >= 0; i--) {
    const day = last30[i];
    if (day.isFuture) continue;
    if (day.total > 0 && day.completedCount / day.total >= 0.6) {
      currentStreak++;
    } else {
      break;
    }
  }

  return (
    <Card>
      <CardTitle>
        <span className="flex items-center justify-between">
          <span>Streak</span>
          {currentStreak > 0 && (
            <span className="font-display text-xs tabular-nums text-accent-green normal-case tracking-normal">
              {currentStreak}d streak
            </span>
          )}
        </span>
      </CardTitle>
      <CardContent>
        {/* Legend */}
        <div className="mb-3 flex items-center gap-3 text-[10px] text-text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-accent-green" /> 5/5
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-accent-amber" /> 3-4/5
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-accent-red" /> 0-2/5
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-bg-card-hover/50" /> None
          </span>
        </div>

        {/* Calendar grid */}
        <div className="relative">
          <div className="grid grid-cols-10 gap-1 sm:grid-cols-15" style={{ gridTemplateColumns: "repeat(15, 1fr)" }}>
            {last30.map((day, i) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02, duration: 0.2 }}
                className="relative"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  className={`aspect-square w-full rounded-sm ${getColor(
                    day.completedCount,
                    day.total,
                    day.isFuture
                  )} ${day.isFuture ? "opacity-30" : "opacity-90 hover:opacity-100"} transition-opacity cursor-default`}
                />

                {/* Tooltip */}
                {hoveredIndex === i && (
                  <div className="absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-bg-card-elevated border border-border px-2 py-1 shadow-lg">
                    <p className="font-display text-[10px] tabular-nums text-text-secondary">
                      {formatDateShort(day.date)}
                    </p>
                    <p className={`font-display text-[10px] font-bold tabular-nums ${getTooltipColor(day.completedCount, day.total, day.isFuture)}`}>
                      {day.isFuture
                        ? "Future"
                        : day.total === 0
                        ? "No data"
                        : `${day.completedCount}/${day.total}`}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Date labels */}
          <div className="mt-1.5 flex justify-between text-[9px] text-text-muted tabular-nums font-display">
            <span>{formatDateShort(last30[0].date)}</span>
            <span>Today</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
