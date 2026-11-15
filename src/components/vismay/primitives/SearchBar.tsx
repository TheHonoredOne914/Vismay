"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchBarProps {
  /** Called when the user submits a non-empty query. */
  onSubmit: (q: string) => void;
  /** Optional initial value (e.g. when restoring from URL state). */
  initialValue?: string;
  /** Autofocus the input on mount. */
  autoFocus?: boolean;
  /** Placeholder copy. */
  placeholder?: string;
  /** Extra class names on the outer container. */
  className?: string;
  /** Optional accessible label. */
  ariaLabel?: string;
}

/**
 * Vismay premium search bar.
 *
 * A rounded, paper-backed container with a magnifier glyph, a transparent
 * input, and a circular forest-green submit button on the right. Subtle
 * entrance animation via motion (fades + lifts in 18px over 0.8s with a
 * 0.8s delay so it appears after the hero title).
 */
export function SearchBar({
  onSubmit,
  initialValue = "",
  autoFocus = false,
  placeholder = "What would you like to understand today?",
  className,
  ariaLabel = "Ask Vismay a question",
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (autoFocus) {
      // Defer focus to next tick so the entrance animation doesn't fight it.
      const id = window.setTimeout(() => inputRef.current?.focus(), 900);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [autoFocus]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    onSubmit(q);
    setValue("");
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      role="search"
      aria-label={ariaLabel}
      className={cn(
        "relative flex items-center gap-3 w-full",
        "rounded-2xl bg-paper/90 backdrop-blur",
        "border border-border/80",
        "shadow-warm",
        "pl-5 pr-2 py-2",
        "focus-within:border-gold/60 focus-within:shadow-warm-lg",
        "transition-[border-color,box-shadow] duration-300",
        className,
      )}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <Search
        aria-hidden="true"
        className="text-sage shrink-0"
        size={22}
        strokeWidth={1.5}
      />

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          "flex-1 bg-transparent outline-none border-0",
          "text-ink placeholder:text-muted-foreground",
          "text-[15px] leading-tight py-1 min-w-0",
        )}
      />

      <button
        type="submit"
        aria-label="Submit question"
        className={cn(
          "shrink-0 grid place-items-center",
          "w-12 h-12 rounded-full",
          "bg-forest text-white",
          "shadow-[inset_0_1px_2px_rgba(255,255,255,0.18)]",
          "transition-transform duration-300 ease-out",
          "hover:translate-x-[2px] hover:bg-forest/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:opacity-50 disabled:pointer-events-none",
        )}
        disabled={!value.trim()}
      >
        <ArrowRight aria-hidden="true" size={20} strokeWidth={2} />
      </button>
    </motion.form>
  );
}

export default SearchBar;
