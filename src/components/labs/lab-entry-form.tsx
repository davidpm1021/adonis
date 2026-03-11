"use client";

import { useState, useCallback } from "react";
import { Plus, Save, Loader2, Check } from "lucide-react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { LAB_BIOMARKERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface LabEntryFormProps {
  onSubmit: (entry: LabEntry) => Promise<void>;
}

interface LabEntry {
  date: string;
  testName: string;
  value: number;
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  notes: string;
}

const biomarkerNames = Object.keys(LAB_BIOMARKERS).sort();

function getTodayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export function LabEntryForm({ onSubmit }: LabEntryFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const [form, setForm] = useState<LabEntry>({
    date: getTodayET(),
    testName: "",
    value: 0,
    unit: "",
    referenceLow: null,
    referenceHigh: null,
    notes: "",
  });

  const filteredBiomarkers = searchTerm
    ? biomarkerNames.filter((name) =>
        name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : biomarkerNames;

  const selectBiomarker = useCallback((name: string) => {
    const bio = LAB_BIOMARKERS[name];
    setForm((prev) => ({
      ...prev,
      testName: name,
      unit: bio?.unit || "",
      referenceLow: bio?.low ?? null,
      referenceHigh: bio?.high ?? null,
    }));
    setSearchTerm(name);
    setShowDropdown(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent, addAnother: boolean) => {
    e.preventDefault();
    if (!form.testName || form.value === 0) return;

    setIsSaving(true);
    try {
      await onSubmit(form);
      setSavedCount((c) => c + 1);

      if (addAnother) {
        // Reset form but keep date
        setForm({
          date: form.date,
          testName: "",
          value: 0,
          unit: "",
          referenceLow: null,
          referenceHigh: null,
          notes: "",
        });
        setSearchTerm("");
      } else {
        setIsOpen(false);
        setForm({
          date: getTodayET(),
          testName: "",
          value: 0,
          unit: "",
          referenceLow: null,
          referenceHigh: null,
          notes: "",
        });
        setSearchTerm("");
      }
    } catch (err) {
      console.error("Failed to save lab entry:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm text-accent-teal transition-colors hover:bg-bg-card-hover hover:border-border-hover"
      >
        <Plus size={14} />
        <span>Add Lab Result</span>
        {savedCount > 0 && (
          <span className="flex items-center gap-1 rounded bg-accent-green-dim px-1.5 py-0.5 text-[10px] text-accent-green">
            <Check size={10} />
            {savedCount} saved
          </span>
        )}
      </button>
    );
  }

  return (
    <Card className="border-accent-teal/20">
      <CardTitle>Add Lab Result</CardTitle>
      <CardContent>
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
          {/* Row 1: Date + Test Name */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Date */}
            <div>
              <label className="mb-1 block text-[11px] font-display uppercase tracking-wider text-text-muted">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-teal transition-colors"
                required
              />
            </div>

            {/* Test Name (searchable dropdown) */}
            <div className="relative">
              <label className="mb-1 block text-[11px] font-display uppercase tracking-wider text-text-muted">
                Biomarker
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                  setForm((prev) => ({ ...prev, testName: e.target.value }));
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search biomarker..."
                className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-teal transition-colors"
                required
              />

              {/* Dropdown */}
              {showDropdown && filteredBiomarkers.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-bg-card shadow-lg">
                  {filteredBiomarkers.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => selectBiomarker(name)}
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors hover:bg-bg-card-hover",
                        name === form.testName
                          ? "text-accent-teal bg-accent-teal-dim"
                          : "text-text-secondary"
                      )}
                    >
                      <span>{name}</span>
                      <span className="text-text-muted">
                        {LAB_BIOMARKERS[name].unit}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Value + Unit */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-display uppercase tracking-wider text-text-muted">
                Value
              </label>
              <input
                type="number"
                step="any"
                value={form.value || ""}
                onChange={(e) =>
                  setForm({ ...form, value: parseFloat(e.target.value) || 0 })
                }
                className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary font-display tabular-nums outline-none focus:border-accent-teal transition-colors"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-display uppercase tracking-wider text-text-muted">
                Unit
              </label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-secondary outline-none focus:border-accent-teal transition-colors"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-display uppercase tracking-wider text-text-muted">
                Ref Low
              </label>
              <input
                type="number"
                step="any"
                value={form.referenceLow ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    referenceLow: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-secondary font-display tabular-nums outline-none focus:border-accent-teal transition-colors"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-display uppercase tracking-wider text-text-muted">
                Ref High
              </label>
              <input
                type="number"
                step="any"
                value={form.referenceHigh ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    referenceHigh: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-secondary font-display tabular-nums outline-none focus:border-accent-teal transition-colors"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-[11px] font-display uppercase tracking-wider text-text-muted">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Optional notes..."
              className="w-full resize-none rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-teal transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isSaving || !form.testName || !form.value}
              className="flex items-center gap-1.5 rounded-md bg-accent-teal px-3.5 py-2 text-xs font-semibold text-bg-primary transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              Save
            </button>

            <button
              type="button"
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
              disabled={isSaving || !form.testName || !form.value}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card-hover px-3.5 py-2 text-xs text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={13} />
              Save & Add Another
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSavedCount(0);
              }}
              className="ml-auto text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              Close
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
