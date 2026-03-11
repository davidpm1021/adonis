"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Message your AI Coach...",
  maxLength = 5000,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !disabled;

  // Auto-grow textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const maxHeight = 160; // ~6 lines
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // Reset height after clearing
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }, 0);
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="border-t border-border bg-bg-card px-4 py-3">
      <div className="flex items-end gap-2 rounded-lg border border-border bg-bg-primary p-2 transition-colors focus-within:border-border-hover">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, maxLength))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted",
            "outline-none min-h-[36px] py-1.5 px-1",
            disabled && "cursor-not-allowed opacity-50"
          )}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-all",
            canSend
              ? "bg-accent-teal text-bg-primary hover:brightness-110 cursor-pointer"
              : "bg-bg-card-hover text-text-muted cursor-not-allowed"
          )}
          aria-label="Send message"
        >
          <ArrowUp size={16} />
        </button>
      </div>

      {/* Character count */}
      <div className="mt-1 flex justify-between px-1">
        <span className="text-[10px] text-text-muted">
          Shift+Enter for new line
        </span>
        {value.length > maxLength * 0.8 && (
          <span
            className={cn(
              "text-[10px] font-display tabular-nums",
              value.length >= maxLength ? "text-accent-red" : "text-text-muted"
            )}
          >
            {value.length.toLocaleString()}/{maxLength.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
