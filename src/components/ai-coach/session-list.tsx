"use client";

import { useState } from "react";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Session {
  sessionId: string;
  firstMessage: string;
  lastMessage: string;
  messageCount: number;
  preview?: string;
}

interface SessionListProps {
  sessions: Session[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SessionList({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: SessionListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteConfirm === sessionId) {
      onDeleteSession(sessionId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(sessionId);
      // Auto-clear confirmation after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* New Session button */}
      <button
        type="button"
        onClick={onNewSession}
        className="flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-sm text-accent-teal transition-colors hover:bg-bg-card-hover"
      >
        <Plus size={14} />
        <span>New Session</span>
      </button>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-text-muted">
            No sessions yet
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.sessionId === currentSessionId;
            const isDeletePending = deleteConfirm === session.sessionId;

            return (
              <button
                key={session.sessionId}
                type="button"
                onClick={() => onSelectSession(session.sessionId)}
                className={cn(
                  "group flex w-full items-start gap-2 border-b border-border px-3 py-2.5 text-left transition-colors",
                  isActive
                    ? "bg-accent-teal-dim border-l-2 border-l-accent-teal"
                    : "hover:bg-bg-card-hover"
                )}
              >
                <MessageSquare
                  size={14}
                  className={cn(
                    "mt-0.5 shrink-0",
                    isActive ? "text-accent-teal" : "text-text-muted"
                  )}
                />

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-xs",
                      isActive ? "text-text-primary" : "text-text-secondary"
                    )}
                  >
                    {session.preview || `Session ${session.sessionId.slice(0, 8)}`}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-text-muted">
                    <span>{formatSessionDate(session.lastMessage)}</span>
                    <span>{session.messageCount} msgs</span>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={(e) => handleDelete(session.sessionId, e)}
                  className={cn(
                    "mt-0.5 shrink-0 rounded p-0.5 transition-colors",
                    isDeletePending
                      ? "text-accent-red bg-accent-red-dim"
                      : "text-text-muted opacity-0 group-hover:opacity-100 hover:text-accent-red"
                  )}
                  title={isDeletePending ? "Click again to confirm" : "Delete session"}
                >
                  <Trash2 size={12} />
                </button>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
