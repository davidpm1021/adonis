"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MinusCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PreventiveCareItem {
  id: number;
  itemName: string;
  category: string;
  status: string | null;
  dueDate: string | null;
  completedDate: string | null;
  result: string | null;
  resultValue: string | null;
  provider: string | null;
  notes: string | null;
  nextDue: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CareItemProps {
  item: PreventiveCareItem;
  onUpdate: (id: number, updates: Partial<PreventiveCareItem>) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type StatusInfo = {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
};

function getStatusInfo(status: string | null, dueDate: string | null): StatusInfo {
  const now = new Date();
  const today = now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });

  if (status === "completed") {
    return {
      label: "Completed",
      color: "text-accent-green",
      bgColor: "bg-accent-green-dim",
      borderColor: "border-accent-green/30",
      icon: <CheckCircle2 className="h-4 w-4 text-accent-green" />,
    };
  }

  if (dueDate) {
    const due = new Date(dueDate + "T00:00:00");
    const todayDate = new Date(today + "T00:00:00");
    const diffDays = Math.ceil((due.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: "Overdue",
        color: "text-accent-red",
        bgColor: "bg-accent-red-dim",
        borderColor: "border-accent-red/30",
        icon: <AlertCircle className="h-4 w-4 text-accent-red" />,
      };
    }
    if (diffDays <= 30) {
      const label = status === "scheduled" ? "Scheduled" : "Due Soon";
      return {
        label,
        color: "text-accent-amber",
        bgColor: "bg-accent-amber-dim",
        borderColor: "border-accent-amber/30",
        icon: <AlertTriangle className="h-4 w-4 text-accent-amber" />,
      };
    }
    if (status === "scheduled") {
      return {
        label: "Scheduled",
        color: "text-accent-amber",
        bgColor: "bg-accent-amber-dim",
        borderColor: "border-accent-amber/30",
        icon: <Calendar className="h-4 w-4 text-accent-amber" />,
      };
    }
  }

  return {
    label: "Not Scheduled",
    color: "text-text-muted",
    bgColor: "bg-bg-card-hover",
    borderColor: "border-border",
    icon: <MinusCircle className="h-4 w-4 text-text-muted" />,
  };
}

function getDaysUntilDue(dueDate: string | null): { text: string; isOverdue: boolean } | null {
  if (!dueDate) return null;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const due = new Date(dueDate + "T00:00:00");
  const todayDate = new Date(today + "T00:00:00");
  const diffDays = Math.ceil((due.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} overdue`, isOverdue: true };
  }
  if (diffDays === 0) {
    return { text: "Due today", isOverdue: false };
  }
  return { text: `${diffDays} day${diffDays !== 1 ? "s" : ""} until due`, isOverdue: false };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CareItem({ item, onUpdate }: CareItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    status: item.status ?? "not_scheduled",
    dueDate: item.dueDate ?? "",
    completedDate: item.completedDate ?? "",
    result: item.result ?? "",
    resultValue: item.resultValue ?? "",
    provider: item.provider ?? "",
    notes: item.notes ?? "",
    nextDue: item.nextDue ?? "",
  });

  const statusInfo = getStatusInfo(item.status, item.dueDate);
  const daysInfo = item.status !== "completed" ? getDaysUntilDue(item.dueDate) : null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(item.id, {
        status: editData.status || null,
        dueDate: editData.dueDate || null,
        completedDate: editData.completedDate || null,
        result: editData.result || null,
        resultValue: editData.resultValue || null,
        provider: editData.provider || null,
        notes: editData.notes || null,
        nextDue: editData.nextDue || null,
      });
      setIsExpanded(false);
    } catch {
      // Error is handled in parent
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        isExpanded ? "border-accent-teal/30 bg-bg-card" : "border-border bg-bg-primary hover:border-border-hover"
      )}
    >
      {/* Header / Summary */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {statusInfo.icon}
          <div className="min-w-0 flex-1">
            <p className="font-body text-sm font-medium text-text-primary truncate">
              {item.itemName}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {item.dueDate && item.status !== "completed" && (
                <span className="flex items-center gap-1 text-xs text-text-muted">
                  <Calendar className="h-3 w-3" />
                  {formatDate(item.dueDate)}
                </span>
              )}
              {item.completedDate && item.status === "completed" && (
                <span className="flex items-center gap-1 text-xs text-text-muted">
                  <CheckCircle2 className="h-3 w-3" />
                  {formatDate(item.completedDate)}
                </span>
              )}
              {daysInfo && (
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs",
                    daysInfo.isOverdue ? "text-accent-red" : "text-text-muted"
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {daysInfo.text}
                </span>
              )}
              {item.provider && (
                <span className="text-xs text-text-muted">
                  {item.provider}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-2 shrink-0">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-display text-xs",
              statusInfo.bgColor,
              statusInfo.color
            )}
          >
            {statusInfo.label}
          </span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-text-muted" />
          </motion.div>
        </div>
      </button>

      {/* Expanded Edit Form */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border">
              {/* Status */}
              <div>
                <label className="block font-body text-xs text-text-secondary mb-1.5">
                  Status
                </label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData((d) => ({ ...d, status: e.target.value }))}
                  className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors [color-scheme:dark]"
                >
                  <option value="not_scheduled">Not Scheduled</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                  <option value="active">Active</option>
                </select>
              </div>

              {/* Due Date + Completed Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-body text-xs text-text-secondary mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editData.dueDate}
                    onChange={(e) => setEditData((d) => ({ ...d, dueDate: e.target.value }))}
                    className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary tabular-nums focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block font-body text-xs text-text-secondary mb-1.5">
                    Completed Date
                  </label>
                  <input
                    type="date"
                    value={editData.completedDate}
                    onChange={(e) => setEditData((d) => ({ ...d, completedDate: e.target.value }))}
                    className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary tabular-nums focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Result + Result Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-body text-xs text-text-secondary mb-1.5">
                    Result
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Normal, Abnormal"
                    value={editData.result}
                    onChange={(e) => setEditData((d) => ({ ...d, result: e.target.value }))}
                    className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-body text-xs text-text-secondary mb-1.5">
                    Result Value
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 120/80"
                    value={editData.resultValue}
                    onChange={(e) => setEditData((d) => ({ ...d, resultValue: e.target.value }))}
                    className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
                  />
                </div>
              </div>

              {/* Provider */}
              <div>
                <label className="block font-body text-xs text-text-secondary mb-1.5">
                  Provider
                </label>
                <input
                  type="text"
                  placeholder="Doctor or facility name"
                  value={editData.provider}
                  onChange={(e) => setEditData((d) => ({ ...d, provider: e.target.value }))}
                  className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
                />
              </div>

              {/* Next Due */}
              <div>
                <label className="block font-body text-xs text-text-secondary mb-1.5">
                  Next Due Date
                </label>
                <input
                  type="date"
                  value={editData.nextDue}
                  onChange={(e) => setEditData((d) => ({ ...d, nextDue: e.target.value }))}
                  className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary tabular-nums focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors [color-scheme:dark]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-body text-xs text-text-secondary mb-1.5">
                  Notes
                </label>
                <textarea
                  placeholder="Additional notes..."
                  rows={2}
                  value={editData.notes}
                  onChange={(e) => setEditData((d) => ({ ...d, notes: e.target.value }))}
                  className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors resize-none"
                />
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-display text-sm font-semibold tracking-wide transition-all duration-150",
                  isSaving
                    ? "opacity-70 cursor-not-allowed bg-accent-teal/20 border border-accent-teal/30 text-accent-teal"
                    : "bg-accent-teal border border-accent-teal text-bg-primary hover:bg-accent-teal/90 active:scale-[0.98]"
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
