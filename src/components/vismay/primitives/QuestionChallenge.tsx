"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Check, X, ArrowRight, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChallengeData } from "@/lib/types";

export interface QuestionChallengeResult {
  correct: boolean;
  feedback: string;
  followUp?: string;
}

export interface QuestionChallengeProps {
  /** The challenge payload. */
  challenge: ChallengeData;
  /** Submit handler — should resolve to feedback + correctness. */
  onSubmit: (attempt: string) => Promise<QuestionChallengeResult>;
  /** Triggered when the user accepts a follow-up prompt. */
  onFollowUp?: (followUpPrompt: string) => void;
  className?: string;
}

/**
 * QuestionChallenge
 *
 * A compact practice/challenge card. Renders the prompt in serif, an answer
 * textarea, a submit button, and after submission a feedback banner
 * (green-tinted when correct, sage-tinted when not). If the response
 * includes a `followUp`, a "Try the next one →" button calls `onFollowUp`.
 */
export function QuestionChallenge({
  challenge,
  onSubmit,
  onFollowUp,
  className,
}: QuestionChallengeProps) {
  const reduceMotion = useReducedMotion();
  const [attempt, setAttempt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuestionChallengeResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = attempt.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const res = await onSubmit(text);
      setResult(res);
    } catch {
      setResult({
        correct: false,
        feedback:
          "Something went wrong while checking your answer. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const difficultyLabel: Record<ChallengeData["difficulty"], string> = {
    conceptual: "Conceptual",
    derivational: "Derivational",
    problem_solving: "Problem solving",
  };

  return (
    <motion.section
      className={cn(
        "rounded-xl border border-border bg-paper",
        "shadow-soft p-5 sm:p-6",
        className,
      )}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      aria-labelledby={`challenge-${challenge.id}-title`}
    >
      <header className="flex items-center justify-between gap-3 mb-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5",
            "text-[10px] font-semibold uppercase tracking-[0.18em] text-sage",
          )}
        >
          Challenge · {difficultyLabel[challenge.difficulty]}
        </span>
        {challenge.solved && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-forest">
            <Check size={12} strokeWidth={2.5} /> Solved
          </span>
        )}
      </header>

      <h3
        id={`challenge-${challenge.id}-title`}
        className="font-serif text-lg text-forest leading-snug mb-4"
      >
        {challenge.prompt}
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Textarea
          value={attempt}
          onChange={(e) => setAttempt(e.target.value)}
          placeholder="Write your answer…"
          aria-label="Your answer"
          rows={4}
          className={cn(
            "resize-none bg-cream/30 border-border",
            "focus-visible:border-gold/60",
          )}
          disabled={submitting}
        />

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {attempt.trim().length > 0
              ? `${attempt.trim().length} characters`
              : "Take your time."}
          </span>
          <Button
            type="submit"
            disabled={submitting || attempt.trim().length === 0}
            className={cn(
              "bg-forest text-white hover:bg-forest/90",
              "rounded-full px-5 h-9",
            )}
          >
            {submitting ? (
              <>
                <Loader2
                  aria-hidden="true"
                  size={14}
                  className="animate-spin"
                />
                Checking…
              </>
            ) : (
              "Submit answer"
            )}
          </Button>
        </div>
      </form>

      <AnimatePresence initial={false}>
        {result && (
          <motion.div
            key="feedback"
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(
              "mt-4 rounded-lg border p-4 overflow-hidden",
              result.correct
                ? "bg-forest/8 border-forest/30"
                : "bg-sage/15 border-sage/40",
            )}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className={cn(
                  "shrink-0 grid place-items-center w-6 h-6 rounded-full",
                  result.correct
                    ? "bg-forest text-white"
                    : "bg-sage text-forest",
                )}
              >
                {result.correct ? (
                  <Check size={13} strokeWidth={3} />
                ) : (
                  <X size={13} strokeWidth={3} />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider mb-1",
                    result.correct ? "text-forest" : "text-forest/80",
                  )}
                >
                  {result.correct ? "Nice work." : "Not quite."}
                </div>
                <p className="text-sm text-ink/85 leading-relaxed">
                  {result.feedback}
                </p>

                {result.followUp && onFollowUp && (
                  <button
                    type="button"
                    onClick={() => onFollowUp(result.followUp!)}
                    className={cn(
                      "mt-3 inline-flex items-center gap-1.5",
                      "text-sm font-semibold text-forest",
                      "hover:gap-2 transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-md px-1",
                    )}
                  >
                    Try the next one
                    <ArrowRight
                      aria-hidden="true"
                      size={14}
                      strokeWidth={2}
                    />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

export default QuestionChallenge;
