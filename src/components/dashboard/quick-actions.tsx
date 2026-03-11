"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { ClipboardCheck, Bot, Scale, Dumbbell } from "lucide-react";

const actions = [
  {
    label: "Log Today",
    href: "/daily-log",
    icon: ClipboardCheck,
    description: "Daily check-in",
  },
  {
    label: "Talk to Coach",
    href: "/ai-coach",
    icon: Bot,
    description: "AI guidance",
  },
  {
    label: "Log Weight",
    href: "/body-metrics",
    icon: Scale,
    description: "Track weigh-in",
  },
  {
    label: "Log Workout",
    href: "/training",
    icon: Dumbbell,
    description: "Record session",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardTitle>Quick Actions</CardTitle>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action, i) => (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Link
                href={action.href}
                className="group flex flex-col items-center gap-1.5 rounded-lg border border-border bg-bg-card p-3 transition-all duration-200 hover:border-accent-teal/40 hover:bg-bg-card-hover"
              >
                <action.icon className="h-5 w-5 text-text-muted transition-colors group-hover:text-accent-teal" />
                <span className="font-display text-xs font-semibold text-text-secondary transition-colors group-hover:text-accent-teal tracking-wide">
                  {action.label}
                </span>
                <span className="text-[10px] text-text-muted">
                  {action.description}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
