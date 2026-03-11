"use client";

import { motion } from "framer-motion";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { MacroBar } from "./macro-bar";
import { Target } from "lucide-react";

interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface NutritionTargets {
  caloriesMin: number | null;
  caloriesMax: number | null;
  proteinMin: number | null;
  proteinMax: number | null;
  carbsMin: number | null;
  carbsMax: number | null;
  fatMin: number | null;
  fatMax: number | null;
  fiberMin: number | null;
  fiberMax: number | null;
}

interface DailyTotalsProps {
  totals: NutritionTotals;
  targets: NutritionTargets | null;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export function DailyTotals({ totals, targets }: DailyTotalsProps) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-accent-teal" />
        <CardTitle className="mb-0">Daily Totals</CardTitle>
      </div>
      <CardContent>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {/* Protein - most prominent, always first */}
          <motion.div variants={item}>
            <MacroBar
              label="Protein"
              current={totals.protein}
              targetMin={targets?.proteinMin ?? null}
              targetMax={targets?.proteinMax ?? null}
              unit="g"
              color="#00e5c7"
              prominent
              showRemaining
            />
          </motion.div>

          {/* Calories */}
          <motion.div variants={item}>
            <MacroBar
              label="Calories"
              current={totals.calories}
              targetMin={targets?.caloriesMin ?? null}
              targetMax={targets?.caloriesMax ?? null}
              unit=" kcal"
              color="#8b8b9e"
              showRemaining
            />
          </motion.div>

          {/* Carbs, Fat, Fiber in a row on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div variants={item}>
              <MacroBar
                label="Carbs"
                current={totals.carbs}
                targetMin={targets?.carbsMin ?? null}
                targetMax={targets?.carbsMax ?? null}
                unit="g"
                color="#f59e0b"
              />
            </motion.div>
            <motion.div variants={item}>
              <MacroBar
                label="Fat"
                current={totals.fat}
                targetMin={targets?.fatMin ?? null}
                targetMax={targets?.fatMax ?? null}
                unit="g"
                color="#ef4444"
              />
            </motion.div>
            <motion.div variants={item}>
              <MacroBar
                label="Fiber"
                current={totals.fiber}
                targetMin={targets?.fiberMin ?? null}
                targetMax={targets?.fiberMax ?? null}
                unit="g"
                color="#22c55e"
              />
            </motion.div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
