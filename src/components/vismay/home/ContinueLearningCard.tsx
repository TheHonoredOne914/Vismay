"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import type { LearningEvent, TopicData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ContinueLearningCardProps {
  lastVisited: { topic: TopicData; lastEvent?: LearningEvent } | null;
  onContinue: (slug: string) => void;
}

const DOMAIN_LABELS: Record<string, string> = {
  law: "Law & Constitution",
  physics: "Physics",
  chemistry: "Chemistry",
  mathematics: "Mathematics",
  biology: "Biology",
  history: "History",
  philosophy: "Philosophy",
  design: "Design",
  filmmaking: "Filmmaking",
  general: "General",
};

/**
 * Wide card inviting the user back to the topic they last explored.
 * Falls back to a quiet empty state on first visit.
 */
export function ContinueLearningCard({ lastVisited, onContinue }: ContinueLearningCardProps) {
  const reduceMotion = useReducedMotion();

  if (!lastVisited) {
    return (
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7 }}
        aria-labelledby="continue-eyebrow"
        className="rounded-2xl border border-dashed border-border bg-paper/40 px-8 py-12 text-center"
      >
        <p
          id="continue-eyebrow"
          className="text-[10px] font-bold uppercase tracking-[2px] text-sage"
        >
          Continue learning
        </p>
        <p className="mt-3 font-serif text-2xl text-forest/80">
          Your curiosity will leave its first trail here.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Search a question above to begin.
        </p>
      </motion.section>
    );
  }

  const { topic, lastEvent } = lastVisited;
  const eyebrowDomain = DOMAIN_LABELS[topic.domain] ?? "General";

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7 }}
      aria-labelledby="continue-eyebrow"
      className={cn(
        "group relative grid overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-paper to-cream/50 shadow-warm",
        "transition-transform duration-500 hover:-translate-y-1.5 hover:shadow-warm-lg",
        "grid-cols-1 md:grid-cols-[1fr_360px]"
      )}
    >
      <div className="px-6 py-8 sm:px-10 sm:py-10">
        <p
          id="continue-eyebrow"
          className="text-[10px] font-bold uppercase tracking-[2px] text-sage"
        >
          Continue learning &middot; {eyebrowDomain}
        </p>
        <h3 className="mt-3 font-serif text-3xl tracking-tight text-forest sm:text-4xl">
          {topic.title}
        </h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Last explored: {lastEvent?.label ?? "Opened the topic overview."}
        </p>
        <button
          type="button"
          onClick={() => onContinue(topic.slug)}
          className={cn(
            "mt-7 inline-flex items-center gap-3 rounded-full bg-forest px-5 py-2.5 text-xs font-semibold text-paper",
            "transition-transform duration-300 hover:translate-x-1 hover:bg-forest/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          )}
        >
          Continue learning
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Decorative compass / scales motif */}
      <div
        aria-hidden="true"
        className="relative hidden items-center justify-center bg-[radial-gradient(ellipse_at_80%_36%,#f9f4dc,#ebefe4_60%,transparent)] md:flex"
      >
        <CompassArt />
      </div>
    </motion.section>
  );
}

function CompassArt() {
  return (
    <svg
      viewBox="0 0 380 250"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full drop-shadow-[0_9px_11px_rgba(137,120,88,0.14)]"
      role="presentation"
    >
      <defs>
        <linearGradient id="vismay-compass-gold" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ba9e61" />
          <stop offset=".48" stopColor="#e2c992" />
          <stop offset="1" stopColor="#765a34" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#c8c4ac" strokeWidth="1" opacity=".5">
        <circle cx="202" cy="120" r="105" />
        <circle cx="202" cy="120" r="80" />
      </g>
      <path
        d="M175 192 L229 192 L221 200 L183 200 Z M186 181 L218 181 L226 189 L178 189 Z M199 60 L206 60 L206 179 L199 179 Z"
        fill="url(#vismay-compass-gold)"
      />
      <path
        d="M130 82 H275 M203 48 V67"
        stroke="url(#vismay-compass-gold)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M145 82 L129 149 L162 149 Z M258 82 L243 149 L276 149 Z"
        stroke="#977841"
        strokeWidth="1.8"
        fill="none"
      />
      <path
        d="M111 147 Q145 175 178 147 M226 147 Q260 175 293 147"
        fill="url(#vismay-compass-gold)"
        opacity=".82"
      />
      <path
        d="M119 145 L172 145 M232 145 L285 145"
        stroke="#997b43"
        strokeWidth="2"
      />
      <circle cx="203" cy="50" r="9" fill="url(#vismay-compass-gold)" />
    </svg>
  );
}

export default ContinueLearningCard;
