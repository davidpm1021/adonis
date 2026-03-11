"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, ChevronRight, Calendar } from "lucide-react";

interface WeeklyReportWidgetProps {
  report: {
    weekStart: string;
    weekEnd: string;
    reportContent: string | null;
    createdAt: string | null;
  } | null;
}

function formatDateRange(start: string, end: string): string {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  const startDate = new Date(sy, sm - 1, sd);
  const endDate = new Date(sy, em - 1, ed);

  const startStr = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endStr = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${startStr} - ${endStr}`;
}

/** Extract the Summary section text from the report markdown */
function extractSummary(reportContent: string | null): string {
  if (!reportContent) return "";

  // Try to find the ## Summary section
  const summaryMatch = reportContent.match(/## Summary\s*\n([\s\S]*?)(?=\n## |\n# |$)/);
  if (summaryMatch) {
    const summaryText = summaryMatch[1].trim();
    // Take first ~200 chars, break at word boundary
    if (summaryText.length <= 200) return summaryText;
    const truncated = summaryText.slice(0, 200);
    const lastSpace = truncated.lastIndexOf(" ");
    return (lastSpace > 150 ? truncated.slice(0, lastSpace) : truncated) + "...";
  }

  // Fallback: take first meaningful text (skip headers)
  const lines = reportContent.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  const text = lines.slice(0, 3).join(" ").trim();
  if (text.length <= 200) return text;
  const truncated = text.slice(0, 200);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 150 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

export function WeeklyReportWidget({ report }: WeeklyReportWidgetProps) {
  if (!report) {
    return (
      <Card>
        <CardTitle>Weekly Report</CardTitle>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-teal/5">
              <FileText className="h-5 w-5 text-text-muted/40" />
            </div>
            <p className="text-xs text-text-muted text-center">
              No weekly report yet.
            </p>
            <Link
              href="/reports"
              className="flex items-center gap-1.5 rounded-md bg-accent-teal/10 px-3 py-1.5 font-display text-xs font-semibold text-accent-teal transition-colors hover:bg-accent-teal/20"
            >
              Generate Report
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const summary = extractSummary(report.reportContent);
  const dateRange = formatDateRange(report.weekStart, report.weekEnd);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Weekly Report</CardTitle>
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <Calendar className="h-3 w-3" />
          <span className="font-display tabular-nums">{dateRange}</span>
        </div>
      </div>
      <CardContent className="mt-3">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {summary ? (
            <p className="text-xs text-text-secondary leading-relaxed line-clamp-4">
              {summary}
            </p>
          ) : (
            <p className="text-xs text-text-muted italic">Report generated with no summary available.</p>
          )}

          <Link
            href="/reports"
            className="mt-3 flex items-center gap-1.5 font-display text-xs font-semibold text-accent-teal transition-colors hover:text-accent-teal/80"
          >
            View Full Report
            <ChevronRight className="h-3 w-3" />
          </Link>
        </motion.div>
      </CardContent>
    </Card>
  );
}
