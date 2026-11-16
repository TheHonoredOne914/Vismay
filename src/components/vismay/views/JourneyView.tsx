"use client";

/**
 * Vismay / Journey
 * A vertical timeline of every learning event, oldest at top, newest at bottom.
 *
 * The connector line "draws" itself when it enters view, and each event is
 * editable — a small × lets you remove a moment you didn't mean to keep.
 */

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  Compass,
  Eye,
  FileText,
  HelpCircle,
  Lightbulb,
  Milestone,
  NotebookPen,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useVismayStore } from "@/lib/store/useVismayStore";
import type { LearningEvent, LearningEventType } from "@/lib/types";
import {
  ViewShell,
  ViewLoading,
  ViewError,
  ViewEmpty,
  relativeTime,
} from "./_shared";

const EVENT_ICON: Partial<Record<LearningEventType, React.ComponentType<{ className?: string }>>> = {
  topic_started: Milestone,
  topic_resumed: TrendingUp,
  section_opened: Compass,
  subtopic_explored: Sparkles,
  source_viewed: FileText,
  explanation_requested: HelpCircle,
  visual_viewed: Eye,
  challenge_attempted: Lightbulb,
  note_saved: NotebookPen,
  discovery_followed: ArrowUpRight,
};

export function JourneyView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<LearningEvent[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const openTopic = useVismayStore((s) => s.openTopic);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch("/api/learning", { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = (await res.json()) as { events: LearningEvent[] };
        if (!cancelled) setEvents(json.events ?? []);
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message ?? e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(load, [load]);

  // Oldest at top, newest at bottom.
  const ordered = useMemo(() => {
    return [...events].sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );
  }, [events]);

  const removeEvent = React.useCallback(
    async (id: string) => {
      // Optimistic removal; rollback on error.
      const previous = events;
      setEvents((cur) => cur.filter((e) => e.id !== id));
      setRemovingId(id);
      try {
        const res = await fetch(`/api/learning/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      } catch (e: any) {
        setEvents(previous);
        setError(`Could not remove that moment: ${String(e?.message ?? e)}`);
      } finally {
        setRemovingId(null);
      }
    },
    [events]
  );

  if (loading) {
    return (
      <ViewShell
        overline="02 / JOURNEY"
        title="An honest record."
        subtitle="An honest record of how one idea led to another. Reorder or remove as you like — your curiosity is yours."
      >
        <ViewLoading rows={5} />
      </ViewShell>
    );
  }

  if (error && events.length === 0) {
    return (
      <ViewShell
        overline="02 / JOURNEY"
        title="An honest record."
        subtitle="An honest record of how one idea led to another. Reorder or remove as you like — your curiosity is yours."
      >
        <ViewError error={error} onRetry={load} />
      </ViewShell>
    );
  }

  if (ordered.length === 0) {
    return (
      <ViewShell
        overline="02 / JOURNEY"
        title="An honest record."
        subtitle="An honest record of how one idea led to another. Reorder or remove as you like — your curiosity is yours."
      >
        <ViewEmpty
          icon={Compass}
          message="No journeys yet. Start one from the home page — your trail begins with the first question."
          cta="Go home"
          onCta={() => useVismayStore.getState().setView("home")}
        />
      </ViewShell>
    );
  }

  return (
    <ViewShell
      overline="02 / JOURNEY"
      title="An honest record."
      subtitle="An honest record of how one idea led to another. Reorder or remove as you like — your curiosity is yours."
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          className="text-muted-foreground hover:text-forest"
          aria-label="Refresh journey"
        >
          Refresh
        </Button>
      }
    >
      <ol className="relative flex flex-col gap-0">
        {ordered.map((e, i) => (
          <TimelineRow
            key={e.id}
            event={e}
            isLast={i === ordered.length - 1}
            removing={removingId === e.id}
            onOpenTopic={openTopic}
            onRemove={() => removeEvent(e.id)}
          />
        ))}
      </ol>
    </ViewShell>
  );
}

// ---------------------------------------------------------------------------
// Timeline row — dot, label, relative time, optional topic link, remove ×
// ---------------------------------------------------------------------------

function TimelineRow({
  event,
  isLast,
  removing,
  onOpenTopic,
  onRemove,
}: {
  event: LearningEvent;
  isLast: boolean;
  removing: boolean;
  onOpenTopic: (slug: string) => void;
  onRemove: () => void;
}) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLLIElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px -15% 0px" });

  const Icon = EVENT_ICON[event.type] ?? Compass;
  const isDemo = event.detail === "DEMO seed";

  return (
    <motion.li
      ref={ref}
      className="relative pl-10 pr-1"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={
        removing
          ? { opacity: 0, x: -12, transition: { duration: 0.2 } }
          : { opacity: 1, y: 0 }
      }
      transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {/* Vertical connector — animated "drawing" effect as it enters view */}
      {!isLast ? (
        <motion.span
          aria-hidden="true"
          className="absolute left-[14px] top-5 bottom-0 w-px bg-border"
          initial={reduce ? false : { height: 0 }}
          animate={
            inView || reduce
              ? { height: "100%" }
              : { height: 0 }
          }
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ transformOrigin: "top" }}
        />
      ) : null}

      {/* Dot */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-2 top-3.5 z-10 grid size-5 place-items-center rounded-full border-2 bg-paper",
          isDemo ? "border-gold" : "border-forest"
        )}
      >
        <Icon
          className={cn(
            "size-2.5",
            isDemo ? "text-gold" : "text-forest"
          )}
        />
      </span>

      {/* Body */}
      <div className="group relative flex flex-col gap-1 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">
            {event.label}
          </span>
          {isDemo ? (
            <Badge
              variant="outline"
              className="rounded-full border-gold/50 text-[10px] uppercase tracking-wider text-gold"
            >
              Demo
            </Badge>
          ) : null}
          <span className="text-[11px] text-muted-foreground">
            {relativeTime(event.occurredAt)}
          </span>
        </div>

        {event.detail && !isDemo ? (
          <p className="text-xs text-muted-foreground">{event.detail}</p>
        ) : null}

        <div className="mt-1 flex items-center gap-3">
          {event.topicId && event.topicTitle ? (
            <button
              type="button"
              onClick={() => {
                // topicId may be a slug on some seeds — fall back to slug.
                onOpenTopic(event.topicId as string);
              }}
              className="inline-flex items-center gap-1 text-xs text-forest underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
            >
              {event.topicTitle}
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {/* Remove × — visible on hover / focus-within */}
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label="Remove this moment from your journey"
          className="absolute right-0 top-3 inline-grid size-6 place-items-center rounded-full border border-border bg-paper text-muted-foreground opacity-0 transition-all hover:border-forest/40 hover:text-forest focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </motion.li>
  );
}

export default JourneyView;
