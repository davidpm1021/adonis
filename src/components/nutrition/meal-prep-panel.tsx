"use client";

import { useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, ChevronDown, ChevronUp, ShoppingCart, ClipboardCopy, Check } from "lucide-react";

interface MealItem {
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  ingredients: string[];
}

interface DayPlan {
  day: string;
  meals: MealItem[];
}

interface MealPlan {
  days: DayPlan[];
}

interface GroceryItem {
  name: string;
  quantity: string;
}

interface GrocerySection {
  name: string;
  items: GroceryItem[];
}

interface GroceryList {
  sections: GrocerySection[];
}

export function MealPrepPanel() {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [groceryList, setGroceryList] = useState<GroceryList | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingGrocery, setLoadingGrocery] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleDay = (day: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const toggleItem = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const generateMealPlan = async () => {
    setLoadingPlan(true);
    setErrorMsg(null);
    setMealPlan(null);
    setGroceryList(null);
    setCheckedItems(new Set());
    try {
      const res = await fetch("/api/nutrition/meal-prep", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error || "Failed to generate meal plan");
        return;
      }
      setMealPlan(json.data.mealPlan);
      // Expand the first day by default
      if (json.data.mealPlan.days.length > 0) {
        setExpandedDays(new Set([json.data.mealPlan.days[0].day]));
      }
    } catch {
      setErrorMsg("Network error generating meal plan");
    } finally {
      setLoadingPlan(false);
    }
  };

  const generateGroceryList = async () => {
    if (!mealPlan) return;
    setLoadingGrocery(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/nutrition/grocery-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealPlan }),
      });
      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error || "Failed to generate grocery list");
        return;
      }
      setGroceryList(json.data.groceryList);
    } catch {
      setErrorMsg("Network error generating grocery list");
    } finally {
      setLoadingGrocery(false);
    }
  };

  const copyGroceryList = async () => {
    if (!groceryList) return;
    const text = groceryList.sections
      .map(
        (s) =>
          `${s.name}\n${s.items.map((i) => `  - ${i.quantity} ${i.name}`).join("\n")}`
      )
      .join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mealTypeLabel: Record<string, string> = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snack",
  };

  return (
    <div className="space-y-4">
      {/* Generate button */}
      <div className="flex items-center gap-3">
        <button
          onClick={generateMealPlan}
          disabled={loadingPlan}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-teal/10 text-accent-teal border border-accent-teal/30 hover:bg-accent-teal/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-display text-sm font-semibold tracking-wide"
        >
          {loadingPlan ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loadingPlan ? "Generating..." : "Generate Meal Plan"}
        </button>
      </div>

      {errorMsg && (
        <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {errorMsg}
        </div>
      )}

      {/* Meal plan display */}
      {mealPlan && (
        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold tracking-wide text-text-secondary uppercase">
            7-Day Meal Plan
          </h3>
          {mealPlan.days.map((day) => {
            const isExpanded = expandedDays.has(day.day);
            const dayTotals = day.meals.reduce(
              (acc, m) => ({
                cal: acc.cal + m.calories,
                pro: acc.pro + m.protein_g,
                carb: acc.carb + m.carbs_g,
                fat: acc.fat + m.fat_g,
              }),
              { cal: 0, pro: 0, carb: 0, fat: 0 }
            );

            return (
              <Card key={day.day} hover className="cursor-pointer" onClick={() => toggleDay(day.day)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm font-semibold text-text-primary">
                      {day.day}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {Math.round(dayTotals.cal)} cal &middot; {Math.round(dayTotals.pro)}g P &middot; {Math.round(dayTotals.carb)}g C &middot; {Math.round(dayTotals.fat)}g F
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-text-secondary" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-secondary" />
                  )}
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                    {day.meals.map((meal, idx) => (
                      <div
                        key={`${day.day}-${idx}`}
                        className="border border-border rounded-lg p-3 bg-bg-primary/50"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-accent-teal font-display font-semibold">
                              {mealTypeLabel[meal.mealType] || meal.mealType}
                            </span>
                            <span className="text-sm font-semibold text-text-primary">
                              {meal.name}
                            </span>
                          </div>
                          <span className="text-xs text-text-secondary tabular-nums">
                            {meal.calories} cal
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mb-2">
                          {meal.description}
                        </p>
                        <div className="flex gap-3 text-[11px] text-text-secondary tabular-nums">
                          <span>{meal.protein_g}g P</span>
                          <span>{meal.carbs_g}g C</span>
                          <span>{meal.fat_g}g F</span>
                          <span>{meal.fiber_g}g fiber</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}

          {/* Grocery list button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={generateGroceryList}
              disabled={loadingGrocery}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-teal/10 text-accent-teal border border-accent-teal/30 hover:bg-accent-teal/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-display text-sm font-semibold tracking-wide"
            >
              {loadingGrocery ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              {loadingGrocery ? "Generating..." : "Generate Grocery List"}
            </button>
          </div>
        </div>
      )}

      {/* Grocery list display */}
      {groceryList && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold tracking-wide text-text-secondary uppercase">
              Grocery List
            </h3>
            <button
              onClick={copyGroceryList}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <ClipboardCopy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy to Clipboard"}
            </button>
          </div>

          {groceryList.sections.map((section) => (
            <Card key={section.name}>
              <CardTitle>{section.name}</CardTitle>
              <CardContent>
                <ul className="mt-2 space-y-1.5">
                  {section.items.map((item, idx) => {
                    const key = `${section.name}-${item.name}`;
                    const checked = checkedItems.has(key);
                    return (
                      <li key={idx} className="flex items-center gap-2">
                        <button
                          onClick={() => toggleItem(key)}
                          className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                            checked
                              ? "bg-accent-teal border-accent-teal"
                              : "border-border hover:border-text-secondary"
                          }`}
                        >
                          {checked && <Check className="h-3 w-3 text-bg-primary" />}
                        </button>
                        <span
                          className={`text-sm ${
                            checked
                              ? "line-through text-text-secondary/50"
                              : "text-text-primary"
                          }`}
                        >
                          {item.quantity} {item.name}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
