"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { MealCard, type MealItem } from "@/components/nutrition/meal-card";
import { DailyTotals } from "@/components/nutrition/daily-totals";
import { FoodLogForm } from "@/components/nutrition/food-log-form";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type MealType = "breakfast" | "lunch" | "snack" | "dinner";

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

interface DailyNutritionData {
  date: string;
  meals: MealItem[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

// Get today's date in Eastern time as YYYY-MM-DD
function todayET(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}

// Format a date string for display
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Shift a YYYY-MM-DD date by N days
function shiftDate(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T12:00:00");
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA");
}

export default function NutritionPage() {
  const [selectedDate, setSelectedDate] = useState(todayET);
  const [nutritionData, setNutritionData] =
    useState<DailyNutritionData | null>(null);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [loading, setLoading] = useState(true);
  const [logFormOpen, setLogFormOpen] = useState<MealType | null>(null);

  const isToday = selectedDate === todayET();

  // Fetch nutrition data for the selected date
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [nutritionRes, targetsRes] = await Promise.all([
        fetch(`/api/nutrition/daily/${selectedDate}`),
        fetch("/api/settings/targets"),
      ]);

      const nutritionJson = await nutritionRes.json();
      if (nutritionJson.success) {
        setNutritionData(nutritionJson.data);
      }

      const targetsJson = await targetsRes.json();
      if (targetsJson.success) {
        setTargets(targetsJson.data);
      }
    } catch (err) {
      console.error("Failed to fetch nutrition data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  function handlePrevDay() {
    setSelectedDate((d) => shiftDate(d, -1));
  }

  function handleNextDay() {
    const next = shiftDate(selectedDate, 1);
    const today = todayET();
    // Don't allow going past today
    if (next <= today) {
      setSelectedDate(next);
    }
  }

  function handleToday() {
    setSelectedDate(todayET());
  }

  async function handleDeleteItem(id: number) {
    const res = await fetch(`/api/nutrition/${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (json.success) {
      // Refresh data
      fetchData();
    }
  }

  function handleLogFormSaved() {
    setLogFormOpen(null);
    fetchData();
  }

  // Group meals by type
  const mealsByType: Record<MealType, MealItem[]> = {
    breakfast: [],
    lunch: [],
    snack: [],
    dinner: [],
  };

  if (nutritionData?.meals) {
    for (const meal of nutritionData.meals) {
      const type = meal.mealType as MealType;
      if (mealsByType[type]) {
        mealsByType[type].push(meal);
      }
    }
  }

  const totals = nutritionData?.totals ?? {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  };

  const canGoNext = shiftDate(selectedDate, 1) <= todayET();

  return (
    <div>
      <PageHeader
        title="Nutrition"
        subtitle="Track meals and macros with AI-powered food logging"
        actions={
          <button
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-display font-medium text-text-secondary hover:bg-bg-card-hover hover:text-accent-amber hover:border-accent-amber/30 transition-all"
            title="What should I eat? (Coming soon)"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            What Should I Eat?
          </button>
        }
      />

      {/* Date Selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-card border border-border">
            <CalendarDays className="h-4 w-4 text-text-muted" />
            <span className="font-display text-sm font-medium tabular-nums text-text-primary">
              {formatDateDisplay(selectedDate)}
            </span>
          </div>

          <button
            onClick={handleNextDay}
            disabled={!canGoNext}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg border border-border transition-colors",
              canGoNext
                ? "text-text-muted hover:text-text-primary hover:bg-bg-card-hover"
                : "text-text-muted/30 cursor-not-allowed"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {!isToday && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleToday}
            className="flex items-center gap-1.5 rounded-lg bg-accent-teal-dim border border-accent-teal/20 px-3 py-1.5 text-xs font-display font-medium text-accent-teal hover:bg-accent-teal/20 transition-all"
          >
            Today
          </motion.button>
        )}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        </div>
      ) : (
        <motion.div
          key={selectedDate}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Daily Totals */}
          <DailyTotals totals={totals} targets={targets} />

          {/* Meal Period Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MEAL_ORDER.map((mealType) => (
              <MealCard
                key={mealType}
                mealType={mealType}
                items={mealsByType[mealType]}
                onAddClick={() => setLogFormOpen(mealType)}
                onDeleteItem={handleDeleteItem}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Food Log Form Modal */}
      <AnimatePresence>
        {logFormOpen && (
          <FoodLogForm
            date={selectedDate}
            mealType={logFormOpen}
            onClose={() => setLogFormOpen(null)}
            onSaved={handleLogFormSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
