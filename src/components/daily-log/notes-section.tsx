"use client";

import { FileText } from "lucide-react";
import { CollapsibleSection } from "./collapsible-section";

interface NotesData {
  wins: string | null;
  struggles: string | null;
  notes: string | null;
}

interface NotesSectionProps {
  data: NotesData;
  onChange: (data: Partial<NotesData>) => void;
}

const textareaClass =
  "w-full rounded-md border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors resize-none";

export function NotesSection({ data, onChange }: NotesSectionProps) {
  return (
    <CollapsibleSection
      title="Reflections"
      icon={<FileText className="h-4 w-4 text-accent-green" />}
      defaultOpen={false}
    >
      <div className="space-y-4">
        <div>
          <label className="block font-body text-xs text-text-secondary mb-1.5">
            Wins
          </label>
          <textarea
            rows={2}
            placeholder="What went well today?"
            value={data.wins ?? ""}
            onChange={(e) => onChange({ wins: e.target.value || null })}
            className={textareaClass}
          />
        </div>

        <div>
          <label className="block font-body text-xs text-text-secondary mb-1.5">
            Struggles
          </label>
          <textarea
            rows={2}
            placeholder="What was hard?"
            value={data.struggles ?? ""}
            onChange={(e) => onChange({ struggles: e.target.value || null })}
            className={textareaClass}
          />
        </div>

        <div>
          <label className="block font-body text-xs text-text-secondary mb-1.5">
            Notes
          </label>
          <textarea
            rows={2}
            placeholder="Anything else..."
            value={data.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value || null })}
            className={textareaClass}
          />
        </div>
      </div>
    </CollapsibleSection>
  );
}
