"use client";

import { motion } from "framer-motion";
import { Flame, Check } from "lucide-react";

interface StepCompleteProps {
  data: {
    name?: string;
    startingWeight?: number;
    goalWeightLow?: number;
    goalWeightHigh?: number;
  };
  onFinish: () => void;
  saving: boolean;
}

export function StepComplete({ data, onFinish, saving }: StepCompleteProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center"
    >
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent-teal/10"
      >
        <Check className="h-10 w-10 text-accent-teal" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="font-display text-3xl font-bold text-text-primary mb-3"
      >
        You&apos;re all set{data.name ? `, ${data.name.split(" ")[0]}` : ""}.
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-text-secondary max-w-sm mb-8"
      >
        Your streaks start today. Every day you show up builds momentum. Don&apos;t break the chain.
      </motion.p>

      {/* Summary */}
      {(data.startingWeight || data.goalWeightLow) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-8 rounded-lg border border-border bg-bg-card px-6 py-4 text-left"
        >
          {data.startingWeight && (
            <div className="flex justify-between gap-8 text-sm mb-2">
              <span className="text-text-secondary">Starting</span>
              <span className="font-display font-semibold text-text-primary tabular-nums">
                {data.startingWeight} lbs
              </span>
            </div>
          )}
          {data.goalWeightLow && data.goalWeightHigh && (
            <div className="flex justify-between gap-8 text-sm">
              <span className="text-text-secondary">Target</span>
              <span className="font-display font-semibold text-accent-teal tabular-nums">
                {data.goalWeightLow}-{data.goalWeightHigh} lbs
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Flame motivator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mb-8 flex items-center gap-2 text-accent-amber"
      >
        <Flame className="h-5 w-5" />
        <span className="font-display text-sm font-medium tracking-wide">
          Day 1 — Start your streak
        </span>
      </motion.div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        onClick={onFinish}
        disabled={saving}
        className="rounded-lg bg-accent-teal px-10 py-3.5 font-display text-sm font-bold text-bg-primary tracking-widest uppercase transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Launch ADONIS"}
      </motion.button>
    </motion.div>
  );
}
