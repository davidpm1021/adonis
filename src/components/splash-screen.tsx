"use client";

import { useEffect, useState } from "react";
import { Logo } from "./logo";

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("adonis-splash-seen");
    if (seen) {
      setShowSplash(false);
      return;
    }

    setShowSplash(true);

    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 1000);

    const dismissTimer = setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem("adonis-splash-seen", "1");
    }, 1200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, []);

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-primary transition-opacity duration-200 ${
          fadeOut ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="animate-pulse-glow">
          <Logo size="xl" />
        </div>
        <p className="mt-4 font-display text-sm tracking-[0.3em] text-text-secondary">
          REBUILD THE MACHINE
        </p>
      </div>
      <div className="invisible">{children}</div>
    </>
  );
}
