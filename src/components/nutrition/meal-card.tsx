"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sun,
  CloudSun,
  Cookie,
  Moon,
  Plus,
  Trash2,
  Check,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Meal type configuration
const MEAL_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; gradient: string }
> = {
  breakfast: {
    label: "Breakfast",
    icon: Sun,
    gradient: "from-amber-500/10 to-transparent",
  },
  lunch: {
    label: "Lunch",
    icon: CloudSun,
    gradient: "from-teal-500/10 to-transparent",
  },
  snack: {
    label: "Snack",
    icon: Cookie,
    gradient: "from-purple-500/10 to-transparent",
  },
  dinner: {
    label: "Dinner",
    icon: Moon,
    gradient: "from-blue-500/10 to-transparent",
  },
};

export interface MealItem {
  id: number;
  date: string;
  mealType: string;
  description: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  source: string | null;
  aiConfidence: number | null;
  notes: string | null;
  createdAt: string | null;
}

interface MealCardProps {
  mealType: string;
  items: MealItem[];
  onAddClick: () => void;
  onDeleteItem: (id: number) => Promise<void>;
}

export function MealCard({
  mealType,
  items,
  onAddClick,
  onDeleteItem,
}: MealCardProps) {
  const config = MEAL_CONFIG[mealType] ?? {
    label: mealType,
    icon: Sun,
    gradient: "from-gray-500/10 to-transparent",
  };
  const Icon = config.icon;
  const hasItems = items.length > 0;

  // Sum macros for this meal period
  const mealTotals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories ?? 0),
      protein: acc.protein + (item.proteinG ?? 0),
      carbs: acc.carbs + (item.carbsG ?? 0),
      fat: acc.fat + (item.fatG ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <Card className={cn("relative overflow-hidden")}>
      {/* Subtle gradient background for meal type identity */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br pointer-events-none opacity-50",
          config.gradient
        )}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg",
                hasItems
                  ? "bg-accent-teal-dim text-accent-teal"
                  : "bg-bg-card-hover text-text-muted"
              )}
            >
              {hasItems ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold tracking-wide text-text-primary">
                {config.label}
              </h3>
              {hasItems && (
                <p className="font-display text-[10px] tabular-nums text-text-muted">
                  {Math.round(mealTotals.calories)} cal &middot;{" "}
                  {Math.round(mealTotals.protein)}g protein
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onAddClick}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-display font-medium text-accent-teal hover:bg-accent-teal-dim hover:border-accent-teal/30 transition-all duration-150"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        {/* Content */}
        <CardContent className="p-0">
          <AnimatePresence mode="popLayout">
            {hasItems ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-1"
              >
                {items.map((item) => (
                  <MealItemRow
                    key={item.id}
                    item={item}
                    onDelete={onDeleteItem}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-4 text-center"
              >
                <Icon className="mx-auto h-6 w-6 text-text-muted/50 mb-1.5" />
                <p className="text-xs text-text-muted">No meals logged</p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </div>
    </Card>
  );
}

// Individual meal item row
function MealItemRow({
  item,
  onDelete,
}: {
  item: MealItem;
  onDelete: (id: number) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Auto-dismiss confirmation after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }

    setDeleting(true);
    try {
      await onDelete(item.id);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const sourceLabel =
    item.source === "ai_parsed"
      ? "AI"
      : item.source === "favorite"
      ? "Fav"
      : item.source === "photo"
      ? "Photo"
      : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0 }}
      transition={{ duration: 0.2 }}
      className="group flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-bg-card-hover transition-colors"
    >
      {/* Description and macros */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm text-text-primary truncate">
            {item.description || "Unnamed item"}
          </p>
          {sourceLabel && (
            <span className="shrink-0 rounded bg-bg-card-elevated px-1.5 py-0.5 font-display text-[9px] font-semibold uppercase tracking-wider text-text-muted">
              {sourceLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="font-display text-[11px] tabular-nums text-text-muted">
            {Math.round(item.calories ?? 0)} cal
          </span>
          <span className="font-display text-[11px] tabular-nums text-accent-teal/70">
            {Math.round(item.proteinG ?? 0)}g P
          </span>
          <span className="font-display text-[11px] tabular-nums text-text-muted">
            {Math.round(item.carbsG ?? 0)}g C
          </span>
          <span className="font-display text-[11px] tabular-nums text-text-muted">
            {Math.round(item.fatG ?? 0)}g F
          </span>
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className={cn(
          "shrink-0 flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150",
          "opacity-0 group-hover:opacity-100",
          confirmDelete
            ? "bg-accent-red/20 text-accent-red opacity-100"
            : "text-text-muted hover:text-accent-red hover:bg-accent-red/10"
        )}
        title={confirmDelete ? "Click again to confirm delete" : "Delete item"}
      >
        {deleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </motion.div>
  );
}
