"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickWeightModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (weight: number) => void;
  currentWeight?: number | null;
}

function todayET(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}

export function QuickWeightModal({
  open,
  onClose,
  onSaved,
  currentWeight,
}: QuickWeightModalProps) {
  const [weight, setWeight] = useState(currentWeight?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const parsed = parseFloat(weight);
    if (!parsed || parsed <= 0) {
      setError("Enter a valid weight");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: todayET(),
          weight: parsed,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to save");
        return;
      }

      onSaved(parsed);
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-xs rounded-2xl bg-bg-card border border-border p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-accent-teal" />
                <span className="font-display text-sm font-semibold text-text-primary">
                  Log Weight
                </span>
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-7 h-7 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="font-display text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Weight (lbs)
              </label>
              <input
                type="number"
                step="0.1"
                min="50"
                max="500"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
                placeholder={currentWeight ? `Current: ${currentWeight}` : "e.g. 195.5"}
                autoFocus
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-3 text-center text-2xl font-display tabular-nums text-text-primary placeholder:text-text-muted/50 placeholder:text-base focus:outline-none focus:border-accent-teal/50 focus:ring-1 focus:ring-accent-teal/20 transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-accent-red text-center">{error}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !weight}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-display text-sm font-semibold transition-all",
                !saving && weight
                  ? "bg-accent-teal text-bg-primary hover:bg-accent-teal/90"
                  : "bg-bg-card-hover text-text-muted cursor-not-allowed"
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
