"use client";

import { useEffect, useState } from "react";
import { SetupWizard } from "./setup-wizard";

interface SetupGateProps {
  children: React.ReactNode;
}

export function SetupGate({ children }: SetupGateProps) {
  const [status, setStatus] = useState<"loading" | "setup" | "ready">("loading");
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch("/api/setup");
        if (!res.ok) {
          // If API fails, assume setup complete (don't block existing users)
          setStatus("ready");
          return;
        }
        const json = await res.json();
        if (json.data?.setupComplete) {
          setStatus("ready");
        } else {
          setProfileData(json.data?.profile || null);
          setStatus("setup");
        }
      } catch {
        // On error, don't block — assume ready
        setStatus("ready");
      }
    }

    checkSetup();
  }, []);

  if (status === "loading") {
    // Brief loading state — matches app background
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-teal border-t-transparent" />
      </div>
    );
  }

  if (status === "setup") {
    return (
      <SetupWizard
        initialData={profileData || undefined}
        onComplete={() => {
          setStatus("ready");
          // Force full page reload to get fresh server data
          window.location.reload();
        }}
      />
    );
  }

  return <>{children}</>;
}
