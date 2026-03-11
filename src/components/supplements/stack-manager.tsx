"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus, Trash2, Settings2, Loader2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StackItem {
  supplementName: string;
  dose: string | null;
  timeOfDay: string | null;
}

interface StackManagerProps {
  stack: StackItem[];
  onUpdateStack: (newStack: StackItem[]) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StackManager({ stack, onUpdateStack }: StackManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDose, setNewDose] = useState("");
  const [newTime, setNewTime] = useState("morning");
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;

    const newItem: StackItem = {
      supplementName: newName.trim(),
      dose: newDose.trim() || null,
      timeOfDay: newTime,
    };

    const updatedStack = [...stack, newItem];
    setIsSaving(true);
    try {
      await onUpdateStack(updatedStack);
      setNewName("");
      setNewDose("");
      setNewTime("morning");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (index: number) => {
    const updatedStack = stack.filter((_, i) => i !== index);
    setIsSaving(true);
    try {
      await onUpdateStack(updatedStack);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-accent-amber" />
          <CardTitle className="mb-0">Manage Stack</CardTitle>
          <span className="rounded-full px-2 py-0.5 font-display text-xs tabular-nums bg-accent-teal-dim text-accent-teal">
            {stack.length} supplements
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-text-muted" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Current Stack List */}
              {stack.length > 0 && (
                <div className="space-y-1.5">
                  {stack.map((item, index) => (
                    <div
                      key={`${item.supplementName}-${item.timeOfDay}-${index}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-bg-primary px-4 py-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-text-primary truncate">
                          {item.supplementName}
                        </p>
                        <p className="text-xs text-text-muted">
                          {item.dose || "No dose"} &middot;{" "}
                          {item.timeOfDay
                            ? item.timeOfDay.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                            : "Unscheduled"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        disabled={isSaving}
                        className="shrink-0 rounded-md p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red-dim transition-colors disabled:opacity-50"
                        title="Remove supplement"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Supplement Form */}
              <div className="rounded-lg border border-border bg-bg-primary p-3 space-y-3">
                <p className="font-display text-xs text-text-secondary uppercase tracking-wide">
                  Add Supplement
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    type="text"
                    placeholder="Name (e.g., Fish Oil)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 font-body text-sm text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Dose (e.g., 2g)"
                    value={newDose}
                    onChange={(e) => setNewDose(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 font-body text-sm text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
                  />
                  <select
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 font-body text-sm text-text-primary focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors [color-scheme:dark]"
                  >
                    <option value="morning">Morning</option>
                    <option value="dinner">Dinner</option>
                    <option value="before_bed">Before Bed</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!newName.trim() || isSaving}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-display text-sm font-semibold tracking-wide transition-all duration-150",
                    "bg-accent-teal border border-accent-teal text-bg-primary hover:bg-accent-teal/90 active:scale-[0.98]",
                    (!newName.trim() || isSaving) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add to Stack
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
