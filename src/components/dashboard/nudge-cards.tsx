"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Lightbulb, AlertTriangle, Sparkles, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Nudge {
  id: number;
  date: string;
  nudgeText: string;
  nudgeType: "motivation" | "insight" | "warning" | "suggestion";
  priority: number;
  dismissed: number;
}

const TYPE_CONFIG = {
  motivation: { icon: Flame, border: "border-l-[#22c55e]", iconColor: "text-[#22c55e]" },
  insight: { icon: Lightbulb, border: "border-l-accent-teal", iconColor: "text-accent-teal" },
  warning: { icon: AlertTriangle, border: "border-l-[#f59e0b]", iconColor: "text-[#f59e0b]" },
  suggestion: { icon: Sparkles, border: "border-l-text-muted", iconColor: "text-text-muted" },
} as const;

export function NudgeCards() {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNudges = useCallback(async () => {
    try {
      const res = await fetch("/api/nudges/today");
      if (!res.ok) throw 0;
      const json = await res.json();
      const fetched: Nudge[] = json.data?.nudges ?? [];

      if (fetched.length === 0) {
        // Generate nudges if none exist
        const genRes = await fetch("/api/nudges/generate", { method: "POST" });
        if (genRes.ok) {
          const genJson = await genRes.json();
          setNudges(genJson.data?.nudges ?? []);
        }
      } else {
        setNudges(fetched);
      }
    } catch {
      // Nudges are non-critical — fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNudges();
  }, [fetchNudges]);

  async function dismiss(id: number) {
    setNudges((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch("/api/nudges/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // Best-effort dismiss
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
      </div>
    );
  }

  if (nudges.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border">
      <AnimatePresence mode="popLayout">
        {nudges.map((nudge) => {
          const config = TYPE_CONFIG[nudge.nudgeType] ?? TYPE_CONFIG.suggestion;
          const Icon = config.icon;

          return (
            <motion.div
              key={nudge.id}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "relative flex min-w-[260px] max-w-[320px] shrink-0 gap-3 rounded-lg border border-border border-l-2 bg-bg-card p-3",
                config.border
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-bg-primary">
                <Icon className={cn("h-4 w-4", config.iconColor)} />
              </div>

              <p className="flex-1 text-xs leading-relaxed text-text-secondary pr-5">
                {nudge.nudgeText}
              </p>

              <button
                onClick={() => dismiss(nudge.id)}
                className="absolute right-2 top-2 rounded p-0.5 text-text-muted transition-colors hover:text-text-primary"
                aria-label="Dismiss nudge"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
