"use client";

/**
 * Vismay — shared view scaffolding (light theme only).
 *
 * Every secondary view reuses the same shell: a numbered overline,
 * a serif title, a quiet sub, and consistent loading / error / empty
 * states so the user always knows what is happening.
 */

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { AlertCircle, Compass, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useVismayStore } from "@/lib/store/useVismayStore";

// ---------------------------------------------------------------------------
// ViewShell
// ---------------------------------------------------------------------------

export interface ViewShellProps {
  /** Numbered overline, e.g. "01 / MY LEARNING" */
  overline: string;
  /** Serif title */
  title: React.ReactNode;
  /** Optional quiet subtitle */
  subtitle?: React.ReactNode;
  /** Optional right-side actions */
  actions?: React.ReactNode;
  /** Children */
  children?: React.ReactNode;
  /** Optional extra className for the outer wrapper */
  className?: string;
}

export function ViewShell({
  overline,
  title,
  subtitle,
  actions,
  children,
  className,
}: ViewShellProps) {
  const reduce = useReducedMotion();
  return (
    <section
      className={cn(
        "mx-auto w-full max-w-5xl px-6 py-12 sm:px-8 sm:py-16",
        className
      )}
    >
      <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
            {overline}
          </span>
          <h1 className="font-serif-display text-3xl leading-tight text-ink sm:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      <motion.div
        className="pt-8"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

export function ViewLoading({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)} aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-20 w-full rounded-xl border border-border/60 bg-cream/60"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

export function ViewError({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-border bg-paper px-6 py-10 text-center"
    >
      <AlertCircle className="size-6 text-forest" aria-hidden="true" />
      <p className="font-serif text-lg text-forest">Something interrupted us.</p>
      <p className="text-sm text-muted-foreground">{error}</p>
      {onRetry ? (
        <Button
          onClick={onRetry}
          variant="outline"
          className="mt-2 gap-2 rounded-full border-forest text-forest hover:bg-cream"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export function ViewEmpty({
  icon: Icon = Compass,
  message,
  cta,
  onCta,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  message: React.ReactNode;
  cta?: string;
  onCta?: () => void;
}) {
  const setView = useVismayStore((s) => s.setView);
  const handle = onCta ?? (() => setView("home"));
  const label = cta ?? "Go home";
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-paper/60 px-6 py-14 text-center">
      <Icon
        className="size-7 text-sage"
        aria-hidden="true"
        strokeWidth={1.4}
      />
      <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
      <Button
        onClick={handle}
        variant="outline"
        className="mt-1 rounded-full border-forest text-forest hover:bg-cream"
      >
        {label}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small util — relative time
// ---------------------------------------------------------------------------

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk} wk ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr} yr ago`;
}

// ---------------------------------------------------------------------------
// Domain label helper — title case
// ---------------------------------------------------------------------------

export function domainLabel(d?: string): string {
  if (!d) return "General";
  return d
    .split(/[\s_\-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
