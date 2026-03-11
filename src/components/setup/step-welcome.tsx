"use client";

import { motion } from "framer-motion";

interface StepWelcomeProps {
  onNext: () => void;
}

export function StepWelcome({ onNext }: StepWelcomeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center"
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight text-accent-teal">
          AD
          <span className="inline-block relative">
            <span className="text-accent-teal">O</span>
          </span>
          NIS
        </h1>
      </motion.div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="font-display text-sm sm:text-base text-text-secondary tracking-[0.3em] uppercase mb-12"
      >
        Rebuild the machine.
      </motion.p>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="max-w-md text-text-secondary mb-12 leading-relaxed"
      >
        Your personal health intelligence platform. Track training, nutrition,
        sleep, labs, and more — with AI that adapts to your data.
      </motion.p>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.4 }}
        onClick={onNext}
        className="rounded-lg bg-accent-teal px-8 py-3 font-display text-sm font-semibold text-bg-primary tracking-wide uppercase transition-all hover:brightness-110 active:scale-95"
      >
        Get Started
      </motion.button>
    </motion.div>
  );
}
