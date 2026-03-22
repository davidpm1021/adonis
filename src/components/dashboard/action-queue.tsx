"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { DailyProgressBar } from "./daily-progress-bar";
import { Scale, Pill, UtensilsCrossed, Dumbbell, HeartPulse, ClipboardCheck, Moon, Footprints, Flame, Check, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionItem } from "@/lib/types/action-queue";

function todayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

const ICON_MAP: Record<ActionItem["type"], React.ComponentType<{ className?: string }>> = {
  weight: Scale, supplements: Pill, meal: UtensilsCrossed, workout: Dumbbell,
  vitals: HeartPulse, checkin: ClipboardCheck, sleep: Moon, walk: Footprints, motivation: Flame,
};

const inputCls = "rounded-md border border-border bg-bg-primary px-3 py-2 font-display text-sm tabular-nums text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none";
const btnCls = "rounded-md bg-accent-teal px-4 py-2 font-display text-sm font-semibold text-bg-primary transition-opacity disabled:opacity-50 hover:opacity-90";
const errCls = "text-xs text-accent-red";
const labelCls = "font-display text-xs text-text-secondary tracking-wide mb-1 block";

function SaveBtn({ saving, label = "Save" }: { saving: boolean; label?: string }) {
  return <button type="submit" disabled={saving} className={btnCls}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : label}</button>;
}

function ScoreRow({ label, value, onChange }: { label: string; value: number | null; onChange: (n: number) => void }) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} className={cn("h-7 w-7 rounded text-xs font-display font-semibold transition-all", value === n ? "bg-accent-teal text-bg-primary" : "bg-bg-primary border border-border text-text-muted hover:border-accent-teal/40 hover:text-text-secondary")}>{n}</button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div onClick={onToggle} className={cn("flex h-5 w-5 items-center justify-center rounded border transition-colors cursor-pointer", checked ? "border-accent-teal bg-accent-teal" : "border-text-muted")}>
        {checked && <Check className="h-3 w-3 text-bg-primary" strokeWidth={3} />}
      </div>
      <span className="text-sm text-text-secondary">{label}</span>
    </label>
  );
}

// --- Inline Forms ---

function WeightForm({ onDone }: { data?: Record<string, unknown>; onDone: () => void }) {
  const [weight, setWeight] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  async function handle(e: React.FormEvent) {
    e.preventDefault(); const v = parseFloat(weight);
    if (!v || v <= 0) { setError("Enter a valid weight"); return; }
    setSaving(true); setError(null);
    try { const r = await fetch("/api/metrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: todayET(), weight: v }) }); if (!r.ok) throw 0; onDone(); } catch { setError("Failed to save"); } finally { setSaving(false); }
  }
  return (<form onSubmit={handle} className="flex flex-col gap-2"><div className="flex items-center gap-2"><input type="number" step="0.1" placeholder="lbs" value={weight} onChange={(e) => { setWeight(e.target.value); setError(null); }} className={cn(inputCls, "w-24")} /><SaveBtn saving={saving} /></div>{error && <p className={errCls}>{error}</p>}</form>);
}

function SupplementsForm({ data, onDone }: { data?: Record<string, unknown>; onDone: () => void }) {
  const supplements = (data?.supplements as Array<{ name: string; taken?: boolean; timeOfDay?: string }>) || [];
  const [states, setStates] = useState<Record<string, boolean>>(() => { const m: Record<string, boolean> = {}; supplements.forEach((s) => { m[s.name] = !!s.taken; }); return m; });
  const [loading, setLoading] = useState<string | null>(null);
  async function toggle(name: string) {
    const nv = !states[name]; setLoading(name); setStates((p) => ({ ...p, [name]: nv }));
    try { await fetch(`/api/supplements/log/${todayET()}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplementName: name, taken: nv ? 1 : 0 }) });
      if (Object.values({ ...states, [name]: nv }).every(Boolean)) onDone();
    } catch { setStates((p) => ({ ...p, [name]: !nv })); } finally { setLoading(null); }
  }
  return (
    <div className="flex flex-col gap-1.5">
      {supplements.map((s) => (
        <button key={s.name} onClick={() => toggle(s.name)} disabled={loading === s.name} className={cn("flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-all duration-150", states[s.name] ? "border-accent-green/20 bg-accent-green/5 text-text-muted" : "border-border bg-bg-primary hover:border-border-hover text-text-primary")}>
          <div className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors", states[s.name] ? "border-accent-green bg-accent-green" : "border-text-muted")}>
            {loading === s.name ? <Loader2 className="h-2.5 w-2.5 animate-spin text-bg-primary" /> : states[s.name] ? <Check className="h-2.5 w-2.5 text-bg-primary" strokeWidth={3} /> : null}
          </div>
          <span className={cn("text-sm", states[s.name] && "line-through")}>{s.name}</span>
        </button>
      ))}
    </div>
  );
}

function MealForm({ onDone }: { data?: Record<string, unknown>; onDone: () => void }) {
  const [text, setText] = useState(""); const [parsing, setParsing] = useState(false); const [saving, setSaving] = useState(false);
  const [parsed, setParsed] = useState<{ items: Array<{ name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }>; totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number } } | null>(null);
  const [saved, setSaved] = useState(false); const [error, setError] = useState<string | null>(null);
  async function parse() {
    if (!text.trim()) return; setParsing(true); setError(null);
    try { const r = await fetch("/api/nutrition/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || "Parse failed"); setParsed(j); } catch (e) { setError(e instanceof Error ? e.message : "Parse failed"); } finally { setParsing(false); }
  }
  async function confirm() {
    if (!parsed) return; setSaving(true);
    try { for (const item of parsed.items) { await fetch("/api/nutrition", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, date: todayET() }) }); } setSaved(true); setTimeout(() => onDone(), 600); } catch { setError("Failed to save"); } finally { setSaving(false); }
  }
  if (saved && parsed) return <div className="flex items-center gap-2 text-accent-green"><Check className="h-4 w-4" /><span className="text-sm font-display">Logged {parsed.totals.calories} cal &middot; {parsed.totals.protein_g}g P &middot; {parsed.totals.carbs_g}g C &middot; {parsed.totals.fat_g}g F</span></div>;
  if (parsed) return (
    <div className="flex flex-col gap-2">
      <div className="space-y-1">{parsed.items.map((item, i) => <div key={i} className="flex items-center justify-between text-sm"><span className="text-text-primary">{item.name}</span><span className="font-display text-xs tabular-nums text-text-muted">{item.calories} cal</span></div>)}</div>
      <div className="flex items-center justify-between rounded-md bg-bg-primary px-3 py-2 border border-border"><span className="font-display text-xs text-text-secondary">Totals</span><span className="font-display text-xs tabular-nums text-accent-teal">{parsed.totals.calories} cal &middot; {parsed.totals.protein_g}g P &middot; {parsed.totals.carbs_g}g C &middot; {parsed.totals.fat_g}g F</span></div>
      <div className="flex gap-2"><button onClick={confirm} disabled={saving} className={btnCls}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}</button><button onClick={() => setParsed(null)} className="rounded-md border border-border px-4 py-2 font-display text-sm text-text-secondary hover:text-text-primary transition-colors">Redo</button></div>
      {error && <p className={errCls}>{error}</p>}
    </div>
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2"><input type="text" placeholder="What did you eat?" value={text} onChange={(e) => { setText(e.target.value); setError(null); }} onKeyDown={(e) => { if (e.key === "Enter") parse(); }} className={cn(inputCls, "flex-1 tabular-nums-[unset]")} /><button onClick={parse} disabled={parsing || !text.trim()} className={btnCls}>{parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Parse"}</button></div>
      {error && <p className={errCls}>{error}</p>}
    </div>
  );
}

function WorkoutForm({ data }: { data?: Record<string, unknown>; onDone: () => void }) {
  const phaseName = data?.phaseName as string | undefined;
  return (
    <div className="flex flex-col gap-2">
      {phaseName && <p className="text-sm text-text-secondary">Today&apos;s prescribed workout: <span className="text-text-primary font-display">{phaseName}</span></p>}
      <a href="/training" className={cn(btnCls, "inline-flex items-center justify-center gap-2 w-fit")}><Dumbbell className="h-4 w-4" />Log Workout</a>
    </div>
  );
}

function CheckinForm({ onDone }: { data?: Record<string, unknown>; onDone: () => void }) {
  const [scores, setScores] = useState<Record<string, number | null>>({ energy: null, mood: null, stress: null, soreness: null });
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  async function handle(e: React.FormEvent) {
    e.preventDefault(); if (Object.values(scores).some((v) => v === null)) { setError("Rate all categories"); return; }
    setSaving(true); setError(null);
    try { const r = await fetch(`/api/daily-log/${todayET()}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(scores) }); if (!r.ok) throw 0; onDone(); } catch { setError("Failed to save"); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={handle} className="flex flex-col gap-3">
      {(["energy", "mood", "stress", "soreness"] as const).map((k) => <ScoreRow key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={scores[k]} onChange={(n) => setScores((p) => ({ ...p, [k]: n }))} />)}
      <div className="flex items-center gap-2"><SaveBtn saving={saving} />{error && <p className={errCls}>{error}</p>}</div>
    </form>
  );
}

function SleepInlineForm({ onDone }: { data?: Record<string, unknown>; onDone: () => void }) {
  const [bed, setBed] = useState(""); const [wake, setWake] = useState(""); const [q, setQ] = useState<number | null>(null); const [bipap, setBipap] = useState(false);
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  async function handle(e: React.FormEvent) {
    e.preventDefault(); if (!bed || !wake) { setError("Enter bed & wake time"); return; }
    setSaving(true); setError(null);
    try { const r = await fetch("/api/sleep", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: todayET(), bedtime: bed, wakeTime: wake, sleepQuality: q, bipapUsed: bipap ? 1 : 0 }) }); if (!r.ok) throw 0; onDone(); } catch { setError("Failed to save"); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={handle} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div><span className={labelCls}>Bedtime</span><input type="time" value={bed} onChange={(e) => setBed(e.target.value)} className={inputCls} /></div>
        <div><span className={labelCls}>Wake</span><input type="time" value={wake} onChange={(e) => setWake(e.target.value)} className={inputCls} /></div>
      </div>
      <ScoreRow label="Quality (1-10)" value={q} onChange={setQ} />
      <Toggle checked={bipap} onToggle={() => setBipap(!bipap)} label="BiPAP used" />
      <div className="flex items-center gap-2"><SaveBtn saving={saving} />{error && <p className={errCls}>{error}</p>}</div>
    </form>
  );
}

function WalkForm({ onDone }: { data?: Record<string, unknown>; onDone: () => void }) {
  const [walked, setWalked] = useState(false); const [dur, setDur] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  async function handle(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    try { const r = await fetch(`/api/daily-log/${todayET()}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ morningWalk: walked ? 1 : 0, walkDurationMinutes: walked ? parseInt(dur) || null : null }) }); if (!r.ok) throw 0; onDone(); } catch { setError("Failed to save"); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={handle} className="flex flex-col gap-3">
      <Toggle checked={walked} onToggle={() => setWalked(!walked)} label="Did you walk?" />
      {walked && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden"><div className="flex items-center gap-2"><input type="number" placeholder="Minutes" value={dur} onChange={(e) => setDur(e.target.value)} className={cn(inputCls, "w-24")} /><span className="text-xs text-text-muted">min</span></div></motion.div>}
      <div className="flex items-center gap-2"><SaveBtn saving={saving} />{error && <p className={errCls}>{error}</p>}</div>
    </form>
  );
}

function VitalsForm({ onDone }: { data?: Record<string, unknown>; onDone: () => void }) {
  const [sys, setSys] = useState(""); const [dia, setDia] = useState(""); const [hr, setHr] = useState("");
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  async function handle(e: React.FormEvent) {
    e.preventDefault(); if (!sys || !dia) { setError("Enter blood pressure"); return; }
    setSaving(true); setError(null);
    try { const r = await fetch("/api/vitals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: todayET(), systolic: parseInt(sys), diastolic: parseInt(dia), heartRate: hr ? parseInt(hr) : null }) }); if (!r.ok) throw 0; onDone(); } catch { setError("Failed to save"); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={handle} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div><span className={labelCls}>Systolic</span><input type="number" placeholder="120" value={sys} onChange={(e) => setSys(e.target.value)} className={cn(inputCls, "w-20")} /></div>
        <span className="text-text-muted mt-5">/</span>
        <div><span className={labelCls}>Diastolic</span><input type="number" placeholder="80" value={dia} onChange={(e) => setDia(e.target.value)} className={cn(inputCls, "w-20")} /></div>
        <div><span className={labelCls}>Heart Rate</span><input type="number" placeholder="bpm" value={hr} onChange={(e) => setHr(e.target.value)} className={cn(inputCls, "w-20")} /></div>
      </div>
      <div className="flex items-center gap-2"><SaveBtn saving={saving} />{error && <p className={errCls}>{error}</p>}</div>
    </form>
  );
}

// --- Form Router ---

function InlineForm({ item, onDone }: { item: ActionItem; onDone: () => void }) {
  switch (item.type) {
    case "weight": return <WeightForm data={item.data} onDone={onDone} />;
    case "supplements": return <SupplementsForm data={item.data} onDone={onDone} />;
    case "meal": return <MealForm data={item.data} onDone={onDone} />;
    case "workout": return <WorkoutForm data={item.data} onDone={onDone} />;
    case "checkin": return <CheckinForm data={item.data} onDone={onDone} />;
    case "sleep": return <SleepInlineForm data={item.data} onDone={onDone} />;
    case "walk": return <WalkForm data={item.data} onDone={onDone} />;
    case "vitals": return <VitalsForm data={item.data} onDone={onDone} />;
    case "motivation": return <p className="text-sm text-text-secondary italic">{item.subtitle}</p>;
    default: return null;
  }
}

// --- Action Card ---

function ActionCard({ item, expanded, onToggle, onDone }: { item: ActionItem; expanded: boolean; onToggle: () => void; onDone: () => void }) {
  const Icon = ICON_MAP[item.type] || ClipboardCheck;
  const done = item.status === "completed";
  const [justDone, setJustDone] = useState(false);
  function handleDone() { setJustDone(true); setTimeout(() => onDone(), 500); }
  const faded = done || justDone;
  const expandable = !faded && item.type !== "motivation";

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
      className={cn("rounded-lg border overflow-hidden transition-colors", faded ? "border-border/50 bg-bg-card/60" : "border-border bg-bg-card", !faded && "border-l-2 border-l-accent-teal")}>
      <button type="button" onClick={() => expandable && onToggle()} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left", expandable && "cursor-pointer hover:bg-bg-card-hover")}>
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors", faded ? "bg-accent-green/10" : "bg-accent-teal/10")}>
          {justDone ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}><Check className="h-4 w-4 text-accent-green" strokeWidth={3} /></motion.div>
            : done ? <Check className="h-4 w-4 text-accent-green/60" strokeWidth={3} />
            : <Icon className="h-4 w-4 text-accent-teal" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium transition-colors", faded ? "text-text-muted line-through" : "text-text-primary")}>{item.title}</p>
          {item.subtitle && <p className="text-xs text-text-muted truncate">{item.subtitle}</p>}
        </div>
        {expandable && <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown className="h-4 w-4 text-text-muted" /></motion.div>}
      </button>
      <AnimatePresence initial={false}>
        {expanded && !faded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-1 border-t border-border/50"><InlineForm item={item} onDone={handleDone} /></div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Main Component ---

export function ActionQueue() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    try { const r = await fetch("/api/action-queue"); if (!r.ok) throw 0; const j = await r.json(); setItems(j.items || j || []); } catch { /* queue may not exist yet */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  function handleDone(id: string) {
    setItems((p) => p.map((i) => (i.id === id ? { ...i, status: "completed" as const } : i)));
    setExpandedId(null);
    fetchQueue();
  }

  const sorted = [...items].sort((a, b) => { if (a.status !== b.status) return a.status === "pending" ? -1 : 1; return a.priority - b.priority; });
  const completed = items.filter((i) => i.status === "completed").length;
  const total = items.length;

  if (loading) return <Card><CardTitle>Action Queue</CardTitle><CardContent><div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-text-muted" /></div></CardContent></Card>;
  if (total === 0) return <Card><CardTitle>Action Queue</CardTitle><CardContent><p className="text-sm text-text-muted py-4 text-center">No actions for today yet.</p></CardContent></Card>;

  return (
    <Card className="p-0">
      <div className="p-4 pb-0"><CardTitle>Action Queue</CardTitle></div>
      <CardContent className="p-4">
        <DailyProgressBar completed={completed} total={total} />
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {sorted.map((item) => (
              <ActionCard key={item.id} item={item} expanded={expandedId === item.id} onToggle={() => setExpandedId((p) => (p === item.id ? null : item.id))} onDone={() => handleDone(item.id)} />
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
