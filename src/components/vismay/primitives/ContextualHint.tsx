"use client";

import { motion, useReducedMotion } from "motion/react";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContextualHintProps {
  /** The hint label text — e.g. "Connects to Fundamental Rights, which you studied before." */
  label: string;
  /** Triggered when the user clicks the "How?" button. */
  onOpen: () => void;
  /** Triggered when the user dismisses the hint. Optional. */
  onDismiss?: () => void;
  className?: string;
}

/**
 * ContextualHint
 *
 * A slim inline row that quietly surfaces a connection between the current
 * topic and something the learner has already encountered. Rendered as a
 * cream-tinted strip with a small ✧ icon, the label in forest text, a
 * "How?" button on the right, and a dismiss × on the far right.
 *
 * Subtle entrance via motion (fade + slight lift). When reduced motion is
 * preferred, the entrance is skipped.
 */
export function ContextualHint({
  label,
  onOpen,
  onDismiss,
  className,
}: ContextualHintProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      role="note"
      className={cn(
        "group flex items-center gap-3",
        "rounded-xl px-4 py-2.5",
        "bg-cream/50 border border-border/70",
        "transition-colors duration-200 hover:bg-cream/70",
        className,
      )}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <Sparkles
        aria-hidden="true"
        size={14}
        strokeWidth={1.75}
        className="shrink-0 text-gold"
      />
      <p className="flex-1 text-sm text-forest leading-snug min-w-0 truncate">
        {label}
      </p>

      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "shrink-0 text-xs font-semibold text-forest",
          "px-2 py-1 rounded-md",
          "transition-colors duration-200 hover:bg-cream",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
        )}
      >
        How?
      </button>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss hint"
          className={cn(
            "shrink-0 grid place-items-center w-6 h-6 rounded-full",
            "text-muted-foreground hover:text-forest hover:bg-cream",
            "transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
          )}
        >
          <X aria-hidden="true" size={13} strokeWidth={2} />
        </button>
      )}
    </motion.div>
  );
}

export default ContextualHint;
