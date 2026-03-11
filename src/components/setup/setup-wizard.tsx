"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { StepWelcome } from "./step-welcome";
import { StepPersonal } from "./step-personal";
import { StepGoals } from "./step-goals";
import { StepMedical } from "./step-medical";
import { StepHabits } from "./step-habits";
import { StepComplete } from "./step-complete";

interface WizardData {
  // Personal
  name?: string;
  dob?: string;
  sex?: string;
  heightInches?: number;
  // Goals
  startingWeight?: number;
  goalWeightLow?: number;
  goalWeightHigh?: number;
  // Medical
  medicalConditions?: string;
  medications?: string;
  allergies?: string;
  // Habits
  trackedBehaviors?: string;
  sobrietyStartDate?: string;
  weeklyAlcoholSpend?: number;
  weeklyAlcoholCalories?: number;
}

interface SetupWizardProps {
  initialData?: Partial<WizardData>;
  onComplete: () => void;
}

export function SetupWizard({ initialData, onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData || {});
  const [saving, setSaving] = useState(false);

  const saveStep = useCallback(
    async (stepData: Partial<WizardData>, isFinal = false) => {
      const merged = { ...data, ...stepData };
      setData(merged);

      try {
        const payload = {
          ...merged,
          currentStep: step,
          setupComplete: isFinal ? 1 : 0,
        };

        await fetch("/api/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("Failed to save wizard step:", err);
      }
    },
    [data, step]
  );

  const handleFinish = async () => {
    setSaving(true);
    await saveStep({}, true);
    setSaving(false);
    onComplete();
  };

  const totalSteps = 6;

  return (
    <div className="fixed inset-0 z-50 bg-bg-primary overflow-y-auto">
      {/* Progress dots */}
      {step > 1 && step < 6 && (
        <div className="fixed top-6 left-0 right-0 z-50 flex justify-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i + 1 === step
                  ? "w-8 bg-accent-teal"
                  : i + 1 < step
                  ? "w-1.5 bg-accent-teal/50"
                  : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <StepWelcome key="welcome" onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <StepPersonal
            key="personal"
            data={data}
            onNext={(d) => {
              saveStep(d);
              setStep(3);
            }}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepGoals
            key="goals"
            data={data}
            onNext={(d) => {
              saveStep(d);
              setStep(4);
            }}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <StepMedical
            key="medical"
            data={data}
            onNext={(d) => {
              saveStep(d);
              setStep(5);
            }}
            onBack={() => setStep(3)}
          />
        )}
        {step === 5 && (
          <StepHabits
            key="habits"
            data={data}
            onNext={(d) => {
              saveStep(d);
              setStep(6);
            }}
            onBack={() => setStep(4)}
          />
        )}
        {step === 6 && (
          <StepComplete
            key="complete"
            data={data}
            onFinish={handleFinish}
            saving={saving}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
