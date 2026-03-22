// ---------------------------------------------------------------------------
// Dashboard Maturity System
// Adapts visible widgets based on how long the user has been logging data.
// ---------------------------------------------------------------------------

export type DashboardPhase = "EARLY" | "ESTABLISHED" | "DATA_RICH";

export function getDashboardPhase(daysSinceFirstLog: number): DashboardPhase {
  if (daysSinceFirstLog >= 85) return "DATA_RICH";
  if (daysSinceFirstLog >= 29) return "ESTABLISHED";
  return "EARLY";
}

export function getVisibleWidgets(phase: DashboardPhase): string[] {
  const base = ["action-queue", "streak-hub", "quick-actions"];
  if (phase === "EARLY") return [...base, "phase-status"];
  if (phase === "ESTABLISHED") return [...base, "metrics-snapshot", "streak-calendar", "phase-status", "weekly-report"];
  return [...base, "metrics-snapshot", "streak-calendar", "phase-status", "weekly-report", "nudge-cards"];
}
