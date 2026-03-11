"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface StepGoalsProps {
  data: {
    startingWeight?: number;
    goalWeightLow?: number;
    goalWeightHigh?: number;
  };
  onNext: (data: { startingWeight: number; goalWeightLow: number; goalWeightHigh: number }) => void;
  onBack: () => void;
}

export function StepGoals({ data, onNext, onBack }: StepGoalsProps) {
  const [startingWeight, setStartingWeight] = useState(data.startingWeight || 0);
  const [goalWeightLow, setGoalWeightLow] = useState(data.goalWeightLow || 0);
  const [goalWeightHigh, setGoalWeightHigh] = useState(data.goalWeightHigh || 0);

  const isValid = startingWeight > 0 && goalWeightLow > 0 && goalWeightHigh > 0 && goalWeightHigh >= goalWeightLow;

  const handleNext = () => {
    if (!isValid) return;
    onNext({ startingWeight, goalWeightLow, goalWeightHigh });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="mx-auto max-w-md px-6 py-8"
    >
      <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
        Your Goals
      </h2>
      <p className="text-text-secondary text-sm mb-8">
        Set your weight targets. These can be adjusted anytime.
      </p>

      <div className="space-y-5">
        {/* Current Weight */}
        <div>
          <label className="block text-xs font-display text-text-secondary uppercase tracking-wide mb-1.5">
            Current Weight (lbs)
          </label>
          <input
            type="number"
            min={50}
            max={600}
            value={startingWeight || ""}
            onChange={(e) => setStartingWeight(parseFloat(e.target.value) || 0)}
            placeholder="225"
            className="w-full rounded-lg border border-border bg-bg-card px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none transition-colors"
          />
        </div>

        {/* Goal Weight Range */}
        <div>
          <label className="block text-xs font-display text-text-secondary uppercase tracking-wide mb-1.5">
            Goal Weight Range (lbs)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={50}
              max={600}
              value={goalWeightLow || ""}
              onChange={(e) => setGoalWeightLow(parseFloat(e.target.value) || 0)}
              placeholder="185"
              className="flex-1 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none transition-colors"
            />
            <span className="text-text-muted">to</span>
            <input
              type="number"
              min={50}
              max={600}
              value={goalWeightHigh || ""}
              onChange={(e) => setGoalWeightHigh(parseFloat(e.target.value) || 0)}
              placeholder="195"
              className="flex-1 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Visual feedback */}
        {startingWeight > 0 && goalWeightLow > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-border bg-bg-card p-4"
          >
            <p className="text-xs text-text-secondary">
              Target loss:{" "}
              <span className="text-accent-teal font-display font-semibold">
                {Math.round(startingWeight - (goalWeightLow + goalWeightHigh) / 2)} lbs
              </span>
            </p>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-10 flex justify-between">
        <button
          onClick={onBack}
          className="rounded-lg border border-border px-5 py-2.5 font-display text-sm text-text-secondary hover:border-border-hover transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!isValid}
          className="rounded-lg bg-accent-teal px-6 py-2.5 font-display text-sm font-semibold text-bg-primary tracking-wide transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </motion.div>
  );
}
