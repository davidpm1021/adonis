"use client";

import { useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { StreakCard } from "./streak-card";
import { SobrietyDetailSheet } from "./sobriety-detail-sheet";
import { STREAK_BEHAVIORS } from "@/lib/constants";

interface StreakData {
  current: number;
  best: number;
  todayComplete: boolean;
}

interface StreakCardsGridProps {
  streaks: Record<string, StreakData>;
  sobrietyDays?: number;
  moneySaved?: number;
  caloriesAvoided?: number;
  healthBenefit?: string;
}

export function StreakCardsGrid({
  streaks,
  sobrietyDays,
  moneySaved,
  caloriesAvoided,
  healthBenefit,
}: StreakCardsGridProps) {
  const [showSobriety, setShowSobriety] = useState(false);

  return (
    <>
      <Card className="md:col-span-2 lg:col-span-3">
        <CardTitle>Streaks</CardTitle>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {STREAK_BEHAVIORS.map((behavior, i) => {
              const streak = streaks[behavior.key] || {
                current: 0,
                best: 0,
                todayComplete: false,
              };
              return (
                <StreakCard
                  key={behavior.key}
                  behaviorKey={behavior.key}
                  label={behavior.label}
                  currentStreak={streak.current}
                  bestStreak={streak.best}
                  todayComplete={streak.todayComplete}
                  index={i}
                  onClick={
                    behavior.key === "alcoholFree"
                      ? () => setShowSobriety(true)
                      : undefined
                  }
                />
              );
            })}
            {/* Overall streak card */}
            {streaks.overall && (
              <StreakCard
                behaviorKey="overall"
                label="Overall"
                currentStreak={streaks.overall.current}
                bestStreak={streaks.overall.best}
                todayComplete={streaks.overall.todayComplete}
                index={STREAK_BEHAVIORS.length}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {showSobriety && (
        <SobrietyDetailSheet
          days={sobrietyDays ?? streaks.alcoholFree?.current ?? 0}
          moneySaved={moneySaved ?? 0}
          caloriesAvoided={caloriesAvoided ?? 0}
          healthBenefit={healthBenefit ?? ""}
          onClose={() => setShowSobriety(false)}
        />
      )}
    </>
  );
}
