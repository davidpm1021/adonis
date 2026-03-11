"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, PanelLeftOpen, PanelLeftClose, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ChatMessage } from "@/components/ai-coach/chat-message";
import { ChatInput } from "@/components/ai-coach/chat-input";
import { SessionList, type Session } from "@/components/ai-coach/session-list";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

const QUICK_PROMPTS = [
  { label: "How am I doing?", icon: Sparkles },
  { label: "Analyze my sleep", icon: Sparkles },
  { label: "What should I focus on?", icon: Sparkles },
  { label: "Review my nutrition", icon: Sparkles },
];

export default function AICoachPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rateLimit, setRateLimit] = useState({ remaining: 50, limit: 50 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function fetchSessions() {
    try {
      const res = await fetch("/api/ai-coach/sessions");
      const json = await res.json();
      if (json.success && json.data) {
        // Enrich sessions with preview from first user message
        const enriched: Session[] = json.data.map((s: Session) => ({
          ...s,
          preview: s.preview || undefined,
        }));
        setSessions(enriched);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  }

  const loadSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setCurrentSessionId(sessionId);
    try {
      const res = await fetch(`/api/ai-coach/sessions/${sessionId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setMessages(json.data);

        // Update session preview from first user message
        const firstUserMsg = json.data.find((m: Message) => m.role === "user");
        if (firstUserMsg) {
          setSessions((prev) =>
            prev.map((s) =>
              s.sessionId === sessionId
                ? { ...s, preview: firstUserMsg.content.slice(0, 80) }
                : s
            )
          );
        }
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleNewSession() {
    setCurrentSessionId(null);
    setMessages([]);
  }

  async function handleDeleteSession(sessionId: string) {
    try {
      await fetch(`/api/ai-coach/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  }

  async function handleSend(message: string) {
    if (isSending) return;
    setIsSending(true);

    const now = new Date().toISOString();

    // Optimistically add user message to UI
    const tempUserMsg: Message = {
      id: Date.now(),
      sessionId: currentSessionId || "pending",
      role: "user",
      content: message,
      createdAt: now,
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch("/api/ai-coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          sessionId: currentSessionId || undefined,
        }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        const { sessionId: returnedSessionId, message: assistantContent, rateLimit: rl } = json.data;

        // Set the session ID if this was a new session
        if (!currentSessionId) {
          setCurrentSessionId(returnedSessionId);
        }

        // Add assistant message
        const assistantMsg: Message = {
          id: Date.now() + 1,
          sessionId: returnedSessionId,
          role: "assistant",
          content: assistantContent,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempUserMsg.id ? { ...m, sessionId: returnedSessionId } : m
          ).concat(assistantMsg)
        );

        // Update rate limit
        if (rl) {
          setRateLimit({ remaining: rl.remaining, limit: rl.limit });
        }

        // Refresh session list
        await fetchSessions();
      } else {
        // Error response - show as assistant message
        const errMsg: Message = {
          id: Date.now() + 1,
          sessionId: currentSessionId || "error",
          role: "assistant",
          content: json.error || "Something went wrong. Please try again.",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      const errMsg: Message = {
        id: Date.now() + 1,
        sessionId: currentSessionId || "error",
        role: "assistant",
        content: "Network error. Please check your connection and try again.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsSending(false);
    }
  }

  const visibleMessages = messages.filter((m) => m.role !== "system");
  const isRateLimited = rateLimit.remaining <= 0;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:h-[calc(100vh-1rem)]">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 md:px-6 md:pt-6">
        <PageHeader
          title="AI Coach"
          subtitle="Your personal health intelligence -- powered by Claude"
          actions={
            <div className="flex items-center gap-3">
              {/* Rate limit indicator */}
              <div className="flex items-center gap-1.5 rounded-md bg-bg-card px-2.5 py-1 border border-border">
                <Bot size={13} className="text-accent-teal" />
                <span
                  className={cn(
                    "font-display text-xs tabular-nums",
                    rateLimit.remaining <= 5
                      ? "text-accent-red"
                      : rateLimit.remaining <= 15
                        ? "text-accent-amber"
                        : "text-text-secondary"
                  )}
                >
                  {rateLimit.remaining}/{rateLimit.limit}
                </span>
                <span className="text-[10px] text-text-muted hidden sm:inline">
                  remaining today
                </span>
              </div>

              {/* Sidebar toggle */}
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary"
                title={sidebarOpen ? "Hide sessions" : "Show sessions"}
              >
                {sidebarOpen ? (
                  <PanelLeftClose size={16} />
                ) : (
                  <PanelLeftOpen size={16} />
                )}
              </button>
            </div>
          }
        />
      </div>

      {/* Main area: sidebar + chat */}
      <div className="flex min-h-0 flex-1">
        {/* Session sidebar */}
        {sidebarOpen && (
          <div className="hidden w-56 shrink-0 border-r border-border bg-bg-card md:flex md:flex-col">
            <SessionList
              sessions={sessions}
              currentSessionId={currentSessionId}
              onSelectSession={loadSession}
              onNewSession={handleNewSession}
              onDeleteSession={handleDeleteSession}
            />
          </div>
        )}

        {/* Chat area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-4 py-4 md:px-6"
          >
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-teal border-t-transparent" />
                  <span className="text-xs text-text-muted">Loading session...</span>
                </div>
              </div>
            ) : visibleMessages.length === 0 ? (
              /* Empty state */
              <div className="flex h-full flex-col items-center justify-center gap-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-teal-dim">
                  <Bot size={28} className="text-accent-teal" />
                </div>
                <div className="text-center">
                  <h2 className="font-display text-lg font-semibold text-text-primary">
                    Start a conversation with your AI Coach
                  </h2>
                  <p className="mt-1.5 max-w-sm text-sm text-text-secondary">
                    Ask about your progress, get personalized advice, or explore
                    your health data through conversation.
                  </p>
                </div>

                {/* Quick prompts */}
                <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt.label}
                      type="button"
                      onClick={() => handleSend(prompt.label)}
                      disabled={isSending || isRateLimited}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-2.5 text-left text-xs text-text-secondary transition-all",
                        "hover:border-border-hover hover:bg-bg-card-hover hover:text-text-primary",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                    >
                      <prompt.icon size={12} className="shrink-0 text-accent-teal" />
                      <span>{prompt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Messages list */
              <div className="mx-auto max-w-3xl space-y-4">
                {visibleMessages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    role={msg.role as "user" | "assistant"}
                    content={msg.content}
                    timestamp={msg.createdAt}
                  />
                ))}

                {/* Typing indicator */}
                {isSending && (
                  <div className="flex items-center gap-2.5 animate-fade-in">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-teal-dim">
                      <Bot size={14} className="text-accent-teal" />
                    </div>
                    <div className="rounded-lg border border-accent-teal/20 bg-accent-teal-dim px-3.5 py-2.5">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-teal [animation-delay:0ms]" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-teal [animation-delay:150ms]" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-teal [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Quick prompts inline (when messages exist) */}
          {visibleMessages.length > 0 && !isSending && (
            <div className="shrink-0 px-4 md:px-6">
              <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto pb-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.label}
                    type="button"
                    onClick={() => handleSend(prompt.label)}
                    disabled={isSending || isRateLimited}
                    className={cn(
                      "shrink-0 rounded-full border border-border bg-bg-card px-3 py-1 text-[11px] text-text-secondary transition-all",
                      "hover:border-border-hover hover:text-text-primary",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="shrink-0">
            <ChatInput
              onSend={handleSend}
              disabled={isSending || isRateLimited}
              placeholder={
                isRateLimited
                  ? "Daily message limit reached. Resets at midnight."
                  : "Message your AI Coach..."
              }
            />
          </div>
        </div>
      </div>

      {/* Mobile session selector (shown as dropdown) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute left-0 top-0 h-full w-64 bg-bg-card border-r border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 items-center justify-between border-b border-border px-3">
              <span className="font-display text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Sessions
              </span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded p-1 text-text-muted hover:text-text-primary"
              >
                <PanelLeftClose size={14} />
              </button>
            </div>
            <SessionList
              sessions={sessions}
              currentSessionId={currentSessionId}
              onSelectSession={(id) => {
                loadSession(id);
                setSidebarOpen(false);
              }}
              onNewSession={() => {
                handleNewSession();
                setSidebarOpen(false);
              }}
              onDeleteSession={handleDeleteSession}
            />
          </div>
        </div>
      )}
    </div>
  );
}
