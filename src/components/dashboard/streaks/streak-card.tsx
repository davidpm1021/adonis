"use client";

import { motion } from "framer-motion";
import {
  ClipboardCheck,
  Footprints,
  Dumbbell,
  Beef,
  Pill,
  ShieldCheck,
  Moon,
  Flame,
} from "lucide-react";
import { STREAK_FLAME_TIERS } from "@/lib/constants";

interface StreakCardProps {
  behaviorKey: string;
  label: string;
  currentStreak: number;
  bestStreak: number;
  todayComplete: boolean;
  onClick?: () => void;
  index?: number;
}

const ICONS: Record<string, React.ReactNode> = {
  dailyLog: <ClipboardCheck className="h-5 w-5" />,
  morningWalk: <Footprints className="h-5 w-5" />,
  strengthTraining: <Dumbbell className="h-5 w-5" />,
  proteinTarget: <Beef className="h-5 w-5" />,
  supplementsTaken: <Pill className="h-5 w-5" />,
  alcoholFree: <ShieldCheck className="h-5 w-5" />,
  sleepLogged: <Moon className="h-5 w-5" />,
  overall: <Flame className="h-5 w-5" />,
};

function getFlameColor(days: number) {
  const tier = STREAK_FLAME_TIERS.find((t) => days >= t.min && days <= t.max);
  return tier?.color || STREAK_FLAME_TIERS[0].color;
}

export function StreakCard({
  behaviorKey,
  label,
  currentStreak,
  bestStreak,
  todayComplete,
  onClick,
  index = 0,
}: StreakCardProps) {
  const flameColor = getFlameColor(currentStreak);

  // Flame size relative to streak
  const flameScale =
    currentStreak <= 2 ? 0.6 : currentStreak <= 7 ? 0.75 : currentStreak <= 30 ? 0.9 : 1;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={onClick}
      className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200 text-center ${
        todayComplete
          ? "border-accent-green/30 bg-accent-green/5"
          : currentStreak === 0
          ? "border-border/50 bg-bg-card opacity-60"
          : "border-accent-amber/20 bg-accent-amber/5"
      } hover:bg-bg-card-hover cursor-pointer`}
    >
      {/* Icon */}
      <div
        className={
          todayComplete
            ? "text-accent-green"
            : currentStreak > 0
            ? "text-accent-amber"
            : "text-text-muted"
        }
      >
        {ICONS[behaviorKey] || <Flame className="h-5 w-5" />}
      </div>

      {/* Label */}
      <span className="text-[11px] font-display font-medium text-text-secondary tracking-wide leading-tight">
        {label}
      </span>

      {/* Current streak — prominent */}
      <div className="flex items-center gap-1">
        <Flame
          className="h-3.5 w-3.5"
          style={{
            color: flameColor,
            transform: `scale(${flameScale})`,
          }}
        />
        <span
          className="font-display text-2xl font-bold tabular-nums"
          style={{ color: flameColor }}
        >
          {currentStreak}
        </span>
      </div>

      {/* Best streak — small */}
      <span className="text-[10px] text-text-muted tabular-nums">
        Best: {bestStreak}
      </span>
    </motion.button>
  );
}
