"use client";

import { motion } from "framer-motion";
import { X, DollarSign, Flame, Heart, ShieldCheck } from "lucide-react";

interface SobrietyDetailSheetProps {
  days: number;
  moneySaved: number;
  caloriesAvoided: number;
  healthBenefit: string;
  onClose: () => void;
}

export function SobrietyDetailSheet({
  days,
  moneySaved,
  caloriesAvoided,
  healthBenefit,
  onClose,
}: SobrietyDetailSheetProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-bg-card p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent-teal" />
            <h3 className="font-display text-lg font-bold text-text-primary">
              Alcohol-Free
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Big number */}
        <div className="text-center mb-6">
          <p className="font-display text-5xl font-bold text-accent-teal tabular-nums">
            {days.toLocaleString()}
          </p>
          <p className="text-sm text-text-secondary uppercase tracking-wide mt-1">
            Days Sober
          </p>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          {/* Money saved */}
          <div className="flex items-center gap-3 rounded-lg bg-bg-card-hover/60 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-green/10">
              <DollarSign className="h-4.5 w-4.5 text-accent-green" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-text-muted uppercase tracking-wide">Money Saved</p>
              <p className="font-display text-lg font-bold text-text-primary tabular-nums">
                ${moneySaved.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Calories avoided */}
          <div className="flex items-center gap-3 rounded-lg bg-bg-card-hover/60 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-amber/10">
              <Flame className="h-4.5 w-4.5 text-accent-amber" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-text-muted uppercase tracking-wide">Calories Avoided</p>
              <p className="font-display text-lg font-bold text-text-primary tabular-nums">
                {caloriesAvoided.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Health benefits */}
          <div className="flex items-start gap-3 rounded-lg bg-bg-card-hover/60 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-teal/10 mt-0.5">
              <Heart className="h-4.5 w-4.5 text-accent-teal" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Health Benefits</p>
              <p className="text-sm text-text-secondary leading-relaxed">
                {healthBenefit}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
