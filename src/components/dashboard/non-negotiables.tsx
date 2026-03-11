"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import {
  Footprints,
  Dumbbell,
  Beef,
  StretchHorizontal,
  Pill,
  Check,
} from "lucide-react";

interface NonNegotiablesProps {
  date: string;
  initialValues: {
    morningWalk: boolean;
    walkDurationMinutes: number | null;
    strengthTraining: boolean;
    ateLunchWithProtein: boolean;
    mobilityWork: boolean;
    supplementsTaken: boolean;
  };
  isRestDay: boolean;
  logExists: boolean;
}

interface ToggleItem {
  key: string;
  label: string;
  field: keyof NonNegotiablesProps["initialValues"];
  icon: React.ReactNode;
  disabled?: boolean;
  disabledLabel?: string;
}

export function NonNegotiables({ date, initialValues, isRestDay, logExists }: NonNegotiablesProps) {
  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState<string | null>(null);
  const logCreated = useRef(logExists);

  const items: ToggleItem[] = [
    {
      key: "walk",
      label: "Morning Walk",
      field: "morningWalk",
      icon: <Footprints className="h-5 w-5" />,
    },
    {
      key: "strength",
      label: "Strength Training",
      field: "strengthTraining",
      icon: <Dumbbell className="h-5 w-5" />,
      disabled: isRestDay,
      disabledLabel: "Rest Day",
    },
    {
      key: "lunch",
      label: "Lunch w/ Protein",
      field: "ateLunchWithProtein",
      icon: <Beef className="h-5 w-5" />,
    },
    {
      key: "mobility",
      label: "Mobility Work",
      field: "mobilityWork",
      icon: <StretchHorizontal className="h-5 w-5" />,
    },
    {
      key: "supplements",
      label: "Supplements",
      field: "supplementsTaken",
      icon: <Pill className="h-5 w-5" />,
    },
  ];

  const toggle = useCallback(
    async (field: keyof NonNegotiablesProps["initialValues"]) => {
      if (field === "walkDurationMinutes") return;

      const newValue = !values[field];
      const fieldKey = field as string;
      setSaving(fieldKey);

      // Optimistic update
      setValues((prev) => ({ ...prev, [field]: newValue }));

      try {
        // The API uses camelCase field names (matching Zod schema)
        const payload = { [field]: newValue ? 1 : 0 };

        if (!logCreated.current) {
          // No daily log exists yet — create one via POST
          const res = await fetch("/api/daily-log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date, ...payload }),
          });
          if (res.ok || res.status === 409) {
            // 409 means it already existed (race condition), which is fine
            logCreated.current = true;
            if (res.status === 409) {
              // Update via PUT since it already exists
              await fetch(`/api/daily-log/${date}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
            }
          }
        } else {
          // Log exists — update via PUT
          await fetch(`/api/daily-log/${date}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
      } catch {
        // Revert on error
        setValues((prev) => ({ ...prev, [field]: !newValue }));
      } finally {
        setSaving(null);
      }
    },
    [values, date]
  );

  const completedCount = items.filter((item) => {
    if (item.disabled) return true; // Rest day counts as "done"
    return values[item.field] as boolean;
  }).length;

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardTitle>
        <span className="flex items-center justify-between">
          <span>Non-Negotiables</span>
          <span className="font-display text-xs tabular-nums text-text-muted normal-case tracking-normal">
            {completedCount}/{items.length}
          </span>
        </span>
      </CardTitle>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {items.map((item, i) => {
            const isChecked = item.disabled ? false : (values[item.field] as boolean);
            const isDisabled = item.disabled;

            return (
              <motion.button
                key={item.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                onClick={() => !isDisabled && toggle(item.field)}
                disabled={isDisabled || saving === item.field.toString()}
                className={`
                  relative flex flex-col items-center gap-2 rounded-lg border p-3 sm:p-4 transition-all duration-200
                  ${
                    isDisabled
                      ? "cursor-not-allowed border-border/50 bg-bg-card opacity-40"
                      : isChecked
                      ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
                      : "border-border bg-bg-card hover:bg-bg-card-hover hover:border-border-hover text-text-muted cursor-pointer"
                  }
                `}
              >
                {/* Check overlay */}
                {isChecked && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-1.5 top-1.5"
                  >
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-accent-green">
                      <Check className="h-2.5 w-2.5 text-bg-primary" strokeWidth={3} />
                    </div>
                  </motion.div>
                )}

                <div
                  className={
                    isChecked ? "text-accent-green" : isDisabled ? "text-text-muted/50" : "text-text-muted"
                  }
                >
                  {item.icon}
                </div>

                <span className="text-[11px] font-display font-medium tracking-wide text-center leading-tight">
                  {isDisabled ? item.disabledLabel : item.label}
                </span>

                {/* Walk duration display */}
                {item.key === "walk" && isChecked && values.walkDurationMinutes && (
                  <span className="text-[10px] tabular-nums text-accent-green/70">
                    {values.walkDurationMinutes}min
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

