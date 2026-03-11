"use client";

import { useEffect, useState, useCallback } from "react";
import { StreakHero } from "./streak-hero";
import { TodaysProgress } from "./todays-progress";
import { StreakCardsGrid } from "./streak-cards-grid";
import { StreakCelebrationModal } from "./streak-celebration-modal";

interface BehaviorStatus {
  key: string;
  label: string;
  done: boolean;
  href: string;
  restDay?: boolean;
}

interface StreakData {
  current: number;
  best: number;
  todayComplete: boolean;
}

interface Milestone {
  id: number;
  streakType: string;
  milestone: number;
  achievedDate: string;
}

interface DashboardStreakHubProps {
  initialBehaviors: BehaviorStatus[];
  sobrietyDays: number;
  moneySaved: number;
  caloriesAvoided: number;
  healthBenefit: string;
}

export function DashboardStreakHub({
  initialBehaviors,
  sobrietyDays,
  moneySaved,
  caloriesAvoided,
  healthBenefit,
}: DashboardStreakHubProps) {
  const [streaks, setStreaks] = useState<Record<string, StreakData>>({});
  const [behaviors, setBehaviors] = useState(initialBehaviors);
  const [uncelebrated, setUncelebrated] = useState<Milestone[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function fetchStreaks() {
      try {
        const res = await fetch("/api/trends/streaks");
        if (!res.ok) return;
        const json = await res.json();
        const data = json.data;

        if (data?.streaks) {
          setStreaks(data.streaks);

          // Update behaviors with live todayComplete from API
          setBehaviors((prev) =>
            prev.map((b) => {
              const streak = data.streaks[b.key];
              if (streak && !b.restDay) {
                return { ...b, done: streak.todayComplete };
              }
              return b;
            })
          );
        }

        if (data?.uncelebratedMilestones) {
          setUncelebrated(data.uncelebratedMilestones);
        }
      } catch {
        // Silently fail — dashboard still works with server-rendered data
      } finally {
        setLoaded(true);
      }
    }

    fetchStreaks();
  }, []);

  const handleCelebrate = useCallback(async (id: number) => {
    try {
      await fetch("/api/streaks/milestones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setUncelebrated((prev) => prev.filter((m) => m.id !== id));
    } catch {
      // Silently fail
    }
  }, []);

  const overallStreak = streaks.overall?.current ?? 0;

  return (
    <>
      {/* 1. Streak Hero — full width */}
      <StreakHero currentStreak={overallStreak} />

      {/* 2. Today's Progress — full width */}
      <TodaysProgress behaviors={behaviors} />

      {/* 3. Streak Cards Grid — full width */}
      <StreakCardsGrid
        streaks={streaks}
        sobrietyDays={sobrietyDays}
        moneySaved={moneySaved}
        caloriesAvoided={caloriesAvoided}
        healthBenefit={healthBenefit}
      />

      {/* 4. Celebration Modal */}
      {uncelebrated.length > 0 && (
        <StreakCelebrationModal
          milestones={uncelebrated}
          onCelebrate={handleCelebrate}
        />
      )}
    </>
  );
}
