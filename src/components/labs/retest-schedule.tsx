"use client";

import { Check, Clock, Calendar } from "lucide-react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { LAB_RETEST_SCHEDULE } from "@/lib/constants";
import { cn } from "@/lib/utils";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr + "T12:00:00");
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatCountdown(days: number): string {
  if (days <= 0) return "Due now";
  if (days === 1) return "Tomorrow";
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  const remaining = days % 30;
  if (remaining === 0) return `${months}mo`;
  return `${months}mo ${remaining}d`;
}

export function RetestSchedule() {
  return (
    <Card>
      <CardTitle>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-accent-teal" />
          Lab Retest Schedule
        </div>
      </CardTitle>
      <CardContent>
        <div className="relative">
          {/* Vertical connecting line */}
          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />

          <div className="space-y-0">
            {LAB_RETEST_SCHEDULE.map((item, index) => {
              const isCompleted = item.status === "completed";
              const days = daysUntil(item.date);
              const isNext =
                !isCompleted &&
                (index === 0 ||
                  LAB_RETEST_SCHEDULE.slice(0, index).every(
                    (prev) => prev.status === "completed"
                  ));

              return (
                <div key={item.label} className="relative flex items-start gap-3 py-3">
                  {/* Dot */}
                  <div
                    className={cn(
                      "relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2",
                      isCompleted
                        ? "border-accent-green bg-accent-green-dim"
                        : isNext
                          ? "border-accent-teal bg-accent-teal-dim"
                          : "border-border bg-bg-card"
                    )}
                  >
                    {isCompleted ? (
                      <Check size={10} className="text-accent-green" />
                    ) : isNext ? (
                      <Clock size={9} className="text-accent-teal" />
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-text-muted" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "font-display text-xs font-semibold tracking-wide",
                          isCompleted
                            ? "text-accent-green"
                            : isNext
                              ? "text-accent-teal"
                              : "text-text-secondary"
                        )}
                      >
                        {item.label}
                      </span>

                      {!isCompleted && (
                        <span
                          className={cn(
                            "font-display text-[10px] tabular-nums",
                            isNext ? "text-accent-teal" : "text-text-muted"
                          )}
                        >
                          {formatCountdown(days)}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-text-muted">
                      {formatDate(item.date)}
                    </span>

                    {isCompleted && (
                      <span className="ml-2 text-[10px] text-accent-green">
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
