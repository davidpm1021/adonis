"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";
import { STREAK_FLAME_TIERS, STREAK_MILESTONES } from "@/lib/constants";

interface StreakHeroProps {
  currentStreak: number;
  label?: string;
}

function getFlameTier(days: number) {
  return (
    STREAK_FLAME_TIERS.find((t) => days >= t.min && days <= t.max) ||
    STREAK_FLAME_TIERS[0]
  );
}

function getNextMilestone(days: number): number | null {
  return STREAK_MILESTONES.find((m) => m > days) ?? null;
}

function AnimatedNumber({ value }: { value: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.floor(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    });
    const unsubscribe = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, count, rounded]);

  return <>{display}</>;
}

export function StreakHero({ currentStreak, label }: StreakHeroProps) {
  const tier = getFlameTier(currentStreak);
  const nextMilestone = getNextMilestone(currentStreak);
  const daysToNext = nextMilestone ? nextMilestone - currentStreak : null;

  // Flame size scales with tier
  const flameSize =
    currentStreak <= 2
      ? "h-8 w-8"
      : currentStreak <= 6
      ? "h-10 w-10"
      : currentStreak <= 29
      ? "h-12 w-12"
      : currentStreak <= 99
      ? "h-14 w-14"
      : "h-16 w-16";

  const isImmortal = currentStreak >= 365;
  const isLegendary = currentStreak >= 100;

  return (
    <Card className="relative overflow-hidden md:col-span-2 lg:col-span-3">
      {/* Background glow based on tier */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          background: `radial-gradient(ellipse at center, ${tier.color} 0%, transparent 70%)`,
        }}
      />

      <CardContent className="relative">
        <div className="flex flex-col items-center py-6 sm:py-8">
          {/* Flame icon */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
            className={`mb-3 ${isImmortal ? "animate-flame-glow" : ""}`}
          >
            <Flame
              className={`${flameSize} ${currentStreak <= 2 ? "" : "animate-flame-pulse"}`}
              style={{ color: tier.color }}
              strokeWidth={currentStreak >= 30 ? 2.5 : 2}
            />
          </motion.div>

          {/* Streak number */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center"
          >
            <p
              className="font-display text-6xl sm:text-7xl md:text-8xl font-bold tabular-nums leading-none tracking-tight"
              style={{ color: tier.color }}
            >
              <AnimatedNumber value={currentStreak} />
            </p>
            <p className="mt-1 text-sm text-text-secondary font-body tracking-wide uppercase">
              Day Streak
            </p>
          </motion.div>

          {/* Tier label */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-3 flex items-center gap-2"
          >
            <span
              className="rounded-full px-3 py-1 font-display text-xs font-semibold tracking-wide border"
              style={{
                color: tier.color,
                borderColor: `${tier.color}40`,
                backgroundColor: `${tier.color}15`,
              }}
            >
              {tier.label}
            </span>
            {daysToNext !== null && nextMilestone !== null && (
              <span className="text-xs text-text-muted font-body tabular-nums">
                {daysToNext}d to {nextMilestone}
              </span>
            )}
          </motion.div>

          {/* Motivational text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 text-sm text-text-secondary font-body"
          >
            {currentStreak === 0
              ? "Start your streak today!"
              : currentStreak < 3
              ? "Building momentum..."
              : "Don't break your streak!"}
          </motion.p>
        </div>
      </CardContent>
    </Card>
  );
}
