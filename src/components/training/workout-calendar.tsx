"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday as isTodayFn,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WorkoutDay {
  date: string;
  workoutType: string;
  completed: number | null;
}

interface WorkoutCalendarProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  workoutDays: WorkoutDay[];
  plannedDays?: number[]; // 0=Sun, 1=Mon, ... 6=Sat
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WORKOUT_TYPE_COLORS: Record<string, string> = {
  Strength: "bg-accent-teal",
  Cardio: "bg-accent-amber",
  Mobility: "bg-accent-green",
  Other: "bg-text-muted",
};

export function WorkoutCalendar({
  currentMonth,
  onMonthChange,
  selectedDate,
  onDateSelect,
  workoutDays,
  plannedDays = [1, 3, 5], // Mon, Wed, Fri
}: WorkoutCalendarProps) {
  // Build map of date -> workout info
  const workoutMap = useMemo(() => {
    const map = new Map<string, WorkoutDay[]>();
    for (const w of workoutDays) {
      const existing = map.get(w.date) || [];
      existing.push(w);
      map.set(w.date, existing);
    }
    return map;
  }, [workoutDays]);

  // Generate calendar days including padding from adjacent months
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const today = new Date();

  return (
    <div className="rounded-lg border border-border bg-bg-card p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="flex items-center justify-center w-7 h-7 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="font-display text-sm font-semibold tracking-wide text-text-primary">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="flex items-center justify-center w-7 h-7 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center font-display text-[10px] uppercase tracking-wider text-text-muted py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = dateStr === selectedDate;
          const isToday = isTodayFn(day);
          const workoutsOnDay = workoutMap.get(dateStr) || [];
          const hasWorkout = workoutsOnDay.length > 0;
          const dayOfWeek = getDay(day);
          const isPlannedDay = plannedDays.includes(dayOfWeek);
          const isFuture = day > today;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onDateSelect(dateStr)}
              disabled={!isCurrentMonth}
              className={cn(
                "relative flex flex-col items-center justify-center h-10 rounded-md text-xs font-display tabular-nums transition-all duration-150",
                isCurrentMonth
                  ? "hover:bg-bg-card-hover"
                  : "opacity-20 cursor-default",
                isSelected && "bg-accent-teal/15 border border-accent-teal/40",
                isToday && !isSelected && "border border-border-hover",
                !isSelected && !isToday && "border border-transparent",
                hasWorkout ? "text-text-primary font-semibold" : "text-text-secondary",
                isPlannedDay && !hasWorkout && isCurrentMonth && !isFuture && "text-accent-amber/60"
              )}
            >
              <span>{format(day, "d")}</span>

              {/* Workout indicator dots */}
              {hasWorkout && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {workoutsOnDay.map((w, i) => (
                    <span
                      key={i}
                      className={cn(
                        "w-1 h-1 rounded-full",
                        w.completed
                          ? (WORKOUT_TYPE_COLORS[w.workoutType] || "bg-text-muted")
                          : "bg-accent-red"
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Planned but not logged indicator */}
              {!hasWorkout && isPlannedDay && isCurrentMonth && !isFuture && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-text-muted/30" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
        {Object.entries(WORKOUT_TYPE_COLORS).map(([type, colorClass]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", colorClass)} />
            <span className="font-display text-[10px] text-text-muted">{type}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent-red" />
          <span className="font-display text-[10px] text-text-muted">Incomplete</span>
        </div>
      </div>
    </div>
  );
}
