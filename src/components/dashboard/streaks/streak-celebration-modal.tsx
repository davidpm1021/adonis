"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, X, Trophy } from "lucide-react";
import { STREAK_FLAME_TIERS } from "@/lib/constants";

interface Milestone {
  id: number;
  streakType: string;
  milestone: number;
  achievedDate: string;
}

interface StreakCelebrationModalProps {
  milestones: Milestone[];
  onCelebrate: (id: number) => void;
}

function getFlameColor(days: number) {
  const tier = STREAK_FLAME_TIERS.find((t) => days >= t.min && days <= t.max);
  return tier?.color || "#4a4a5e";
}

function getStreakLabel(key: string): string {
  const labels: Record<string, string> = {
    dailyLog: "Daily Log",
    morningWalk: "Morning Walk",
    strengthTraining: "Training",
    proteinTarget: "Protein Goal",
    supplementsTaken: "Supplements",
    alcoholFree: "Alcohol-Free",
    sleepLogged: "Sleep Logged",
    overall: "Overall",
  };
  return labels[key] || key;
}

export function StreakCelebrationModal({
  milestones,
  onCelebrate,
}: StreakCelebrationModalProps) {
  const [current, setCurrent] = useState<Milestone | null>(null);

  useEffect(() => {
    if (milestones.length > 0 && !current) {
      setCurrent(milestones[0]);
    }
  }, [milestones, current]);

  const handleDismiss = () => {
    if (current) {
      onCelebrate(current.id);
      const remaining = milestones.filter((m) => m.id !== current.id);
      setCurrent(remaining.length > 0 ? remaining[0] : null);
    }
  };

  if (!current) return null;

  const color = getFlameColor(current.milestone);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm rounded-2xl border border-border bg-bg-card p-8 text-center"
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute right-3 top-3 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Trophy + Flame animation */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4 flex justify-center"
          >
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: `${color}15` }}
            >
              <Trophy className="h-10 w-10" style={{ color }} />
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -top-1 -right-1"
              >
                <Flame className="h-6 w-6" style={{ color }} />
              </motion.div>
            </div>
          </motion.div>

          {/* Milestone text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p className="font-display text-4xl font-bold tabular-nums mb-2" style={{ color }}>
              {current.milestone}
            </p>
            <p className="text-text-secondary text-sm mb-1">Day Milestone!</p>
            <p className="font-display text-sm font-semibold text-text-primary">
              {getStreakLabel(current.streakType)}
            </p>
          </motion.div>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={handleDismiss}
            className="mt-6 rounded-lg px-6 py-2.5 font-display text-sm font-semibold text-bg-primary tracking-wide transition-all hover:brightness-110"
            style={{ backgroundColor: color }}
          >
            Keep Going!
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
