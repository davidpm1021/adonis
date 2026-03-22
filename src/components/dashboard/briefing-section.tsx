"use client";

import { cn } from "@/lib/utils";

interface BriefingSectionProps {
  title: string;
  content: string;
  accent?: "teal" | "green" | "amber" | "red" | "muted";
  children?: React.ReactNode;
}

const accentColors = {
  teal: "border-accent-teal/40",
  green: "border-accent-green/40",
  amber: "border-amber-500/40",
  red: "border-accent-red/40",
  muted: "border-border",
};

export function BriefingSection({ title, content, accent = "teal", children }: BriefingSectionProps) {
  return (
    <div className={cn("border-l-2 pl-4 py-2", accentColors[accent])}>
      <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
        {title}
      </h3>
      <div
        className="text-sm text-text-primary leading-relaxed prose-invert prose-sm prose-strong:text-accent-teal prose-ul:mt-1 prose-li:text-text-secondary"
        dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
      />
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

/** Minimal markdown → HTML for briefing text */
function formatMarkdown(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*<\/li>)/g, "<ul class='list-disc pl-4 space-y-0.5'>$1</ul>")
    .replace(/\n/g, "<br />");
}
