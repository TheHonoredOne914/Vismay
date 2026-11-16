"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface ExtraPanelsProps {
  className?: string;
}

interface Panel {
  num: string;
  title: string;
  body: string;
}

const PANELS: Panel[] = [
  {
    num: "01",
    title: "Follow your own thread.",
    body: "Open a question, find the explanation, and go deeper only when you want.",
  },
  {
    num: "02",
    title: "Keep every discovery.",
    body: "Your notes, sources, and actual learning trail, quietly preserved.",
  },
];

/**
 * Two side-by-side editorial panels below the timeline. Large serif
 * numerals in sage, headline in Fraunces, body in muted ink.
 */
export function ExtraPanels({ className }: ExtraPanelsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="extra-eyebrow"
      className={cn("mt-12", className)}
    >
      <p
        id="extra-eyebrow"
        className="text-[10px] font-bold uppercase tracking-[2px] text-sage"
      >
        Room to wonder
      </p>
      <h2 className="mt-2 font-serif text-3xl tracking-tight text-forest sm:text-4xl">
        Another question is always welcome.
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        No syllabus. No noise. Just the next thing you&rsquo;re curious about.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {PANELS.map((panel, i) => (
          <motion.article
            key={panel.num}
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              duration: 0.7,
              delay: i * 0.12,
              ease: [0.2, 0.8, 0.2, 1],
            }}
            className={cn(
              "flex min-h-[160px] items-center gap-6 rounded-2xl border border-border bg-paper px-6 py-5 shadow-soft",
              "transition-all duration-400 hover:-translate-y-1 hover:shadow-warm"
            )}
          >
            <span
              aria-hidden="true"
              className="font-serif text-5xl text-sage/60 sm:text-6xl"
            >
              {panel.num}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-serif text-xl leading-tight text-forest sm:text-2xl">
                {panel.title}
              </h3>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
                {panel.body}
              </p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

export default ExtraPanels;
