"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardCheck,
  Footprints,
  Dumbbell,
  Beef,
  Pill,
  ShieldCheck,
  Moon,
} from "lucide-react";
import { STREAK_BEHAVIORS } from "@/lib/constants";

const ICONS: Record<string, React.ReactNode> = {
  ClipboardCheck: <ClipboardCheck className="h-5 w-5" />,
  Footprints: <Footprints className="h-5 w-5" />,
  Dumbbell: <Dumbbell className="h-5 w-5" />,
  Beef: <Beef className="h-5 w-5" />,
  Pill: <Pill className="h-5 w-5" />,
  ShieldCheck: <ShieldCheck className="h-5 w-5" />,
  Moon: <Moon className="h-5 w-5" />,
};

interface StepHabitsProps {
  data: {
    trackedBehaviors?: string;
    sobrietyStartDate?: string;
    weeklyAlcoholSpend?: number;
    weeklyAlcoholCalories?: number;
  };
  onNext: (data: {
    trackedBehaviors: string;
    sobrietyStartDate?: string;
    weeklyAlcoholSpend?: number;
    weeklyAlcoholCalories?: number;
  }) => void;
  onBack: () => void;
}

export function StepHabits({ data, onNext, onBack }: StepHabitsProps) {
  const initialTracked = data.trackedBehaviors
    ? tryParseArray(data.trackedBehaviors)
    : STREAK_BEHAVIORS.map((b) => b.key);

  const [tracked, setTracked] = useState<string[]>(initialTracked);
  const [sobrietyDate, setSobrietyDate] = useState(data.sobrietyStartDate || "");
  const [weeklySpend, setWeeklySpend] = useState(data.weeklyAlcoholSpend ?? 0);
  const [weeklyCals, setWeeklyCals] = useState(data.weeklyAlcoholCalories ?? 0);

  const toggleBehavior = (key: string) => {
    setTracked((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const trackingSobriety = tracked.includes("alcoholFree");

  const handleNext = () => {
    onNext({
      trackedBehaviors: JSON.stringify(tracked),
      sobrietyStartDate: trackingSobriety && sobrietyDate ? sobrietyDate : undefined,
      weeklyAlcoholSpend: trackingSobriety ? weeklySpend : undefined,
      weeklyAlcoholCalories: trackingSobriety ? weeklyCals : undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="mx-auto max-w-md px-6 py-8"
    >
      <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
        Daily Habits
      </h2>
      <p className="text-text-secondary text-sm mb-8">
        Choose which behaviors to track. Build streaks, don&apos;t break the chain.
      </p>

      {/* Behavior toggles */}
      <div className="space-y-2 mb-6">
        {STREAK_BEHAVIORS.map((behavior, i) => {
          const isActive = tracked.includes(behavior.key);
          return (
            <motion.button
              key={behavior.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => toggleBehavior(behavior.key)}
              className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
                isActive
                  ? "border-accent-teal/40 bg-accent-teal/10 text-accent-teal"
                  : "border-border bg-bg-card text-text-muted hover:border-border-hover"
              }`}
            >
              <div className={isActive ? "text-accent-teal" : "text-text-muted"}>
                {ICONS[behavior.icon]}
              </div>
              <div className="text-left flex-1">
                <p className="font-display text-sm font-medium">{behavior.label}</p>
                <p className="text-xs text-text-muted">{behavior.description}</p>
              </div>
              <div
                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isActive
                    ? "border-accent-teal bg-accent-teal"
                    : "border-border"
                }`}
              >
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-2 w-2 rounded-full bg-bg-primary"
                  />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Sobriety details (conditional) */}
      {trackingSobriety && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-4 rounded-lg border border-accent-teal/20 bg-accent-teal/5 p-4 mb-6"
        >
          <p className="font-display text-xs text-accent-teal uppercase tracking-wide font-semibold">
            Sobriety Tracking
          </p>
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Sobriety Start Date
            </label>
            <input
              type="date"
              value={sobrietyDate}
              onChange={(e) => setSobrietyDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-card px-4 py-2 text-text-primary focus:border-accent-teal focus:outline-none transition-colors [color-scheme:dark]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                Weekly $ Saved
              </label>
              <input
                type="number"
                value={weeklySpend || ""}
                onChange={(e) => setWeeklySpend(parseFloat(e.target.value) || 0)}
                placeholder="75"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                Weekly Cal Avoided
              </label>
              <input
                type="number"
                value={weeklyCals || ""}
                onChange={(e) => setWeeklyCals(parseInt(e.target.value) || 0)}
                placeholder="2500"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none transition-colors"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded-lg border border-border px-5 py-2.5 font-display text-sm text-text-secondary hover:border-border-hover transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={tracked.length === 0}
          className="rounded-lg bg-accent-teal px-6 py-2.5 font-display text-sm font-semibold text-bg-primary tracking-wide transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </motion.div>
  );
}

function tryParseArray(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
