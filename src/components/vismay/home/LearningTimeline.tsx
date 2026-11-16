"use client";

import { useMemo } from "react";
import { motion, useReducedMotion, useInView } from "motion/react";
import { useRef } from "react";
import type { LearningEvent, TopicData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LearningTimelineProps {
  events: LearningEvent[];
  topics: TopicData[];
  onSelect: (slug: string) => void;
}

const MAX_NODES = 6;

const TYPE_COLOR: Record<string, string> = {
  topic_started: "from-forest to-forest/60",
  topic_resumed: "from-forest to-forest/60",
  section_opened: "from-sage to-forest",
  subtopic_explored: "from-sage to-forest/80",
  source_viewed: "from-gold/80 to-gold/40",
  explanation_requested: "from-gold/80 to-gold/40",
  visual_viewed: "from-sage/80 to-sage/40",
  challenge_attempted: "from-forest/80 to-sage/60",
  note_saved: "from-gold/80 to-sage/40",
  discovery_followed: "from-sage to-gold/60",
};

/**
 * Horizontal learning timeline of the user's most recent events.
 * Renders up to 6 nodes connected by an animated line.
 */
export function LearningTimeline({ events, topics, onSelect }: LearningTimelineProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  const nodes = useMemo(() => {
    return events.slice(0, MAX_NODES).map((e) => {
      const topic = topics.find((t) => t.id === e.topicId);
      return { event: e, topic };
    });
  }, [events, topics]);

  if (nodes.length === 0) {
    return (
      <section aria-labelledby="journey-eyebrow" className="py-12 text-center">
        <p
          id="journey-eyebrow"
          className="text-[10px] font-bold uppercase tracking-[2px] text-sage"
        >
          Your journey
        </p>
        <p className="mt-3 font-serif text-2xl text-forest/80">
          No journeys yet. Start one above.
        </p>
      </section>
    );
  }

  return (
    <section ref={ref} aria-labelledby="journey-eyebrow" className="relative pt-2">
      <p
        id="journey-eyebrow"
        className="text-[10px] font-bold uppercase tracking-[2px] text-sage"
      >
        What you&rsquo;ve discovered
      </p>
      <h2 className="mt-2 font-serif text-3xl tracking-tight text-forest sm:text-4xl">
        Your learning, in order.
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        An honest record of how one idea led to another.
      </p>

      <div className="relative mt-12">
        {/* Connector line */}
        <span
          aria-hidden="true"
          className="absolute left-[8%] right-[8%] top-[58px] h-px bg-border"
        />
        <motion.span
          aria-hidden="true"
          className="absolute left-[8%] top-[58px] h-0.5 bg-sage/70"
          initial={reduceMotion ? false : { width: "0%" }}
          animate={inView ? { width: "84%" } : { width: "0%" }}
          transition={{ duration: 1.6, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
        />

        <ol className="relative z-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {nodes.map(({ event, topic }, i) => (
            <TimelineNode
              key={event.id}
              event={event}
              topic={topic}
              index={i}
              reduceMotion={reduceMotion}
              inView={inView}
              onSelect={onSelect}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}

interface TimelineNodeProps {
  event: LearningEvent;
  topic?: TopicData;
  index: number;
  reduceMotion: boolean | null;
  inView: boolean;
  onSelect: (slug: string) => void;
}

function TimelineNode({
  event,
  topic,
  index,
  reduceMotion,
  inView,
  onSelect,
}: TimelineNodeProps) {
  const gradient = TYPE_COLOR[event.type] ?? "from-sage to-forest";
  const slug = topic?.slug;
  const label = event.topicTitle ?? topic?.title ?? event.label;
  const subtitle = relativeTime(event.occurredAt);

  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{
        duration: 0.55,
        delay: 0.15 + index * 0.1,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      className="relative"
    >
      <span
        aria-hidden="true"
        className="absolute -top-2 left-1/2 z-10 size-2.5 -translate-x-1/2 rounded-full border-2 border-forest bg-cream"
      />
      <button
        type="button"
        disabled={!slug}
        onClick={() => slug && onSelect(slug)}
        className={cn(
          "block w-full rounded-2xl border border-border bg-paper p-4 text-left shadow-soft",
          "transition-all duration-400 hover:-translate-y-2 hover:shadow-warm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
          !slug && "cursor-default opacity-90"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "block h-16 w-full rounded-lg bg-gradient-to-br",
            gradient
          )}
        />
        <span className="mt-3 block font-serif text-base leading-tight text-forest line-clamp-2">
          {label}
        </span>
        <span className="mt-1 block text-[11px] text-muted-foreground">{subtitle}</span>
      </button>
    </motion.li>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "earlier";
  const diff = Date.now() - then;
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) {
    const hours = Math.floor(diff / 3_600_000);
    if (hours <= 0) {
      const mins = Math.floor(diff / 60_000);
      if (mins <= 0) return "just now";
      return `${mins} min ago`;
    }
    return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  }
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

export default LearningTimeline;
