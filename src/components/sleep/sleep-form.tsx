"use client";

import { useState, useEffect, useMemo } from "react";
import { Moon, Save, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SleepLogEntry {
  id: number;
  date: string;
  bedtime: string | null;
  wakeTime: string | null;
  totalHours: number | null;
  sleepQuality: number | null;
  timeToFallAsleepMinutes: number | null;
  wakeUps: number | null;
  bipapUsed: number | null;
  notes: string | null;
  createdAt: string | null;
}

interface SleepFormProps {
  date: string;
  existingEntry: SleepLogEntry | null;
  onSave: (data: SleepFormData) => Promise<void>;
}

export interface SleepFormData {
  date: string;
  bedtime: string | null;
  wakeTime: string | null;
  totalHours: number | null;
  sleepQuality: number | null;
  timeToFallAsleepMinutes: number | null;
  wakeUps: number | null;
  bipapUsed: number;
  notes: string | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculates total hours between bedtime and wake time.
 * Handles crossing midnight (e.g. 22:30 -> 06:00 = 7.5 hrs).
 */
function calculateTotalHours(bedtime: string, wakeTime: string): number | null {
  if (!bedtime || !wakeTime) return null;

  const [bH, bM] = bedtime.split(":").map(Number);
  const [wH, wM] = wakeTime.split(":").map(Number);

  let bedMinutes = bH * 60 + bM;
  let wakeMinutes = wH * 60 + wM;

  // If wake is before bed, assume it crosses midnight
  if (wakeMinutes <= bedMinutes) {
    wakeMinutes += 24 * 60;
  }

  const diffMinutes = wakeMinutes - bedMinutes;
  return Math.round((diffMinutes / 60) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SleepForm({ date, existingEntry, onSave }: SleepFormProps) {
  const [bedtime, setBedtime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [fallAsleep, setFallAsleep] = useState("");
  const [wakeUps, setWakeUps] = useState("");
  const [bipapUsed, setBipapUsed] = useState(1);
  const [notes, setNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill from existing entry
  useEffect(() => {
    if (existingEntry) {
      setBedtime(existingEntry.bedtime || "");
      setWakeTime(existingEntry.wakeTime || "");
      setSleepQuality(existingEntry.sleepQuality);
      setFallAsleep(existingEntry.timeToFallAsleepMinutes != null ? String(existingEntry.timeToFallAsleepMinutes) : "");
      setWakeUps(existingEntry.wakeUps != null ? String(existingEntry.wakeUps) : "");
      setBipapUsed(existingEntry.bipapUsed ?? 1);
      setNotes(existingEntry.notes || "");
    } else {
      setBedtime("");
      setWakeTime("");
      setSleepQuality(null);
      setFallAsleep("");
      setWakeUps("");
      setBipapUsed(1);
      setNotes("");
    }
  }, [existingEntry, date]);

  // Auto-calculated total hours
  const totalHours = useMemo(() => {
    return calculateTotalHours(bedtime, wakeTime);
  }, [bedtime, wakeTime]);

  const handleSave = async () => {
    setSaveStatus("saving");
    setErrorMessage(null);

    const formData: SleepFormData = {
      date,
      bedtime: bedtime || null,
      wakeTime: wakeTime || null,
      totalHours,
      sleepQuality,
      timeToFallAsleepMinutes: fallAsleep ? parseInt(fallAsleep, 10) : null,
      wakeUps: wakeUps ? parseInt(wakeUps, 10) : null,
      bipapUsed,
      notes: notes || null,
    };

    try {
      await onSave(formData);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to save");
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  };

  const qualityNumbers = Array.from({ length: 10 }, (_, i) => i + 1);
  const hasAnyValue = bedtime || wakeTime || sleepQuality !== null;

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Moon className="h-4 w-4 text-accent-teal" />
        <CardTitle>{existingEntry ? "Edit Sleep Log" : "Log Sleep"}</CardTitle>
      </div>
      <CardContent className="mt-3">
        {errorMessage && saveStatus !== "saving" && (
          <div className="mb-3 rounded-lg border border-accent-red/30 bg-accent-red-dim px-4 py-3 text-sm text-accent-red">
            {errorMessage}
          </div>
        )}

        <div className="space-y-4">
          {/* Bedtime + Wake Time */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-display text-xs text-text-secondary">
                Bedtime
              </label>
              <input
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 font-display text-sm text-text-primary tabular-nums focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="mb-1 block font-display text-xs text-text-secondary">
                Wake Time
              </label>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 font-display text-sm text-text-primary tabular-nums focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Auto-calculated Total Hours */}
          {totalHours !== null && (
            <div className="rounded-lg border border-accent-teal/20 bg-accent-teal-dim/30 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs text-text-secondary uppercase tracking-wide">
                  Total Sleep
                </span>
                <span className={cn(
                  "font-display text-xl font-bold tabular-nums",
                  totalHours >= 7 && totalHours <= 9 ? "text-accent-green" : totalHours >= 6 ? "text-accent-amber" : "text-accent-red"
                )}>
                  {totalHours.toFixed(1)}
                  <span className="text-sm text-text-muted ml-1">hrs</span>
                </span>
              </div>
            </div>
          )}

          {/* Sleep Quality 1-10 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-body text-xs text-text-secondary">
                Sleep Quality
              </label>
              {sleepQuality !== null && (
                <span className="font-display text-xs tabular-nums text-accent-teal">
                  {sleepQuality}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {qualityNumbers.map((num) => {
                const isSelected = sleepQuality === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSleepQuality(sleepQuality === num ? null : num)}
                    className={cn(
                      "flex h-9 w-full max-w-[36px] items-center justify-center rounded-md border text-xs font-display tabular-nums transition-all duration-100",
                      isSelected
                        ? "border-accent-teal bg-accent-teal text-bg-primary font-bold"
                        : "border-border bg-bg-primary text-text-muted hover:border-border-hover hover:text-text-secondary"
                    )}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time to Fall Asleep + Wake-ups */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-display text-xs text-text-secondary">
                Time to Fall Asleep (min)
              </label>
              <input
                type="number"
                min={0}
                placeholder="15"
                value={fallAsleep}
                onChange={(e) => setFallAsleep(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 font-display text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
              />
            </div>
            <div>
              <label className="mb-1 block font-display text-xs text-text-secondary">
                Wake-ups
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={wakeUps}
                onChange={(e) => setWakeUps(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 font-display text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
              />
            </div>
          </div>

          {/* BiPAP Toggle */}
          <div>
            <label className="mb-2 block font-display text-xs text-text-secondary">
              BiPAP Used
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBipapUsed(1)}
                className={cn(
                  "flex-1 rounded-lg border px-4 py-2.5 font-display text-sm font-semibold transition-all duration-150",
                  bipapUsed === 1
                    ? "border-accent-green bg-accent-green-dim text-accent-green"
                    : "border-border bg-bg-primary text-text-muted hover:border-border-hover"
                )}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setBipapUsed(0)}
                className={cn(
                  "flex-1 rounded-lg border px-4 py-2.5 font-display text-sm font-semibold transition-all duration-150",
                  bipapUsed === 0
                    ? "border-accent-amber bg-accent-amber-dim text-accent-amber"
                    : "border-border bg-bg-primary text-text-muted hover:border-border-hover"
                )}
              >
                No
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block font-display text-xs text-text-secondary">
              Notes (optional)
            </label>
            <textarea
              placeholder="How was your sleep? Any disturbances?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 font-body text-sm text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors resize-none"
            />
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === "saving" || !hasAnyValue}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-display text-sm font-semibold tracking-wide transition-all duration-150",
              saveStatus === "saved"
                ? "bg-accent-green/20 border border-accent-green/30 text-accent-green"
                : saveStatus === "error"
                  ? "bg-accent-red/20 border border-accent-red/30 text-accent-red"
                  : "bg-accent-teal border border-accent-teal text-bg-primary hover:bg-accent-teal/90 active:scale-[0.98]",
              (saveStatus === "saving" || !hasAnyValue) && "opacity-50 cursor-not-allowed"
            )}
          >
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saveStatus === "saved" ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </>
            ) : saveStatus === "error" ? (
              "Save Failed"
            ) : (
              <>
                <Save className="h-4 w-4" />
                {existingEntry ? "Update Sleep Log" : "Save Sleep Log"}
              </>
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
