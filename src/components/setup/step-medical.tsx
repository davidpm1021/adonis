"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface StepMedicalProps {
  data: {
    medicalConditions?: string;
    medications?: string;
    allergies?: string;
  };
  onNext: (data: { medicalConditions: string; medications: string; allergies: string }) => void;
  onBack: () => void;
}

export function StepMedical({ data, onNext, onBack }: StepMedicalProps) {
  const [conditions, setConditions] = useState(
    data.medicalConditions ? tryParseArray(data.medicalConditions).join("\n") : ""
  );
  const [medications, setMedications] = useState(
    data.medications ? tryParseMedications(data.medications) : ""
  );
  const [allergies, setAllergies] = useState(
    data.allergies ? tryParseArray(data.allergies).join(", ") : ""
  );

  const handleNext = () => {
    const condArray = conditions
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const medArray = medications
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return { name: parts[0], dose: parts[1] || "", frequency: parts[2] || "daily" };
      });
    const allergyArray = allergies
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    onNext({
      medicalConditions: JSON.stringify(condArray),
      medications: JSON.stringify(medArray),
      allergies: JSON.stringify(allergyArray),
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
        Medical Info
      </h2>
      <p className="text-text-secondary text-sm mb-1">
        Optional but helps the AI Coach give better advice.
      </p>
      <p className="text-text-muted text-xs mb-8">
        All data stays local on your device.
      </p>

      <div className="space-y-5">
        {/* Conditions */}
        <div>
          <label className="block text-xs font-display text-text-secondary uppercase tracking-wide mb-1.5">
            Medical Conditions
          </label>
          <textarea
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder={"One per line, e.g.:\nSleep apnea\nPre-diabetes"}
            rows={3}
            className="w-full rounded-lg border border-border bg-bg-card px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Medications */}
        <div>
          <label className="block text-xs font-display text-text-secondary uppercase tracking-wide mb-1.5">
            Medications
          </label>
          <textarea
            value={medications}
            onChange={(e) => setMedications(e.target.value)}
            placeholder={"One per line: name, dose, frequency\ne.g. Lipitor, 20mg, daily"}
            rows={3}
            className="w-full rounded-lg border border-border bg-bg-card px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Allergies */}
        <div>
          <label className="block text-xs font-display text-text-secondary uppercase tracking-wide mb-1.5">
            Allergies
          </label>
          <input
            type="text"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="Comma-separated, e.g. Penicillin, Shellfish"
            className="w-full rounded-lg border border-border bg-bg-card px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none transition-colors"
          />
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
        <div className="flex gap-3">
          <button
            onClick={() =>
              onNext({
                medicalConditions: "[]",
                medications: "[]",
                allergies: "[]",
              })
            }
            className="rounded-lg border border-border px-5 py-2.5 font-display text-sm text-text-secondary hover:border-border-hover transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="rounded-lg bg-accent-teal px-6 py-2.5 font-display text-sm font-semibold text-bg-primary tracking-wide transition-all hover:brightness-110"
          >
            Next
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function tryParseArray(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function tryParseMedications(json: string): string {
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return "";
    return arr
      .map((m: { name?: string; dose?: string; frequency?: string }) =>
        [m.name, m.dose, m.frequency].filter(Boolean).join(", ")
      )
      .join("\n");
  } catch {
    return "";
  }
}
