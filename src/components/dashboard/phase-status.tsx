"use client";

import { motion } from "framer-motion";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Target, Calendar, FlaskConical } from "lucide-react";
import { LAB_RETEST_SCHEDULE } from "@/lib/constants";

interface PhaseStatusProps {
  phase: {
    phaseName: string;
    phaseNumber: number;
    startDate: string | null;
    endDate: string | null;
  } | null;
  today: string;
}

function daysBetween(a: string, b: string): number {
  const dateA = new Date(a + "T00:00:00");
  const dateB = new Date(b + "T00:00:00");
  return Math.round((dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24));
}

export function PhaseStatus({ phase, today }: PhaseStatusProps) {
  // Calculate phase progress
  let weekNumber = 1;
  let daysRemaining = 0;
  let totalDays = 1;
  let progressPct = 0;

  if (phase?.startDate && phase?.endDate) {
    const elapsed = daysBetween(phase.startDate, today);
    totalDays = daysBetween(phase.startDate, phase.endDate);
    weekNumber = Math.max(1, Math.ceil((elapsed + 1) / 7));
    daysRemaining = Math.max(0, daysBetween(today, phase.endDate));
    progressPct = totalDays > 0 ? Math.min(100, Math.max(0, (elapsed / totalDays) * 100)) : 0;
  }

  // Find next upcoming lab retest
  const nextLab = LAB_RETEST_SCHEDULE.find((l) => l.status === "upcoming" && l.date >= today);
  const labDaysAway = nextLab ? daysBetween(today, nextLab.date) : null;

  return (
    <Card>
      <CardTitle>Phase Status</CardTitle>
      <CardContent>
        <div className="space-y-4">
          {/* Training phase */}
          {phase ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-teal/10">
                  <Target className="h-4 w-4 text-accent-teal" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-bold text-text-primary leading-tight">
                    Phase {phase.phaseNumber}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5 leading-tight truncate">
                    {phase.phaseName}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1 text-text-muted">
                  <Calendar className="h-3 w-3" />
                  <span className="font-display tabular-nums">Week {weekNumber}</span>
                </div>
                <span className="text-text-muted/40">|</span>
                <span className="font-display tabular-nums text-text-muted">
                  {daysRemaining}d remaining
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-1.5 w-full rounded-full bg-bg-card-hover overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                  className="h-full rounded-full bg-accent-teal"
                />
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center gap-2 text-text-muted">
              <Target className="h-4 w-4" />
              <span className="text-sm">No active phase</span>
            </div>
          )}

          {/* Lab retest countdown */}
          {nextLab && labDaysAway !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="border-t border-border pt-3"
            >
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-amber/10">
                  <FlaskConical className="h-4 w-4 text-accent-amber" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-bold text-text-primary leading-tight">
                    {nextLab.label} Labs
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {new Date(nextLab.date + "T12:00:00").toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold tabular-nums text-accent-amber">
                    {labDaysAway}
                  </p>
                  <p className="text-[10px] text-text-muted uppercase tracking-wide">days</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
