"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CollapsibleSection } from "@/components/daily-log/collapsible-section";
import { Card, CardContent } from "@/components/ui/card";
import {
  User,
  Apple,
  Pill,
  Cpu,
  Dumbbell,
  Wine,
  Download,
  FileText,
  HardDrive,
  Info,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  Database,
  Key,
  Shield,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserProfile {
  id: number;
  name: string | null;
  dob: string | null;
  sex: string | null;
  heightInches: number | null;
  startingWeight: number | null;
  goalWeightLow: number | null;
  goalWeightHigh: number | null;
  medicalConditions: string | null;
  medications: string | null;
  allergies: string | null;
  sobrietyStartDate: string | null;
  weeklyAlcoholSpend: number | null;
  weeklyAlcoholCalories: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface NutritionTargets {
  id: number;
  effectiveDate: string;
  caloriesMin: number | null;
  caloriesMax: number | null;
  proteinMin: number | null;
  proteinMax: number | null;
  carbsMin: number | null;
  carbsMax: number | null;
  fatMin: number | null;
  fatMax: number | null;
  fiberMin: number | null;
  fiberMax: number | null;
  rationale: string | null;
  createdAt: string | null;
}

interface SupplementItem {
  supplementName: string;
  dose: string | null;
  timeOfDay: string | null;
}

interface TrainingPhase {
  id: number;
  phaseNumber: number;
  phaseName: string;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
}

interface AiUsageStats {
  totalTokens: number;
  totalCost: number;
  messagesToday: number;
  dailyLimit: number;
}

interface BackupEntry {
  filename: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
}

interface DbStats {
  tables: Record<string, number>;
  totalRecords: number;
  databaseSizeBytes: number;
  tableCount: number;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatHeight(inches: number | null): string {
  if (!inches) return "N/A";
  const feet = Math.floor(inches / 12);
  const rem = inches % 12;
  return `${feet}'${rem}"`;
}

function parseJsonField(val: string | null): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      if (typeof item === "string") return item;
      // Handle medication objects: {name, dose, frequency}
      if (typeof item === "object" && item !== null && item.name) {
        return [item.name, item.dose, item.frequency].filter(Boolean).join(" — ");
      }
      return String(item);
    });
  } catch {
    return [];
  }
}

function getWeekNumber(startDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const today = new Date(getTodayET() + "T00:00:00");
  const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  // State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [supplements, setSupplements] = useState<SupplementItem[]>([]);
  const [phase, setPhase] = useState<TrainingPhase | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsageStats>({
    totalTokens: 0,
    totalCost: 0,
    messagesToday: 0,
    dailyLimit: 50,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile edit state
  const [profileSaveStatus, setProfileSaveStatus] = useState<SaveStatus>("idle");
  const [editProfile, setEditProfile] = useState({
    name: "",
    heightInches: "",
    goalWeightLow: "",
    goalWeightHigh: "",
    sobrietyStartDate: "",
    weeklyAlcoholSpend: "",
    weeklyAlcoholCalories: "",
  });

  // Nutrition targets edit state
  const [targetsSaveStatus, setTargetsSaveStatus] = useState<SaveStatus>("idle");
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [editTargets, setEditTargets] = useState({
    effectiveDate: getTodayET(),
    caloriesMin: "",
    caloriesMax: "",
    proteinMin: "",
    proteinMax: "",
    carbsMin: "",
    carbsMax: "",
    fatMin: "",
    fatMax: "",
    fiberMin: "",
    fiberMax: "",
    rationale: "",
  });

  // Supplement edit state
  const [suppSaveStatus, setSuppSaveStatus] = useState<SaveStatus>("idle");
  const [newSupplement, setNewSupplement] = useState({ name: "", dose: "", timeOfDay: "" });

  // Export state
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "done" | "error">("idle");
  const [csvExportStatus, setCsvExportStatus] = useState<"idle" | "exporting" | "done" | "error">("idle");

  // Backup state
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [backupStatus, setBackupStatus] = useState<"idle" | "creating" | "done" | "error">("idle");
  const [backupError, setBackupError] = useState<string | null>(null);
  const [deletingBackup, setDeletingBackup] = useState<string | null>(null);

  // Database stats
  const [dbStats, setDbStats] = useState<DbStats | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch data
  // ---------------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [profileRes, targetsRes, suppRes, phaseRes] = await Promise.all([
        fetch("/api/settings/profile"),
        fetch("/api/settings/targets"),
        fetch("/api/supplements/stack"),
        fetch("/api/training/phases/current"),
      ]);

      // Profile
      if (profileRes.ok) {
        const pJson = await profileRes.json();
        if (pJson.success && pJson.data) {
          const p = pJson.data;
          setProfile(p);
          setEditProfile({
            name: p.name ?? "",
            heightInches: p.heightInches?.toString() ?? "",
            goalWeightLow: p.goalWeightLow?.toString() ?? "",
            goalWeightHigh: p.goalWeightHigh?.toString() ?? "",
            sobrietyStartDate: p.sobrietyStartDate ?? "",
            weeklyAlcoholSpend: p.weeklyAlcoholSpend?.toString() ?? "",
            weeklyAlcoholCalories: p.weeklyAlcoholCalories?.toString() ?? "",
          });
        }
      }

      // Targets
      if (targetsRes.ok) {
        const tJson = await targetsRes.json();
        if (tJson.success && tJson.data) {
          setTargets(tJson.data);
        }
      }

      // Supplements
      if (suppRes.ok) {
        const sJson = await suppRes.json();
        if (sJson.success && sJson.data) {
          setSupplements(sJson.data);
        }
      }

      // Phase
      if (phaseRes.ok) {
        const phJson = await phaseRes.json();
        if (phJson.success && phJson.data) {
          setPhase(phJson.data);
        }
      }

      // AI Usage - fetch from ai_usage_log totals
      // This is computed client-side from available data
      // In a real implementation, there would be a dedicated endpoint

      // Fetch backups and stats in parallel
      const [backupsRes, statsRes] = await Promise.all([
        fetch("/api/settings/backup").catch(() => null),
        fetch("/api/settings/stats").catch(() => null),
      ]);

      if (backupsRes?.ok) {
        const bJson = await backupsRes.json();
        if (bJson.success && bJson.data) {
          setBackups(bJson.data.backups ?? []);
        }
      }

      if (statsRes?.ok) {
        const sJson = await statsRes.json();
        if (sJson.success && sJson.data) {
          setDbStats(sJson.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Profile Save
  // ---------------------------------------------------------------------------
  const handleProfileSave = async () => {
    setProfileSaveStatus("saving");
    try {
      const payload: Record<string, unknown> = {};
      if (editProfile.name) payload.name = editProfile.name;
      if (editProfile.goalWeightLow) payload.goalWeightLow = parseFloat(editProfile.goalWeightLow);
      if (editProfile.goalWeightHigh) payload.goalWeightHigh = parseFloat(editProfile.goalWeightHigh);
      if (editProfile.sobrietyStartDate) payload.sobrietyStartDate = editProfile.sobrietyStartDate;
      if (editProfile.weeklyAlcoholSpend) payload.weeklyAlcoholSpend = parseFloat(editProfile.weeklyAlcoholSpend);
      if (editProfile.weeklyAlcoholCalories) payload.weeklyAlcoholCalories = parseInt(editProfile.weeklyAlcoholCalories);

      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save profile");

      const json = await res.json();
      if (json.success && json.data) {
        setProfile(json.data);
      }

      setProfileSaveStatus("saved");
      setTimeout(() => setProfileSaveStatus("idle"), 3000);
    } catch {
      setProfileSaveStatus("error");
      setTimeout(() => setProfileSaveStatus("idle"), 4000);
    }
  };

  // ---------------------------------------------------------------------------
  // Nutrition Targets Save
  // ---------------------------------------------------------------------------
  const handleTargetsSave = async () => {
    setTargetsSaveStatus("saving");
    try {
      const payload: Record<string, unknown> = {
        effectiveDate: editTargets.effectiveDate,
      };
      if (editTargets.caloriesMin) payload.caloriesMin = parseInt(editTargets.caloriesMin);
      if (editTargets.caloriesMax) payload.caloriesMax = parseInt(editTargets.caloriesMax);
      if (editTargets.proteinMin) payload.proteinMin = parseInt(editTargets.proteinMin);
      if (editTargets.proteinMax) payload.proteinMax = parseInt(editTargets.proteinMax);
      if (editTargets.carbsMin) payload.carbsMin = parseInt(editTargets.carbsMin);
      if (editTargets.carbsMax) payload.carbsMax = parseInt(editTargets.carbsMax);
      if (editTargets.fatMin) payload.fatMin = parseInt(editTargets.fatMin);
      if (editTargets.fatMax) payload.fatMax = parseInt(editTargets.fatMax);
      if (editTargets.fiberMin) payload.fiberMin = parseInt(editTargets.fiberMin);
      if (editTargets.fiberMax) payload.fiberMax = parseInt(editTargets.fiberMax);
      if (editTargets.rationale) payload.rationale = editTargets.rationale;

      const res = await fetch("/api/settings/targets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save targets");

      const json = await res.json();
      if (json.success && json.data) {
        setTargets(json.data);
      }

      setTargetsSaveStatus("saved");
      setShowTargetForm(false);
      setTimeout(() => setTargetsSaveStatus("idle"), 3000);
    } catch {
      setTargetsSaveStatus("error");
      setTimeout(() => setTargetsSaveStatus("idle"), 4000);
    }
  };

  // ---------------------------------------------------------------------------
  // Supplement Management
  // ---------------------------------------------------------------------------
  const handleAddSupplement = () => {
    if (!newSupplement.name.trim()) return;
    setSupplements((prev) => [
      ...prev,
      {
        supplementName: newSupplement.name.trim(),
        dose: newSupplement.dose.trim() || null,
        timeOfDay: newSupplement.timeOfDay.trim() || null,
      },
    ]);
    setNewSupplement({ name: "", dose: "", timeOfDay: "" });
  };

  const handleRemoveSupplement = (index: number) => {
    setSupplements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveSupplements = async () => {
    setSuppSaveStatus("saving");
    try {
      const payload = supplements.map((s) => ({
        supplementName: s.supplementName,
        dose: s.dose,
        timeOfDay: s.timeOfDay,
      }));

      const res = await fetch("/api/supplements/stack", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save supplements");

      setSuppSaveStatus("saved");
      setTimeout(() => setSuppSaveStatus("idle"), 3000);
    } catch {
      setSuppSaveStatus("error");
      setTimeout(() => setSuppSaveStatus("idle"), 4000);
    }
  };

  // ---------------------------------------------------------------------------
  // Export (JSON)
  // ---------------------------------------------------------------------------
  const handleExportJson = async () => {
    setExportStatus("exporting");
    try {
      const res = await fetch("/api/settings/export?format=json");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `adonis-export-${getTodayET()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus("done");
      setTimeout(() => setExportStatus("idle"), 3000);
    } catch {
      setExportStatus("error");
      setTimeout(() => setExportStatus("idle"), 4000);
    }
  };

  // ---------------------------------------------------------------------------
  // Export (CSV)
  // ---------------------------------------------------------------------------
  const handleExportCsv = async () => {
    setCsvExportStatus("exporting");
    try {
      const res = await fetch("/api/settings/export?format=csv");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `adonis-export-${getTodayET()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setCsvExportStatus("done");
      setTimeout(() => setCsvExportStatus("idle"), 3000);
    } catch {
      setCsvExportStatus("error");
      setTimeout(() => setCsvExportStatus("idle"), 4000);
    }
  };

  // ---------------------------------------------------------------------------
  // Backup
  // ---------------------------------------------------------------------------
  const handleCreateBackup = async () => {
    setBackupStatus("creating");
    setBackupError(null);
    try {
      const res = await fetch("/api/settings/backup", { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Backup failed");
      }

      setBackupStatus("done");
      setTimeout(() => setBackupStatus("idle"), 3000);

      // Refresh backup list
      await refreshBackups();
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : "Backup failed");
      setBackupStatus("error");
      setTimeout(() => setBackupStatus("idle"), 4000);
    }
  };

  const refreshBackups = async () => {
    try {
      const res = await fetch("/api/settings/backup");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setBackups(json.data.backups ?? []);
        }
      }
    } catch {
      // Non-critical
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    setDeletingBackup(filename);
    try {
      const res = await fetch(`/api/settings/backup?file=${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      await refreshBackups();
    } catch {
      // Show error briefly
    } finally {
      setDeletingBackup(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Render Helpers
  // ---------------------------------------------------------------------------
  const inputClass =
    "w-full rounded-md border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors";
  const dateInputClass = cn(inputClass, "[color-scheme:dark]");
  const labelClass = "block font-body text-xs text-text-secondary mb-1.5";

  const medicalConditions = parseJsonField(profile?.medicalConditions ?? null);
  const medications = parseJsonField(profile?.medications ?? null);

  // ---------------------------------------------------------------------------
  // Loading & Error States
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Settings"
          subtitle="Profile, targets, and application configuration"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-accent-teal" />
          <span className="ml-2 text-sm text-text-secondary">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Profile, targets, and application configuration"
      />

      {error && (
        <div className="mx-auto max-w-3xl mb-4 rounded-lg border border-accent-red/30 bg-accent-red-dim px-4 py-3 text-sm text-accent-red">
          {error}
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-4">
        {/* ================================================================= */}
        {/* PROFILE */}
        {/* ================================================================= */}
        <CollapsibleSection
          title="Profile"
          icon={<User className="h-4 w-4 text-accent-teal" />}
          defaultOpen={true}
        >
          <div className="space-y-4">
            {/* Read-only fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className={labelClass}>Date of Birth</span>
                <p className="text-sm text-text-primary font-body">
                  {formatDate(profile?.dob ?? null)}
                </p>
              </div>
              <div>
                <span className={labelClass}>Sex</span>
                <p className="text-sm text-text-primary font-body capitalize">
                  {profile?.sex ?? "N/A"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className={labelClass}>Starting Weight</span>
                <p className="text-sm text-text-primary font-body tabular-nums">
                  {profile?.startingWeight ? `${profile.startingWeight} lbs` : "N/A"}
                </p>
              </div>
              <div>
                <span className={labelClass}>Height</span>
                <p className="text-sm text-text-primary font-body">
                  {formatHeight(profile?.heightInches ?? null)}
                </p>
              </div>
            </div>

            {/* Medical Conditions (read-only) */}
            {medicalConditions.length > 0 && (
              <div>
                <span className={labelClass}>Medical Conditions</span>
                <div className="flex flex-wrap gap-1.5">
                  {medicalConditions.map((cond, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-accent-amber-dim px-2.5 py-0.5 text-xs text-accent-amber font-display"
                    >
                      {cond}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Medications (read-only) */}
            {medications.length > 0 && (
              <div>
                <span className={labelClass}>Medications</span>
                <div className="flex flex-wrap gap-1.5">
                  {medications.map((med, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-bg-card-hover px-2.5 py-0.5 text-xs text-text-secondary font-display"
                    >
                      {med}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border pt-4 mt-4" />

            {/* Editable fields */}
            <div>
              <label className={labelClass}>Name</label>
              <input
                type="text"
                value={editProfile.name}
                onChange={(e) => setEditProfile((d) => ({ ...d, name: e.target.value }))}
                placeholder="David"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Goal Weight Low (lbs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editProfile.goalWeightLow}
                  onChange={(e) => setEditProfile((d) => ({ ...d, goalWeightLow: e.target.value }))}
                  placeholder="180"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Goal Weight High (lbs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editProfile.goalWeightHigh}
                  onChange={(e) => setEditProfile((d) => ({ ...d, goalWeightHigh: e.target.value }))}
                  placeholder="190"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Sobriety Start Date</label>
              <input
                type="date"
                value={editProfile.sobrietyStartDate}
                onChange={(e) => setEditProfile((d) => ({ ...d, sobrietyStartDate: e.target.value }))}
                className={dateInputClass}
              />
            </div>

            {/* Save Profile Button */}
            <SaveButton status={profileSaveStatus} onClick={handleProfileSave} label="Save Profile" />
          </div>
        </CollapsibleSection>

        {/* ================================================================= */}
        {/* NUTRITION TARGETS */}
        {/* ================================================================= */}
        <CollapsibleSection
          title="Nutrition Targets"
          icon={<Apple className="h-4 w-4 text-accent-green" />}
          defaultOpen={true}
        >
          <div className="space-y-4">
            {/* Current targets display */}
            {targets ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted font-display">
                    Effective: {formatDate(targets.effectiveDate)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <TargetRow label="Calories" min={targets.caloriesMin} max={targets.caloriesMax} unit="kcal" />
                  <TargetRow label="Protein" min={targets.proteinMin} max={targets.proteinMax} unit="g" />
                  <TargetRow label="Carbs" min={targets.carbsMin} max={targets.carbsMax} unit="g" />
                  <TargetRow label="Fat" min={targets.fatMin} max={targets.fatMax} unit="g" />
                  <TargetRow label="Fiber" min={targets.fiberMin} max={targets.fiberMax} unit="g" />
                </div>
                {targets.rationale && (
                  <div className="rounded-lg bg-bg-primary border border-border p-3 mt-2">
                    <span className={labelClass}>Rationale</span>
                    <p className="text-sm text-text-secondary font-body">{targets.rationale}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No nutrition targets configured.</p>
            )}

            {/* Toggle form */}
            <button
              type="button"
              onClick={() => setShowTargetForm(!showTargetForm)}
              className="flex items-center gap-1.5 text-sm text-accent-teal hover:text-accent-teal/80 transition-colors font-display"
            >
              <Plus className="h-3.5 w-3.5" />
              {showTargetForm ? "Cancel" : "Set New Targets"}
            </button>

            {/* New targets form */}
            {showTargetForm && (
              <div className="space-y-3 rounded-lg border border-border bg-bg-primary p-4">
                <div>
                  <label className={labelClass}>Effective Date</label>
                  <input
                    type="date"
                    value={editTargets.effectiveDate}
                    onChange={(e) => setEditTargets((d) => ({ ...d, effectiveDate: e.target.value }))}
                    className={dateInputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Calories Min</label>
                    <input
                      type="number"
                      value={editTargets.caloriesMin}
                      onChange={(e) => setEditTargets((d) => ({ ...d, caloriesMin: e.target.value }))}
                      placeholder="1800"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Calories Max</label>
                    <input
                      type="number"
                      value={editTargets.caloriesMax}
                      onChange={(e) => setEditTargets((d) => ({ ...d, caloriesMax: e.target.value }))}
                      placeholder="2200"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Protein Min (g)</label>
                    <input
                      type="number"
                      value={editTargets.proteinMin}
                      onChange={(e) => setEditTargets((d) => ({ ...d, proteinMin: e.target.value }))}
                      placeholder="150"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Protein Max (g)</label>
                    <input
                      type="number"
                      value={editTargets.proteinMax}
                      onChange={(e) => setEditTargets((d) => ({ ...d, proteinMax: e.target.value }))}
                      placeholder="200"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Carbs Min (g)</label>
                    <input
                      type="number"
                      value={editTargets.carbsMin}
                      onChange={(e) => setEditTargets((d) => ({ ...d, carbsMin: e.target.value }))}
                      placeholder="150"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Carbs Max (g)</label>
                    <input
                      type="number"
                      value={editTargets.carbsMax}
                      onChange={(e) => setEditTargets((d) => ({ ...d, carbsMax: e.target.value }))}
                      placeholder="250"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Fat Min (g)</label>
                    <input
                      type="number"
                      value={editTargets.fatMin}
                      onChange={(e) => setEditTargets((d) => ({ ...d, fatMin: e.target.value }))}
                      placeholder="50"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fat Max (g)</label>
                    <input
                      type="number"
                      value={editTargets.fatMax}
                      onChange={(e) => setEditTargets((d) => ({ ...d, fatMax: e.target.value }))}
                      placeholder="80"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Fiber Min (g)</label>
                    <input
                      type="number"
                      value={editTargets.fiberMin}
                      onChange={(e) => setEditTargets((d) => ({ ...d, fiberMin: e.target.value }))}
                      placeholder="25"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fiber Max (g)</label>
                    <input
                      type="number"
                      value={editTargets.fiberMax}
                      onChange={(e) => setEditTargets((d) => ({ ...d, fiberMax: e.target.value }))}
                      placeholder="40"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Rationale</label>
                  <textarea
                    rows={2}
                    value={editTargets.rationale}
                    onChange={(e) => setEditTargets((d) => ({ ...d, rationale: e.target.value }))}
                    placeholder="Why these targets..."
                    className={cn(inputClass, "resize-none")}
                  />
                </div>

                <SaveButton status={targetsSaveStatus} onClick={handleTargetsSave} label="Save New Targets" />
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* ================================================================= */}
        {/* SUPPLEMENT STACK */}
        {/* ================================================================= */}
        <CollapsibleSection
          title="Supplement Stack"
          icon={<Pill className="h-4 w-4 text-accent-amber" />}
          defaultOpen={false}
          badge={
            <span className="ml-2 rounded-full bg-accent-teal-dim px-2 py-0.5 font-display text-xs tabular-nums text-accent-teal">
              {supplements.length}
            </span>
          }
        >
          <div className="space-y-3">
            {/* Current supplements */}
            {supplements.length > 0 ? (
              <div className="space-y-1.5">
                {supplements.map((supp, index) => (
                  <div
                    key={`${supp.supplementName}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-bg-primary px-4 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary font-body font-medium">
                        {supp.supplementName}
                      </p>
                      <div className="flex gap-2 text-xs text-text-muted">
                        {supp.dose && <span>{supp.dose}</span>}
                        {supp.timeOfDay && (
                          <span className="capitalize">{supp.timeOfDay}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSupplement(index)}
                      className="ml-2 p-1 text-text-muted hover:text-accent-red transition-colors"
                      title="Remove supplement"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No supplements configured.</p>
            )}

            {/* Add new supplement */}
            <div className="rounded-lg border border-border bg-bg-primary p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newSupplement.name}
                  onChange={(e) => setNewSupplement((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Supplement name"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={newSupplement.dose}
                  onChange={(e) => setNewSupplement((d) => ({ ...d, dose: e.target.value }))}
                  placeholder="Dose (e.g. 500mg)"
                  className={inputClass}
                />
                <select
                  value={newSupplement.timeOfDay}
                  onChange={(e) => setNewSupplement((d) => ({ ...d, timeOfDay: e.target.value }))}
                  className={cn(inputClass, "[color-scheme:dark]")}
                >
                  <option value="">Time of day</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="with_meals">With Meals</option>
                  <option value="before_bed">Before Bed</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddSupplement}
                disabled={!newSupplement.name.trim()}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-display transition-colors",
                  newSupplement.name.trim()
                    ? "text-accent-teal hover:text-accent-teal/80"
                    : "text-text-muted cursor-not-allowed"
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Supplement
              </button>
            </div>

            {/* Save supplements */}
            {supplements.length > 0 && (
              <SaveButton status={suppSaveStatus} onClick={handleSaveSupplements} label="Save Supplement Stack" />
            )}
          </div>
        </CollapsibleSection>

        {/* ================================================================= */}
        {/* AI USAGE STATS */}
        {/* ================================================================= */}
        <CollapsibleSection
          title="AI Usage Stats"
          icon={<Cpu className="h-4 w-4 text-accent-teal" />}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Total Tokens"
                value={aiUsage.totalTokens.toLocaleString()}
                icon={<Cpu className="h-4 w-4 text-accent-teal" />}
              />
              <StatCard
                label="Est. Cost"
                value={`$${aiUsage.totalCost.toFixed(4)}`}
                icon={<Cpu className="h-4 w-4 text-accent-amber" />}
              />
            </div>
            <div className="rounded-lg border border-border bg-bg-primary p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-secondary font-display uppercase tracking-wide">
                  Messages Today
                </span>
                <span className="font-display text-sm tabular-nums text-text-primary">
                  {aiUsage.messagesToday} / {aiUsage.dailyLimit}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-bg-card-hover overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    aiUsage.messagesToday > aiUsage.dailyLimit * 0.8
                      ? "bg-accent-red"
                      : "bg-accent-teal"
                  )}
                  style={{
                    width: `${Math.min(100, (aiUsage.messagesToday / aiUsage.dailyLimit) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-text-muted font-body">
              AI usage statistics aggregate across all features: AI Coach, food parsing, meal suggestions, and weekly reports.
              Daily message limit is rate-limited to {aiUsage.dailyLimit} messages per day.
            </p>
          </div>
        </CollapsibleSection>

        {/* ================================================================= */}
        {/* PHASE MANAGEMENT */}
        {/* ================================================================= */}
        <CollapsibleSection
          title="Phase Management"
          icon={<Dumbbell className="h-4 w-4 text-accent-green" />}
          defaultOpen={false}
        >
          {phase ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  <span className={labelClass}>Phase</span>
                  <p className="text-sm text-text-primary font-display font-bold">
                    Phase {phase.phaseNumber}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">{phase.phaseName}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  <span className={labelClass}>Status</span>
                  <p className={cn(
                    "text-sm font-display font-bold capitalize",
                    phase.status === "active" ? "text-accent-green" : "text-text-muted"
                  )}>
                    {phase.status ?? "Unknown"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  <span className={labelClass}>Start Date</span>
                  <p className="text-sm text-text-primary tabular-nums">
                    {formatDate(phase.startDate)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  <span className={labelClass}>Current Week</span>
                  <p className="text-sm text-text-primary font-display font-bold tabular-nums">
                    Week {phase.startDate ? getWeekNumber(phase.startDate) : "N/A"}
                  </p>
                </div>
              </div>
              {phase.endDate && (
                <p className="text-xs text-text-muted">
                  Phase ends: {formatDate(phase.endDate)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No active training phase.</p>
          )}
        </CollapsibleSection>

        {/* ================================================================= */}
        {/* SOBRIETY SETTINGS */}
        {/* ================================================================= */}
        <CollapsibleSection
          title="Sobriety Settings"
          icon={<Wine className="h-4 w-4 text-accent-red" />}
          defaultOpen={false}
        >
          <div className="space-y-4">
            <p className="text-xs text-text-muted font-body">
              These values are used to calculate money saved and calories avoided on the dashboard.
            </p>
            <div>
              <label className={labelClass}>Sobriety Start Date</label>
              <input
                type="date"
                value={editProfile.sobrietyStartDate}
                onChange={(e) => setEditProfile((d) => ({ ...d, sobrietyStartDate: e.target.value }))}
                className={dateInputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Weekly Alcohol Spend ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editProfile.weeklyAlcoholSpend}
                  onChange={(e) => setEditProfile((d) => ({ ...d, weeklyAlcoholSpend: e.target.value }))}
                  placeholder="75"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Weekly Alcohol Calories</label>
                <input
                  type="number"
                  value={editProfile.weeklyAlcoholCalories}
                  onChange={(e) => setEditProfile((d) => ({ ...d, weeklyAlcoholCalories: e.target.value }))}
                  placeholder="2500"
                  className={inputClass}
                />
              </div>
            </div>
            <SaveButton status={profileSaveStatus} onClick={handleProfileSave} label="Save Sobriety Settings" />
          </div>
        </CollapsibleSection>

        {/* ================================================================= */}
        {/* DATA MANAGEMENT */}
        {/* ================================================================= */}
        <CollapsibleSection
          title="Data Management"
          icon={<Database className="h-4 w-4 text-text-secondary" />}
          defaultOpen={false}
        >
          <div className="space-y-5">
            {/* Database Stats */}
            {dbStats && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-3.5 w-3.5 text-accent-teal" />
                  <h4 className="font-display text-xs font-semibold tracking-wide text-text-secondary uppercase">
                    Database Overview
                  </h4>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-center">
                    <p className="font-display text-lg font-bold tabular-nums text-text-primary">
                      {dbStats.totalRecords.toLocaleString()}
                    </p>
                    <p className="font-display text-[10px] text-text-muted uppercase tracking-wide">
                      Total Records
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-center">
                    <p className="font-display text-lg font-bold tabular-nums text-text-primary">
                      {dbStats.tableCount}
                    </p>
                    <p className="font-display text-[10px] text-text-muted uppercase tracking-wide">
                      Tables
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-center">
                    <p className="font-display text-lg font-bold tabular-nums text-text-primary">
                      {formatFileSize(dbStats.databaseSizeBytes)}
                    </p>
                    <p className="font-display text-[10px] text-text-muted uppercase tracking-wide">
                      DB Size
                    </p>
                  </div>
                </div>
                {/* Top tables by row count */}
                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  <p className="font-display text-[10px] text-text-muted uppercase tracking-wide mb-2">
                    Records per table
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {Object.entries(dbStats.tables)
                      .sort(([, a], [, b]) => b - a)
                      .map(([table, count]) => (
                        <div
                          key={table}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-text-secondary font-body truncate mr-2">
                            {table.replace(/_/g, " ")}
                          </span>
                          <span className="font-display tabular-nums text-text-primary shrink-0">
                            {count.toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Export Section */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Download className="h-3.5 w-3.5 text-accent-teal" />
                <h4 className="font-display text-xs font-semibold tracking-wide text-text-secondary uppercase">
                  Export Data
                </h4>
              </div>
              <p className="text-xs text-text-muted font-body mb-3">
                Download all ADONIS data for backup or migration. JSON is recommended for reimport; CSV for spreadsheet analysis.
              </p>
              <div className="flex gap-2">
                <ExportButton
                  status={exportStatus}
                  onClick={handleExportJson}
                  label="Export JSON"
                  icon={<FileText className="h-4 w-4" />}
                />
                <ExportButton
                  status={csvExportStatus}
                  onClick={handleExportCsv}
                  label="Export CSV"
                  icon={<FileText className="h-4 w-4" />}
                />
              </div>
            </div>

            {/* Backup Section */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-3.5 w-3.5 text-accent-amber" />
                  <h4 className="font-display text-xs font-semibold tracking-wide text-text-secondary uppercase">
                    Database Backups
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={refreshBackups}
                  className="p-1 text-text-muted hover:text-text-primary transition-colors"
                  title="Refresh backup list"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-text-muted font-body mb-3">
                Create a point-in-time copy of the SQLite database. Backups are stored in the <code className="font-display text-accent-teal">./backups/</code> directory.
              </p>

              {backupError && (
                <div className="mb-3 rounded-lg border border-accent-red/30 bg-accent-red/5 px-3 py-2 text-xs text-accent-red">
                  {backupError}
                </div>
              )}

              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={backupStatus === "creating"}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2.5 font-display text-sm font-semibold tracking-wide transition-all duration-150 mb-3",
                  backupStatus === "done"
                    ? "bg-accent-green/20 border border-accent-green/30 text-accent-green"
                    : backupStatus === "error"
                      ? "bg-accent-red/20 border border-accent-red/30 text-accent-red"
                      : "bg-accent-amber/10 border border-accent-amber/30 text-accent-amber hover:bg-accent-amber/20",
                  backupStatus === "creating" && "opacity-70 cursor-not-allowed"
                )}
              >
                {backupStatus === "creating" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Backup...
                  </>
                ) : backupStatus === "done" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Backup Created
                  </>
                ) : backupStatus === "error" ? (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    Backup Failed
                  </>
                ) : (
                  <>
                    <HardDrive className="h-4 w-4" />
                    Create Backup
                  </>
                )}
              </button>

              {/* Existing backups list */}
              {backups.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="font-display text-[10px] text-text-muted uppercase tracking-wide">
                    {backups.length} backup{backups.length !== 1 ? "s" : ""} saved
                  </p>
                  {backups.map((backup) => (
                    <div
                      key={backup.filename}
                      className="flex items-center justify-between rounded-lg border border-border bg-bg-primary px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-text-primary font-display truncate">
                          {backup.filename}
                        </p>
                        <div className="flex gap-3 text-[10px] text-text-muted font-display tabular-nums">
                          <span>{formatFileSize(backup.sizeBytes)}</span>
                          <span>{formatBackupDate(backup.createdAt)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBackup(backup.filename)}
                        disabled={deletingBackup === backup.filename}
                        className="ml-2 p-1 text-text-muted hover:text-accent-red transition-colors disabled:opacity-50"
                        title="Delete backup"
                      >
                        {deletingBackup === backup.filename ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted">No backups yet. Create your first backup above.</p>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* ================================================================= */}
        {/* ABOUT */}
        {/* ================================================================= */}
        <Card className="mb-8">
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <Info className="h-5 w-5 text-accent-teal" />
              <div>
                <h3 className="font-display text-sm font-bold tracking-wide text-text-primary">
                  ADONIS v0.1.0
                </h3>
                <p className="text-xs text-text-muted font-display tracking-wide">
                  Rebuild the Machine.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-border bg-bg-primary px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-text-muted" />
                  <span className="text-xs text-text-secondary font-display">Anthropic API Key</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-accent-green animate-pulse" />
                  <span className="text-xs text-accent-green font-display">Configured</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-bg-primary px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-text-muted" />
                  <span className="text-xs text-text-secondary font-display">Database</span>
                </div>
                <span className="text-xs text-text-secondary font-display">SQLite (local)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SaveButton({
  status,
  onClick,
  label,
}: {
  status: SaveStatus;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={status === "saving"}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-display text-sm font-semibold tracking-wide transition-all duration-150",
        status === "saved"
          ? "bg-accent-green/20 border border-accent-green/30 text-accent-green"
          : status === "error"
            ? "bg-accent-red/20 border border-accent-red/30 text-accent-red"
            : "bg-accent-teal border border-accent-teal text-bg-primary hover:bg-accent-teal/90 active:scale-[0.98]",
        status === "saving" && "opacity-70 cursor-not-allowed"
      )}
    >
      {status === "saving" ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : status === "saved" ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          Saved
        </>
      ) : status === "error" ? (
        <>
          <AlertCircle className="h-4 w-4" />
          Save Failed
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          {label}
        </>
      )}
    </button>
  );
}

function TargetRow({
  label,
  min,
  max,
  unit,
}: {
  label: string;
  min: number | null;
  max: number | null;
  unit: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
      <span className="block font-body text-xs text-text-muted mb-0.5">{label}</span>
      <p className="font-display text-sm font-bold tabular-nums text-text-primary">
        {min != null && max != null
          ? `${min} - ${max} ${unit}`
          : min != null
            ? `${min}+ ${unit}`
            : max != null
              ? `up to ${max} ${unit}`
              : "Not set"}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-primary p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="font-display text-xs text-text-secondary uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="font-display text-lg font-bold tabular-nums text-text-primary">{value}</p>
    </div>
  );
}

function ExportButton({
  status,
  onClick,
  label,
  icon,
}: {
  status: "idle" | "exporting" | "done" | "error";
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={status === "exporting"}
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2.5 font-display text-sm font-semibold tracking-wide transition-all duration-150",
        status === "done"
          ? "bg-accent-green/20 border border-accent-green/30 text-accent-green"
          : status === "error"
            ? "bg-accent-red/20 border border-accent-red/30 text-accent-red"
            : "bg-bg-card-hover border border-border text-text-primary hover:border-border-hover hover:text-accent-teal",
        status === "exporting" && "opacity-70 cursor-not-allowed"
      )}
    >
      {status === "exporting" ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : status === "done" ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          Downloaded
        </>
      ) : status === "error" ? (
        <>
          <AlertCircle className="h-4 w-4" />
          Failed
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </button>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatBackupDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
