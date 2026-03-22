"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Watch, Loader2, CheckCircle2, AlertCircle, Unplug } from "lucide-react";
import { cn } from "@/lib/utils";

interface GarminStatus {
  connected: boolean;
  enabled: boolean;
  email: string | null;
  lastSyncAt: string | null;
  syncIntervalMinutes: number;
}

export function GarminConnectSection() {
  const [status, setStatus] = useState<GarminStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/garmin/status");
      const json = await res.json();
      if (json.success) {
        setStatus(json.data);
      }
    } catch {
      console.error("Failed to fetch Garmin status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/garmin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (json.success) {
        setMessage({ type: "success", text: "Garmin connected successfully!" });
        setEmail("");
        setPassword("");
        await fetchStatus();
      } else {
        setMessage({ type: "error", text: json.error || "Failed to connect" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/garmin/auth", { method: "DELETE" });
      const json = await res.json();

      if (json.success) {
        setMessage({ type: "success", text: "Garmin disconnected." });
        await fetchStatus();
      } else {
        setMessage({ type: "error", text: json.error || "Failed to disconnect" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSync = async () => {
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/garmin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();

      if (json.success) {
        setMessage({ type: "success", text: `Synced data for ${json.data.date}` });
        await fetchStatus();
      } else {
        setMessage({ type: "error", text: json.error || "Sync failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center gap-3 text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading Garmin status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-teal/10">
            <Watch className="h-5 w-5 text-accent-teal" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold tracking-wide text-text-primary uppercase">
              Garmin Connect
            </h3>
            <p className="text-xs text-text-secondary">
              {status?.connected
                ? "Connected — syncing health data"
                : "Connect your Garmin account to auto-sync health data"}
            </p>
          </div>
          {status?.connected && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
            </div>
          )}
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={cn(
              "mb-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm",
              message.type === "success"
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            )}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        {status?.connected ? (
          /* Connected State */
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md bg-bg-primary/50 px-3 py-2">
              <span className="text-sm text-text-secondary">Account</span>
              <span className="text-sm text-text-primary font-mono">{status.email}</span>
            </div>

            <div className="flex items-center justify-between rounded-md bg-bg-primary/50 px-3 py-2">
              <span className="text-sm text-text-secondary">Last Sync</span>
              <span className="text-sm text-text-primary">
                {status.lastSyncAt
                  ? new Date(status.lastSyncAt).toLocaleString()
                  : "Never"}
              </span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSync}
                disabled={actionLoading}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  "bg-accent-teal text-bg-primary hover:bg-accent-teal/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Watch className="h-4 w-4" />
                )}
                Sync Now
              </button>

              <button
                onClick={handleDisconnect}
                disabled={actionLoading}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  "border border-red-500/30 text-red-400 hover:bg-red-500/10",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Unplug className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          /* Disconnected State — Login Form */
          <form onSubmit={handleConnect} className="space-y-3">
            <div>
              <label
                htmlFor="garmin-email"
                className="block text-xs font-medium text-text-secondary mb-1"
              >
                Garmin Email
              </label>
              <input
                id="garmin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className={cn(
                  "w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary",
                  "placeholder:text-text-secondary/50",
                  "focus:outline-none focus:ring-1 focus:ring-accent-teal focus:border-accent-teal"
                )}
              />
            </div>

            <div>
              <label
                htmlFor="garmin-password"
                className="block text-xs font-medium text-text-secondary mb-1"
              >
                Password
              </label>
              <input
                id="garmin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Garmin password"
                className={cn(
                  "w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary",
                  "placeholder:text-text-secondary/50",
                  "focus:outline-none focus:ring-1 focus:ring-accent-teal focus:border-accent-teal"
                )}
              />
            </div>

            <p className="text-xs text-text-secondary/70">
              Your password is encrypted at rest and never leaves this server.
            </p>

            <button
              type="submit"
              disabled={actionLoading || !email || !password}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                "bg-accent-teal text-bg-primary hover:bg-accent-teal/90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Watch className="h-4 w-4" />
              )}
              Connect Garmin
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
