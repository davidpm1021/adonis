"use client";

import { Sidebar } from "./sidebar";
import { SplashScreen } from "../splash-screen";
import { SetupGate } from "../setup/setup-gate";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SplashScreen>
      <SetupGate>
        <div className="min-h-screen bg-bg-primary">
          <Sidebar />
          {/* Main content - offset for sidebar on desktop, bottom nav on mobile */}
          <main className="md:pl-56 pb-16 md:pb-0 min-h-screen">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </SetupGate>
    </SplashScreen>
  );
}
