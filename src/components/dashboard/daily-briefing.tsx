"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BriefingSection } from "./briefing-section";
import {
  RefreshCw, Loader2, Scale, Pill, HeartPulse, UtensilsCrossed,
  ClipboardCheck, Moon, Footprints, Check, AlertCircle, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPLEMENT_PURPOSES } from "@/lib/constants";

function todayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

interface Briefing {
  greeting: string;
  body_status: string;
  right_now: string;
  right_now_actions: string[];
  training: string;
  training_actions: string[];
  nutrition: string;
  nutrition_actions: string[];
  patterns: string;
  week_ahead: string;
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Shared UI helpers
// ---------------------------------------------------------------------------
const inputCls = "rounded-md border border-border bg-bg-primary px-3 py-2 font-display text-sm tabular-nums text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none w-full";
const btnCls = "rounded-md bg-accent-teal px-4 py-2 font-display text-sm font-semibold text-bg-primary transition-opacity disabled:opacity-50 hover:opacity-90";
const labelCls = "font-display text-xs text-text-secondary tracking-wide mb-1 block";

// ---------------------------------------------------------------------------
// Inline Action Forms
// ---------------------------------------------------------------------------
function WeightForm({ onDone }: { onDone: () => void }) {
  const [val, setVal] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <form className="flex items-end gap-2" onSubmit={async (e) => {
      e.preventDefault();
      if (!val) return;
      setSaving(true);
      await fetch("/api/metrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: todayET(), weight: parseFloat(val) }) });
      setSaving(false);
      onDone();
    }}>
      <div className="flex-1">
        <label className={labelCls}>Weight (lbs)</label>
        <input type="number" step="0.1" value={val} onChange={(e) => setVal(e.target.value)} placeholder="e.g. 195.5" className={inputCls} autoFocus />
      </div>
      <button type="submit" disabled={saving || !val} className={btnCls}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</button>
    </form>
  );
}

function VitalsForm({ onDone }: { onDone: () => void }) {
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [hr, setHr] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <form className="space-y-2" onSubmit={async (e) => {
      e.preventDefault();
      setSaving(true);
      await fetch("/api/vitals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: todayET(), systolic: sys ? parseInt(sys) : null, diastolic: dia ? parseInt(dia) : null, restingHeartRate: hr ? parseInt(hr) : null }) });
      setSaving(false);
      onDone();
    }}>
      <div className="grid grid-cols-3 gap-2">
        <div><label className={labelCls}>Systolic</label><input type="number" value={sys} onChange={(e) => setSys(e.target.value)} placeholder="120" className={inputCls} /></div>
        <div><label className={labelCls}>Diastolic</label><input type="number" value={dia} onChange={(e) => setDia(e.target.value)} placeholder="80" className={inputCls} /></div>
        <div><label className={labelCls}>Heart Rate</label><input type="number" value={hr} onChange={(e) => setHr(e.target.value)} placeholder="65" className={inputCls} /></div>
      </div>
      <button type="submit" disabled={saving} className={btnCls}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Vitals"}</button>
    </form>
  );
}

function SupplementsForm({ group, onDone }: { group: "morning" | "dinner" | "before_bed"; onDone: () => void }) {
  const [supps, setSupps] = useState<{ supplementName: string; dose: string | null; taken: boolean }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/supplements/log/${todayET()}`);
      const json = await res.json();
      if (json.success) {
        const filtered = (json.data as Array<{ supplementName: string; dose: string | null; taken: number | null; timeOfDay: string | null }>)
          .filter((s) => s.timeOfDay === group)
          .map((s) => ({ supplementName: s.supplementName, dose: s.dose, taken: s.taken === 1 }));
        setSupps(filtered);
      }
      setLoaded(true);
    })();
  }, [group]);

  const toggle = async (name: string, taken: boolean) => {
    setSupps((prev) => prev.map((s) => s.supplementName === name ? { ...s, taken } : s));
    await fetch(`/api/supplements/log/${todayET()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplementName: name, taken: taken ? 1 : 0 }),
    });
    if (supps.every((s) => s.supplementName === name ? taken : s.taken)) {
      onDone();
    }
  };

  if (!loaded) return <Loader2 className="h-4 w-4 animate-spin text-text-muted" />;
  if (supps.length === 0) return <p className="text-xs text-text-muted italic">No {group} supplements configured.</p>;

  return (
    <div className="space-y-1.5">
      {supps.map((s) => (
        <label key={s.supplementName} className="flex items-start gap-2.5 cursor-pointer group">
          <div
            onClick={() => toggle(s.supplementName, !s.taken)}
            className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer", s.taken ? "border-accent-teal bg-accent-teal" : "border-text-muted group-hover:border-accent-teal/50")}
          >
            {s.taken && <Check className="h-3 w-3 text-bg-primary" strokeWidth={3} />}
          </div>
          <div className="min-w-0">
            <span className={cn("text-sm", s.taken ? "text-text-muted line-through" : "text-text-primary")}>
              {s.supplementName} {s.dose ? <span className="text-text-muted">({s.dose})</span> : null}
            </span>
            {SUPPLEMENT_PURPOSES[s.supplementName] && (
              <span className="block text-[10px] text-text-muted/70 leading-tight mt-0.5">
                {SUPPLEMENT_PURPOSES[s.supplementName]}
              </span>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

function MealForm({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<{ items: Array<{ name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number }>; totals: { calories: number; protein_g: number } } | null>(null);
  const [saving, setSaving] = useState(false);

  const parse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    const res = await fetch("/api/nutrition/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    const json = await res.json();
    if (json.success) setParsed(json.data);
    setParsing(false);
  };

  const save = async () => {
    if (!parsed) return;
    setSaving(true);
    const etHour = parseInt(new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }), 10);
    const mealType = etHour < 11 ? "breakfast" : etHour < 15 ? "lunch" : etHour < 17 ? "snack" : "dinner";
    for (const item of parsed.items) {
      await fetch("/api/nutrition", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        date: todayET(), mealType, description: item.name, calories: item.calories, proteinG: item.protein_g, carbsG: item.carbs_g, fatG: item.fat_g, fiberG: item.fiber_g, source: "ai_parsed",
      }) });
    }
    setSaving(false);
    setParsed(null);
    setText("");
    onDone();
  };

  if (parsed) {
    return (
      <div className="space-y-2">
        <div className="rounded-md border border-border bg-bg-primary p-3 space-y-1">
          {parsed.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-text-primary">{item.name}</span>
              <span className="text-text-muted tabular-nums font-display">{item.calories}cal · {item.protein_g}g pro</span>
            </div>
          ))}
          <div className="border-t border-border pt-1 mt-1 flex justify-between text-sm font-semibold">
            <span className="text-accent-teal">Total</span>
            <span className="text-accent-teal tabular-nums font-display">{parsed.totals.calories}cal · {parsed.totals.protein_g}g pro</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className={btnCls}>{saving ? "Saving..." : "Confirm & Save"}</button>
          <button onClick={() => { setParsed(null); setText(""); }} className="rounded-md border border-border px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors">Edit</button>
        </div>
      </div>
    );
  }

  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); parse(); }}>
      <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="What did you eat? e.g. 3 eggs, toast, coffee" className={cn(inputCls, "flex-1")} />
      <button type="submit" disabled={parsing || !text.trim()} className={btnCls}>{parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Parse"}</button>
    </form>
  );
}

function CheckinForm({ onDone }: { onDone: () => void }) {
  const [energy, setEnergy] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [soreness, setSoreness] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const ScoreRow = ({ label, value, onChange }: { label: string; value: number | null; onChange: (n: number) => void }) => (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} className={cn("h-7 w-7 rounded text-xs font-display font-semibold transition-all", value === n ? "bg-accent-teal text-bg-primary" : "bg-bg-primary border border-border text-text-muted hover:border-accent-teal/40")}>{n}</button>
        ))}
      </div>
    </div>
  );

  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      setSaving(true);
      const date = todayET();
      // Try PUT first, fall back to POST
      let res = await fetch(`/api/daily-log/${date}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ energy, mood, stress, soreness }) });
      if (res.status === 404) {
        res = await fetch("/api/daily-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, energy, mood, stress, soreness }) });
      }
      setSaving(false);
      onDone();
    }}>
      <ScoreRow label="Energy" value={energy} onChange={setEnergy} />
      <ScoreRow label="Mood" value={mood} onChange={setMood} />
      <ScoreRow label="Stress" value={stress} onChange={setStress} />
      <ScoreRow label="Soreness" value={soreness} onChange={setSoreness} />
      <button type="submit" disabled={saving} className={btnCls}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Check-in"}</button>
    </form>
  );
}

function SleepForm({ onDone }: { onDone: () => void }) {
  const [bedtime, setBedtime] = useState("");
  const [wake, setWake] = useState("");
  const [quality, setQuality] = useState<number | null>(null);
  const [bipap, setBipap] = useState(true);
  const [saving, setSaving] = useState(false);

  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      setSaving(true);
      const totalHours = bedtime && wake ? (() => {
        const [bh, bm] = bedtime.split(":").map(Number);
        const [wh, wm] = wake.split(":").map(Number);
        let diff = (wh * 60 + wm) - (bh * 60 + bm);
        if (diff < 0) diff += 24 * 60;
        return Math.round(diff / 6) / 10;
      })() : null;
      await fetch("/api/sleep", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: todayET(), bedtime, wakeTime: wake, totalHours, sleepQuality: quality, bipapUsed: bipap ? 1 : 0 }) });
      setSaving(false);
      onDone();
    }}>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Bedtime</label><input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Wake time</label><input type="time" value={wake} onChange={(e) => setWake(e.target.value)} className={inputCls} /></div>
      </div>
      <div>
        <label className={labelCls}>Quality (1-10)</label>
        <div className="flex gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" onClick={() => setQuality(n)} className={cn("h-7 w-7 rounded text-xs font-display font-semibold transition-all", quality === n ? "bg-accent-teal text-bg-primary" : "bg-bg-primary border border-border text-text-muted hover:border-accent-teal/40")}>{n}</button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <div onClick={() => setBipap(!bipap)} className={cn("flex h-5 w-5 items-center justify-center rounded border transition-colors cursor-pointer", bipap ? "border-accent-teal bg-accent-teal" : "border-text-muted")}>
          {bipap && <Check className="h-3 w-3 text-bg-primary" strokeWidth={3} />}
        </div>
        <span className="text-sm text-text-secondary">BiPAP used</span>
      </label>
      <button type="submit" disabled={saving} className={btnCls}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Sleep"}</button>
    </form>
  );
}

function WalkForm({ onDone }: { onDone: () => void }) {
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <form className="flex gap-2 items-end" onSubmit={async (e) => {
      e.preventDefault();
      setSaving(true);
      const date = todayET();
      let res = await fetch(`/api/daily-log/${date}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ morningWalk: 1, walkDurationMinutes: duration ? parseInt(duration) : null }) });
      if (res.status === 404) {
        res = await fetch("/api/daily-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, morningWalk: 1, walkDurationMinutes: duration ? parseInt(duration) : null }) });
      }
      setSaving(false);
      onDone();
    }}>
      <div className="flex-1">
        <label className={labelCls}>Walk duration (min)</label>
        <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="25" className={inputCls} />
      </div>
      <button type="submit" disabled={saving} className={btnCls}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log Walk"}</button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Action form renderer
// ---------------------------------------------------------------------------
function ActionForm({ actionId, onDone }: { actionId: string; onDone: () => void }) {
  switch (actionId) {
    case "weight": return <WeightForm onDone={onDone} />;
    case "vitals": return <VitalsForm onDone={onDone} />;
    case "supplements_morning": return <SupplementsForm group="morning" onDone={onDone} />;
    case "supplements_dinner": return <SupplementsForm group="dinner" onDone={onDone} />;
    case "supplements_before_bed": return <SupplementsForm group="before_bed" onDone={onDone} />;
    case "meal": return <MealForm onDone={onDone} />;
    case "checkin": return <CheckinForm onDone={onDone} />;
    case "sleep": return <SleepForm onDone={onDone} />;
    case "walk": return <WalkForm onDone={onDone} />;
    default: return null;
  }
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  weight: Scale, vitals: HeartPulse, supplements_morning: Pill,
  supplements_dinner: Pill, supplements_before_bed: Pill,
  meal: UtensilsCrossed, checkin: ClipboardCheck, sleep: Moon, walk: Footprints,
};

// ---------------------------------------------------------------------------
// Main Daily Briefing Component
// ---------------------------------------------------------------------------
export function DailyBriefing({ sobrietyDays }: { sobrietyDays: number }) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());

  const fetchBriefing = useCallback(async (forceGenerate = false) => {
    setError(null);
    if (forceGenerate) {
      setGenerating(true);
      const res = await fetch("/api/briefing/generate", { method: "POST" });
      const json = await res.json();
      setGenerating(false);
      if (json.success) { setBriefing(json.data.briefing); setLoading(false); return; }
      setError(json.error || "Failed to generate briefing");
      setLoading(false);
      return;
    }
    // Try cached first
    const res = await fetch("/api/briefing/today");
    const json = await res.json();
    if (json.success && json.data.briefing) {
      setBriefing(json.data.briefing);
      setLoading(false);
      return;
    }
    // No cache or stale — generate
    await fetchBriefing(true);
  }, []);

  useEffect(() => { fetchBriefing(); }, [fetchBriefing]);

  const handleActionDone = (actionId: string) => {
    setCompletedActions((prev) => new Set([...prev, actionId]));
  };

  const handleRefresh = async () => {
    await fetch("/api/briefing/refresh", { method: "POST" });
    await fetchBriefing(true);
  };

  if (loading && !generating) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6 flex items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-accent-teal" />
        <span className="text-sm text-text-muted">Loading your briefing...</span>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6 flex flex-col items-center justify-center gap-3">
        <Sparkles className="h-6 w-6 text-accent-teal animate-pulse" />
        <span className="text-sm text-text-muted">Your coach is reviewing your data...</span>
        <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error || !briefing) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6">
        <div className="flex items-center gap-2 text-accent-red mb-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error || "Could not load briefing"}</span>
        </div>
        <button onClick={() => fetchBriefing(true)} className={btnCls}>Try Again</button>
      </div>
    );
  }

  const renderActions = (actions: string[]) => {
    const pending = actions.filter((a) => !completedActions.has(a));
    if (pending.length === 0) return null;
    return (
      <div className="space-y-3 mt-3">
        {pending.map((actionId) => {
          const Icon = ACTION_ICONS[actionId];
          return (
            <motion.div key={actionId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-border bg-bg-primary p-3">
              {Icon && (
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-3.5 w-3.5 text-accent-teal" />
                  <span className="font-display text-[10px] uppercase tracking-wider text-text-muted">{actionId.replace(/_/g, " ")}</span>
                </div>
              )}
              <ActionForm actionId={actionId} onDone={() => handleActionDone(actionId)} />
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      {/* Greeting header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-display font-bold text-text-primary leading-tight">
              {briefing.greeting}
            </p>
            <p className="text-xs text-text-muted mt-1 font-display tabular-nums">
              Day {sobrietyDays} alcohol-free
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[10px] font-display text-text-muted hover:text-accent-teal hover:border-accent-teal/30 transition-colors"
            title="Refresh briefing"
          >
            <RefreshCw className={cn("h-3 w-3", generating && "animate-spin")} />
            Update
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="px-5 pb-5 space-y-4">
        {briefing.body_status && (
          <BriefingSection title="Body Status" content={briefing.body_status} accent="teal" />
        )}

        {briefing.right_now && (
          <BriefingSection title="Right Now" content={briefing.right_now} accent="green">
            {renderActions(briefing.right_now_actions || [])}
          </BriefingSection>
        )}

        {briefing.training && (
          <BriefingSection title="Training" content={briefing.training} accent="amber">
            {renderActions(briefing.training_actions || [])}
          </BriefingSection>
        )}

        {briefing.nutrition && (
          <BriefingSection title="Nutrition" content={briefing.nutrition} accent="teal">
            {renderActions(briefing.nutrition_actions || [])}
          </BriefingSection>
        )}

        {briefing.patterns && (
          <BriefingSection title="Patterns & Flags" content={briefing.patterns} accent="amber" />
        )}

        {briefing.week_ahead && (
          <BriefingSection title="This Week" content={briefing.week_ahead} accent="muted" />
        )}
      </div>

      {/* Completed actions summary */}
      <AnimatePresence>
        {completedActions.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="px-5 pb-4"
          >
            <div className="rounded-md bg-accent-green/10 border border-accent-green/20 px-3 py-2 flex items-center gap-2">
              <Check className="h-4 w-4 text-accent-green" />
              <span className="text-xs text-accent-green font-display">
                {completedActions.size} action{completedActions.size > 1 ? "s" : ""} completed — nice work.
              </span>
              <button onClick={handleRefresh} className="ml-auto text-[10px] text-accent-green/70 hover:text-accent-green transition-colors underline">
                Update briefing
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
