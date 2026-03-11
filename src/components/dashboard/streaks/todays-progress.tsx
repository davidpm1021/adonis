"use client";

import { motion } from "framer-motion";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import {
  ClipboardCheck,
  Footprints,
  Dumbbell,
  Beef,
  Pill,
  ShieldCheck,
  Moon,
  Check,
} from "lucide-react";
import Link from "next/link";

interface BehaviorStatus {
  key: string;
  label: string;
  done: boolean;
  href: string;
  restDay?: boolean;
}

interface TodaysProgressProps {
  behaviors: BehaviorStatus[];
}

const ICONS: Record<string, React.ReactNode> = {
  dailyLog: <ClipboardCheck className="h-4.5 w-4.5" />,
  morningWalk: <Footprints className="h-4.5 w-4.5" />,
  strengthTraining: <Dumbbell className="h-4.5 w-4.5" />,
  proteinTarget: <Beef className="h-4.5 w-4.5" />,
  supplementsTaken: <Pill className="h-4.5 w-4.5" />,
  alcoholFree: <ShieldCheck className="h-4.5 w-4.5" />,
  sleepLogged: <Moon className="h-4.5 w-4.5" />,
};

export function TodaysProgress({ behaviors }: TodaysProgressProps) {
  const doneCount = behaviors.filter((b) => b.done).length;
  const total = behaviors.length;

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardTitle>
        <span className="flex items-center justify-between">
          <span>Today&apos;s Progress</span>
          <span className="font-display text-xs tabular-nums text-text-muted normal-case tracking-normal">
            {doneCount}/{total}
          </span>
        </span>
      </CardTitle>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {behaviors.map((b, i) => (
            <motion.div
              key={b.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
            >
              <Link
                href={b.href}
                className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all duration-200 ${
                  b.restDay
                    ? "cursor-default border-border/50 bg-bg-card opacity-50"
                    : b.done
                    ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
                    : "border-border bg-bg-card hover:bg-bg-card-hover hover:border-border-hover text-text-muted"
                }`}
              >
                {b.done && !b.restDay && (
                  <div className="absolute right-1 top-1">
                    <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent-green">
                      <Check className="h-2 w-2 text-bg-primary" strokeWidth={3} />
                    </div>
                  </div>
                )}
                <div className={b.done ? "text-accent-green" : b.restDay ? "text-text-muted/50" : "text-text-muted"}>
                  {ICONS[b.key] || <ClipboardCheck className="h-4.5 w-4.5" />}
                </div>
                <span className="text-[10px] font-display font-medium tracking-wide text-center leading-tight">
                  {b.restDay ? "Rest Day" : b.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
