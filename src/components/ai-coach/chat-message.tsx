"use client";

import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

/**
 * Simple markdown-like rendering: bold, italic, lists, inline code, line breaks.
 */
function renderContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="ml-4 list-disc space-y-0.5 my-1">
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Bullet list item
    if (/^[-*]\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
      continue;
    }

    // Numbered list item
    if (/^\d+\.\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^\d+\.\s+/, ""));
      continue;
    }

    flushList();

    if (trimmed === "") {
      elements.push(<br key={`br-${i}`} />);
    } else {
      elements.push(
        <p key={`p-${i}`} className="my-0.5">
          {renderInline(trimmed)}
        </p>
      );
    }
  }

  flushList();
  return elements;
}

/**
 * Render inline formatting: **bold**, *italic*, `code`
 */
function renderInline(text: string): React.ReactNode {
  // Split on bold, italic, and code patterns
  const parts: React.ReactNode[] = [];
  // Process with a regex that matches **bold**, *italic*, and `code`
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // **bold**
      parts.push(
        <strong key={key++} className="font-semibold text-text-primary">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // *italic*
      parts.push(
        <em key={key++} className="italic">
          {match[4]}
        </em>
      );
    } else if (match[5]) {
      // `code`
      parts.push(
        <code
          key={key++}
          className="rounded bg-bg-card-hover px-1 py-0.5 text-xs font-display text-accent-teal"
        >
          {match[6]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 0 ? text : parts;
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex w-full animate-fade-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex max-w-[85%] gap-2.5 md:max-w-[70%]",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        {/* Avatar area for assistant */}
        {!isUser && (
          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-teal-dim">
            <Bot size={14} className="text-accent-teal" />
          </div>
        )}

        <div className="flex flex-col gap-1">
          {/* Message bubble */}
          <div
            className={cn(
              "rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
              isUser
                ? "bg-bg-card-hover text-text-primary"
                : "border border-accent-teal/20 bg-accent-teal-dim text-text-primary"
            )}
          >
            <div className="space-y-0.5">{renderContent(content)}</div>
          </div>

          {/* Timestamp */}
          <span
            className={cn(
              "text-[10px] text-text-muted px-1",
              isUser ? "text-right" : "text-left"
            )}
          >
            {formatRelativeTime(timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}
