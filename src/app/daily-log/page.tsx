"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { VitalsSection } from "@/components/daily-log/vitals-section";
import { NonNegotiablesSection } from "@/components/daily-log/non-negotiables-section";
import { ScoresSection } from "@/components/daily-log/scores-section";
import { NotesSection } from "@/components/daily-log/notes-section";
import { Save, Loader2, CheckCircle2, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VitalsData {
  weight: number | null;
  systolic: number | null;
  diastolic: number | null;
  restingHeartRate: number | null;
  spo2: number | null;
}

interface DailyLogFormData {
  date: string;
  // Non-negotiables
  morningWalk: number;
  walkDurationMinutes: number | null;
  strengthTraining: number;
  ateLunchWithProtein: number;
  mobilityWork: number;
  supplementsTaken: number;
  alcoholFree: number;
  foamRolling: number;
  coldExposure: number;
  heatExposure: number;
  // Scores
  energy: number | null;
  mood: number | null;
  stress: number | null;
  soreness: number | null;
  anxietyLevel: number | null;
  alcoholCraving: number;
  alcoholTrigger: string | null;
  // Notes
  wins: string | null;
  struggles: string | null;
  notes: string | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get today in YYYY-MM-DD format using Eastern Time */
function getTodayET(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}

/** Determine if a YYYY-MM-DD date falls on a rest day (Mon, Wed, Fri, Sun) */
function isRestDay(dateStr: string): boolean {
  // Parse as local date to avoid timezone offset issues
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return [0, 1, 3, 5].includes(dayOfWeek); // Sun, Mon, Wed, Fri
}

/** Format date for display */
function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Build default form state for a given date */
function defaultFormData(date: string): DailyLogFormData {
  return {
    date,
    morningWalk: 0,
    walkDurationMinutes: null,
    strengthTraining: 0,
    ateLunchWithProtein: 0,
    mobilityWork: 0,
    supplementsTaken: 0,
    alcoholFree: 1, // default ON
    foamRolling: 0,
    coldExposure: 0,
    heatExposure: 0,
    energy: null,
    mood: null,
    stress: null,
    soreness: null,
    anxietyLevel: null,
    alcoholCraving: 0,
    alcoholTrigger: null,
    wins: null,
    struggles: null,
    notes: null,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DailyLogPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayET);
  const [formData, setFormData] = useState<DailyLogFormData>(() =>
    defaultFormData(getTodayET())
  );
  const [vitals, setVitals] = useState<VitalsData>({
    weight: null,
    systolic: null,
    diastolic: null,
    restingHeartRate: null,
    spo2: null,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-save debounce ref
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMountedRef = useRef(false);
  // Track whether user has interacted to prevent auto-save on load
  const hasInteractedRef = useRef(false);

  // -------------------------------------------------------------------------
  // Load existing log when date changes
  // -------------------------------------------------------------------------
  const loadLog = useCallback(async (date: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    hasInteractedRef.current = false;

    try {
      const res = await fetch(`/api/daily-log/${date}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setFormData({
            date: d.date,
            morningWalk: d.morningWalk ?? 0,
            walkDurationMinutes: d.walkDurationMinutes ?? null,
            strengthTraining: d.strengthTraining ?? 0,
            ateLunchWithProtein: d.ateLunchWithProtein ?? 0,
            mobilityWork: d.mobilityWork ?? 0,
            supplementsTaken: d.supplementsTaken ?? 0,
            alcoholFree: d.alcoholFree ?? 1,
            foamRolling: d.foamRolling ?? 0,
            coldExposure: d.coldExposure ?? 0,
            heatExposure: d.heatExposure ?? 0,
            energy: d.energy ?? null,
            mood: d.mood ?? null,
            stress: d.stress ?? null,
            soreness: d.soreness ?? null,
            anxietyLevel: d.anxietyLevel ?? null,
            alcoholCraving: d.alcoholCraving ?? 0,
            alcoholTrigger: d.alcoholTrigger ?? null,
            wins: d.wins ?? null,
            struggles: d.struggles ?? null,
            notes: d.notes ?? null,
          });
          setIsEditing(true);
        }
      } else if (res.status === 404) {
        // No log for this date — show empty form
        setFormData(defaultFormData(date));
        setIsEditing(false);
      } else {
        setErrorMessage("Failed to load log data");
      }
    } catch {
      setErrorMessage("Network error loading log");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLog(selectedDate);
  }, [selectedDate, loadLog]);

  // -------------------------------------------------------------------------
  // Auto-save debounce (2 seconds after last change)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (isLoading) return;
    if (!hasInteractedRef.current) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(true);
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, vitals]);

  // -------------------------------------------------------------------------
  // Update handlers
  // -------------------------------------------------------------------------
  const updateFormData = useCallback((partial: Partial<DailyLogFormData>) => {
    hasInteractedRef.current = true;
    setFormData((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateVitals = useCallback((partial: Partial<VitalsData>) => {
    hasInteractedRef.current = true;
    setVitals((prev) => ({ ...prev, ...partial }));
  }, []);

  // -------------------------------------------------------------------------
  // Save handler
  // -------------------------------------------------------------------------
  const handleSave = async (isAutoSave = false) => {
    if (!isAutoSave) {
      // Cancel any pending auto-save
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    }

    setSaveStatus("saving");
    setErrorMessage(null);

    try {
      // 1) Save the daily log
      const logPayload = { ...formData, date: selectedDate };
      let logRes: Response;

      if (isEditing) {
        logRes = await fetch(`/api/daily-log/${selectedDate}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(logPayload),
        });
      } else {
        logRes = await fetch("/api/daily-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(logPayload),
        });
      }

      if (!logRes.ok) {
        const errJson = await logRes.json().catch(() => null);
        throw new Error(
          errJson?.error || `Save failed (${logRes.status})`
        );
      }

      // After first save, we switch to edit mode
      setIsEditing(true);

      // 2) Save vitals if any data is provided
      const hasVitals =
        vitals.systolic !== null ||
        vitals.diastolic !== null ||
        vitals.restingHeartRate !== null ||
        vitals.spo2 !== null;

      if (hasVitals) {
        await fetch("/api/vitals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: selectedDate,
            timeOfDay: "morning",
            systolic: vitals.systolic,
            diastolic: vitals.diastolic,
            restingHeartRate: vitals.restingHeartRate,
            spo2: vitals.spo2,
          }),
        });
      }

      // 3) Save weight to body metrics if provided
      if (vitals.weight !== null) {
        await fetch("/api/metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: selectedDate,
            weight: vitals.weight,
          }),
        });
      }

      setSaveStatus("saved");
      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save"
      );
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  };

  // -------------------------------------------------------------------------
  // Date change handler
  // -------------------------------------------------------------------------
  const handleDateChange = (newDate: string) => {
    // Cancel any pending auto-save before switching
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setSelectedDate(newDate);
    setVitals({
      weight: null,
      systolic: null,
      diastolic: null,
      restingHeartRate: null,
      spo2: null,
    });
    setSaveStatus("idle");
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const restDay = isRestDay(selectedDate);
  const isToday = selectedDate === getTodayET();

  return (
    <div>
      <PageHeader
        title="Daily Log"
        subtitle="Fast daily check-in \u2014 completable in under 2 minutes"
        actions={
          <div className="flex items-center gap-2">
            {isEditing && (
              <span className="rounded-full bg-accent-amber-dim px-2.5 py-1 font-display text-xs text-accent-amber">
                Editing
              </span>
            )}
            {restDay && (
              <span className="rounded-full bg-bg-card-hover px-2.5 py-1 font-display text-xs text-text-muted">
                Rest Day
              </span>
            )}
          </div>
        }
      />

      <div className="mx-auto max-w-2xl space-y-4">
        {/* -------- Date Selector -------- */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-card pl-10 pr-3 py-2.5 font-display text-sm text-text-primary tabular-nums focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors [color-scheme:dark]"
            />
          </div>
          {!isToday && (
            <button
              type="button"
              onClick={() => handleDateChange(getTodayET())}
              className="rounded-lg border border-border bg-bg-card px-3 py-2.5 font-display text-xs text-text-secondary hover:text-accent-teal hover:border-accent-teal transition-colors"
            >
              Today
            </button>
          )}
        </div>

        {/* Date display */}
        <p className="text-xs text-text-muted font-body">
          {formatDateDisplay(selectedDate)}
          {isToday && " \u2014 Today"}
        </p>

        {/* -------- Loading State -------- */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-accent-teal" />
            <span className="ml-2 text-sm text-text-secondary">
              Loading...
            </span>
          </div>
        ) : (
          <>
            {/* -------- Error Message -------- */}
            {errorMessage && saveStatus !== "saving" && (
              <div className="rounded-lg border border-accent-red/30 bg-accent-red-dim px-4 py-3 text-sm text-accent-red">
                {errorMessage}
              </div>
            )}

            {/* -------- Vitals Section -------- */}
            <VitalsSection data={vitals} onChange={updateVitals} />

            {/* -------- Non-Negotiables Section -------- */}
            <NonNegotiablesSection
              data={{
                morningWalk: formData.morningWalk,
                walkDurationMinutes: formData.walkDurationMinutes,
                strengthTraining: formData.strengthTraining,
                ateLunchWithProtein: formData.ateLunchWithProtein,
                mobilityWork: formData.mobilityWork,
                supplementsTaken: formData.supplementsTaken,
                alcoholFree: formData.alcoholFree,
                foamRolling: formData.foamRolling,
                coldExposure: formData.coldExposure,
                heatExposure: formData.heatExposure,
              }}
              onChange={updateFormData}
              isRestDay={restDay}
            />

            {/* -------- Scores Section -------- */}
            <ScoresSection
              data={{
                energy: formData.energy,
                mood: formData.mood,
                stress: formData.stress,
                soreness: formData.soreness,
                anxietyLevel: formData.anxietyLevel,
                alcoholCraving: formData.alcoholCraving,
                alcoholTrigger: formData.alcoholTrigger,
              }}
              onChange={updateFormData}
            />

            {/* -------- Notes Section -------- */}
            <NotesSection
              data={{
                wins: formData.wins,
                struggles: formData.struggles,
                notes: formData.notes,
              }}
              onChange={updateFormData}
            />

            {/* -------- Save Button -------- */}
            <div className="pt-2 pb-8">
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saveStatus === "saving"}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3.5 font-display text-sm font-semibold tracking-wide transition-all duration-150",
                  saveStatus === "saved"
                    ? "bg-accent-green/20 border border-accent-green/30 text-accent-green"
                    : saveStatus === "error"
                      ? "bg-accent-red/20 border border-accent-red/30 text-accent-red"
                      : "bg-accent-green border border-accent-green text-bg-primary hover:bg-accent-green/90 active:scale-[0.98]",
                  saveStatus === "saving" && "opacity-70 cursor-not-allowed"
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
                    Saved Successfully
                  </>
                ) : saveStatus === "error" ? (
                  <>
                    Save Failed — Tap to Retry
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Log
                  </>
                )}
              </button>

              {/* Auto-save indicator */}
              {saveStatus === "idle" && hasInteractedRef.current && (
                <p className="mt-2 text-center text-xs text-text-muted">
                  Auto-saves after 2 seconds of inactivity
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
