"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MacroBarProps {
  label: string;
  current: number;
  targetMin: number | null;
  targetMax: number | null;
  unit: string;
  color: string;
  prominent?: boolean;
  showRemaining?: boolean;
}

function getStatusColor(pct: number): string {
  if (pct >= 80 && pct <= 100) return "green";
  if (pct < 60) return "amber";
  if (pct > 120) return "red";
  return "default";
}

export function MacroBar({
  label,
  current,
  targetMin,
  targetMax,
  unit,
  color,
  prominent = false,
  showRemaining = false,
}: MacroBarProps) {
  const target = targetMax || targetMin || 0;
  const pct = target > 0 ? (current / target) * 100 : 0;
  const clampedPct = Math.min(pct, 100);
  const status = target > 0 ? getStatusColor(pct) : "default";
  const remaining = Math.max(target - current, 0);
  const isHit = pct >= 95 && pct <= 105;

  const statusBgClass =
    status === "green"
      ? "bg-accent-green"
      : status === "amber"
      ? "bg-accent-amber"
      : status === "red"
      ? "bg-accent-red"
      : "";

  return (
    <div
      className={cn(
        "relative",
        prominent && "col-span-full",
        isHit && prominent && "teal-glow rounded-lg"
      )}
    >
      {/* Header row */}
      <div className="flex items-baseline justify-between mb-1.5">
        <span
          className={cn(
            "font-display text-[11px] font-semibold uppercase tracking-wide",
            prominent ? "text-accent-teal" : "text-text-secondary"
          )}
        >
          {label}
        </span>
        <span className="font-display text-[11px] tabular-nums text-text-muted">
          {targetMin && targetMax && targetMin !== targetMax
            ? `${targetMin}-${targetMax}${unit}`
            : target > 0
            ? `${target}${unit}`
            : "No target"}
        </span>
      </div>

      {/* Value row */}
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-display tabular-nums font-bold",
            prominent
              ? "text-3xl text-text-primary"
              : "text-xl text-text-primary"
          )}
        >
          {Math.round(current)}
        </span>
        <span className="text-xs text-text-muted">{unit}</span>
        <span className="ml-auto flex items-baseline gap-2">
          {showRemaining && target > 0 && (
            <span className="font-display text-xs tabular-nums text-text-muted">
              {remaining > 0
                ? `${Math.round(remaining)}${unit} left`
                : "Target reached"}
            </span>
          )}
          {target > 0 && (
            <span
              className={cn(
                "font-display text-[11px] tabular-nums font-medium",
                status === "green" && "text-accent-green",
                status === "amber" && "text-accent-amber",
                status === "red" && "text-accent-red",
                status === "default" && "text-text-muted"
              )}
            >
              {Math.round(pct)}%
            </span>
          )}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-2 w-full rounded-full bg-bg-card-hover overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedPct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
          className={cn(
            "h-full rounded-full transition-colors",
            status !== "default" && statusBgClass
          )}
          style={status === "default" ? { backgroundColor: color } : undefined}
        />
      </div>
    </div>
  );
}
