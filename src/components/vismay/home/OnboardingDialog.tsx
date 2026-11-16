"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useVismayStore } from "@/lib/store/useVismayStore";
import type {
  ExplanationStyle,
  TechnicalLevel,
  UserPreferencesData,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLE_OPTIONS: { value: ExplanationStyle; label: string; hint: string }[] = [
  { value: "concise", label: "Concise", hint: "Just the essentials, in a few lines." },
  { value: "examples", label: "Examples", hint: "Lead with a concrete example." },
  { value: "detailed", label: "Detailed", hint: "Thorough, step by step." },
  { value: "exploratory", label: "Exploratory", hint: "Open threads I can follow." },
];

const LEVEL_OPTIONS: { value: TechnicalLevel; label: string; hint: string }[] = [
  { value: "beginner", label: "Beginner", hint: "New to this area." },
  { value: "balanced", label: "Balanced", hint: "Some familiarity, comfortable." },
  { value: "advanced", label: "Advanced", hint: "Comfortable with jargon." },
];

const DEFAULT_PREFS: UserPreferencesData = {
  explanationStyle: "concise",
  technicalLevel: "balanced",
  showDiagrams: true,
  showCitations: true,
  onboardingDone: false,
};

/**
 * Lightweight onboarding / preferences dialog.
 *
 * Two radio groups (explanation style + technical level), one checkbox
 * for auto-diagrams. Saves via PUT /api/preferences and closes.
 *
 * Controlled by `useVismayStore.onboardingOpen` / `setOnboardingOpen`.
 * Opens automatically on first load if `preferences.onboardingDone === false`.
 */
export function OnboardingDialog() {
  const open = useVismayStore((s) => s.onboardingOpen);
  const setOpen = useVismayStore((s) => s.setOnboardingOpen);
  const preferences = useVismayStore((s) => s.preferences);
  const setPreferences = useVismayStore((s) => s.setPreferences);

  const [style, setStyle] = useState<ExplanationStyle>("concise");
  const [level, setLevel] = useState<TechnicalLevel>("balanced");
  const [showDiagrams, setShowDiagrams] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync from store when preferences load.
  useEffect(() => {
    if (preferences) {
      setStyle(preferences.explanationStyle);
      setLevel(preferences.technicalLevel);
      setShowDiagrams(preferences.showDiagrams);
    }
  }, [preferences]);

  // Auto-open on first load if not onboarded.
  useEffect(() => {
    if (preferences && !preferences.onboardingDone) {
      setOpen(true);
    }
  }, [preferences, setOpen]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          explanationStyle: style,
          technicalLevel: level,
          showDiagrams,
          showCitations: preferences?.showCitations ?? true,
          onboardingDone: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      const data = (await res.json()) as { preferences: UserPreferencesData };
      setPreferences(data.preferences ?? { ...DEFAULT_PREFS, onboardingDone: true });
      setOpen(false);
    } catch {
      setError("Could not save your preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl border-border bg-paper p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-7 py-6">
          <DialogTitle className="font-serif text-2xl text-forest">
            How do you like explanations?
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Tell Vismay your defaults. You can change these any time from the
            settings.
          </DialogDescription>
        </DialogHeader>

        <div className="vismay-scroll max-h-[60vh] space-y-8 overflow-y-auto px-7 py-6">
          <fieldset>
            <legend className="mb-3 text-[10px] font-bold uppercase tracking-[2px] text-sage">
              Explanation style
            </legend>
            <RadioGroup
              value={style}
              onValueChange={(v) => setStyle(v as ExplanationStyle)}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              {STYLE_OPTIONS.map((opt) => (
                <RadioCard
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  hint={opt.hint}
                  checked={style === opt.value}
                />
              ))}
            </RadioGroup>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-[10px] font-bold uppercase tracking-[2px] text-sage">
              Technical level
            </legend>
            <RadioGroup
              value={level}
              onValueChange={(v) => setLevel(v as TechnicalLevel)}
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              {LEVEL_OPTIONS.map((opt) => (
                <RadioCard
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  hint={opt.hint}
                  checked={level === opt.value}
                  compact
                />
              ))}
            </RadioGroup>
          </fieldset>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-cream/40 p-4">
            <Checkbox
              id="onboarding-diagrams"
              checked={showDiagrams}
              onCheckedChange={(c) => setShowDiagrams(Boolean(c))}
              className="border-sage/60 data-[state=checked]:bg-forest data-[state=checked]:border-forest"
            />
            <div>
              <Label
                htmlFor="onboarding-diagrams"
                className="text-sm font-medium text-forest"
              >
                Show diagrams automatically when helpful
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Vismay will surface visual explanations inline as you read.
              </p>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-forest/80">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="border-t border-border px-7 py-5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-forest"
          >
            Not now
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-forest text-paper hover:bg-forest/90"
          >
            {saving ? "Saving..." : "Save preferences"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RadioCardProps {
  value: string;
  label: string;
  hint: string;
  checked: boolean;
  compact?: boolean;
}

function RadioCard({ value, label, hint, checked, compact }: RadioCardProps) {
  return (
    <Label
      htmlFor={`opt-${value}`}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border bg-paper p-4 transition-all",
        compact ? "sm:flex-col sm:gap-1" : "",
        checked
          ? "border-forest/60 bg-cream/60 shadow-soft"
          : "border-border hover:border-sage/60 hover:bg-cream/30"
      )}
    >
      <RadioGroupItem
        id={`opt-${value}`}
        value={value}
        className="mt-0.5 border-sage/60 text-forest data-[state=checked]:border-forest"
      />
      <span className="flex-1">
        <span className="block text-sm font-medium text-forest">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
    </Label>
  );
}

export default OnboardingDialog;
