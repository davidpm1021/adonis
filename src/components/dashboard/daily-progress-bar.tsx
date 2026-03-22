"use client";

import { motion } from "framer-motion";

interface DailyProgressBarProps {
  completed: number;
  total: number;
}

export function DailyProgressBar({ completed, total }: DailyProgressBarProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = completed === total && total > 0;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-display text-xs font-semibold tracking-wide text-text-secondary uppercase">
          Today
        </span>
        <span className="font-display text-xs tabular-nums text-text-muted">
          <span className={allDone ? "text-accent-green" : "text-accent-teal"}>
            {completed}/{total}
          </span>
          {" complete "}
          <span className="text-text-muted">&mdash; {pct}%</span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-bg-primary overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${allDone ? "bg-accent-green" : "bg-accent-teal"}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
