"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface StepPersonalProps {
  data: {
    name?: string;
    dob?: string;
    sex?: string;
    heightInches?: number;
  };
  onNext: (data: { name: string; dob: string; sex: string; heightInches: number }) => void;
  onBack: () => void;
}

export function StepPersonal({ data, onNext, onBack }: StepPersonalProps) {
  const [name, setName] = useState(data.name || "");
  const [dob, setDob] = useState(data.dob || "");
  const [sex, setSex] = useState(data.sex || "");
  const [heightFeet, setHeightFeet] = useState(
    data.heightInches ? Math.floor(data.heightInches / 12) : 5
  );
  const [heightIn, setHeightIn] = useState(
    data.heightInches ? data.heightInches % 12 : 6
  );

  const isValid = name.trim() && dob && sex && heightFeet > 0;

  const handleNext = () => {
    if (!isValid) return;
    onNext({
      name: name.trim(),
      dob,
      sex,
      heightInches: heightFeet * 12 + heightIn,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="mx-auto max-w-md px-6 py-8"
    >
      <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
        About You
      </h2>
      <p className="text-text-secondary text-sm mb-8">
        Basic info to personalize your experience.
      </p>

      <div className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-display text-text-secondary uppercase tracking-wide mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg border border-border bg-bg-card px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none transition-colors"
          />
        </div>

        {/* DOB */}
        <div>
          <label className="block text-xs font-display text-text-secondary uppercase tracking-wide mb-1.5">
            Date of Birth
          </label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-card px-4 py-2.5 text-text-primary focus:border-accent-teal focus:outline-none transition-colors [color-scheme:dark]"
          />
        </div>

        {/* Sex */}
        <div>
          <label className="block text-xs font-display text-text-secondary uppercase tracking-wide mb-1.5">
            Biological Sex
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(["male", "female"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSex(s)}
                className={`rounded-lg border px-4 py-2.5 font-display text-sm capitalize transition-all ${
                  sex === s
                    ? "border-accent-teal bg-accent-teal/10 text-accent-teal"
                    : "border-border bg-bg-card text-text-muted hover:border-border-hover"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Height */}
        <div>
          <label className="block text-xs font-display text-text-secondary uppercase tracking-wide mb-1.5">
            Height
          </label>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={3}
                max={7}
                value={heightFeet}
                onChange={(e) => setHeightFeet(parseInt(e.target.value) || 0)}
                className="w-16 rounded-lg border border-border bg-bg-card px-3 py-2.5 text-center text-text-primary focus:border-accent-teal focus:outline-none transition-colors"
              />
              <span className="text-text-secondary text-sm">ft</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={11}
                value={heightIn}
                onChange={(e) => setHeightIn(parseInt(e.target.value) || 0)}
                className="w-16 rounded-lg border border-border bg-bg-card px-3 py-2.5 text-center text-text-primary focus:border-accent-teal focus:outline-none transition-colors"
              />
              <span className="text-text-secondary text-sm">in</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-10 flex justify-between">
        <button
          onClick={onBack}
          className="rounded-lg border border-border px-5 py-2.5 font-display text-sm text-text-secondary hover:border-border-hover transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!isValid}
          className="rounded-lg bg-accent-teal px-6 py-2.5 font-display text-sm font-semibold text-bg-primary tracking-wide transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </motion.div>
  );
}
