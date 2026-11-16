"use client";

import { motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { VismayAmbientScene } from "@/components/vismay/ambient/VismayAmbientScene";
import { SearchBar } from "@/components/vismay/primitives/SearchBar";
import { cn } from "@/lib/utils";

interface HomeHeroProps {
  onSearch: (query: string) => void;
}

const EXAMPLE_CHIPS = [
  {
    glyph: "\u2696",
    label: "What is the Uniform Civil Code?",
  },
  {
    glyph: "\u273A",
    label: "Why does time slow near a black hole?",
  },
];

/**
 * The hero of the Vismay homepage. Renders the ambient layered background,
 * an eyebrow, a two-line animated serif headline, a subtitle, the search
 * bar with example chips, and a "scroll to explore" hint at the bottom.
 */
export function HomeHero({ onSearch }: HomeHeroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="hero-title"
      className={cn(
        "relative isolate flex min-h-[640px] flex-col items-center overflow-hidden px-6 pb-32 pt-32 sm:pt-40 lg:min-h-[760px] lg:pt-44"
      )}
    >
      {/* Layered background */}
      <VismayAmbientScene intensity="full" />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mb-6 text-[10px] font-bold uppercase tracking-[3.5px] text-sage"
        >
          A more thoughtful way to learn
        </motion.p>

        <h1
          id="hero-title"
          className="font-serif-display text-[clamp(40px,7vw,88px)] leading-[1.04] tracking-[-0.025em] text-forest"
        >
          <Line delay={0.16}>
            <span>Explore. Understand.</span>
          </Line>
          <Line delay={0.34}>
            <span>
              Stay <em className="not-italic text-forest/85 italic">curious.</em>
            </span>
          </Line>
        </h1>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65 }}
          className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground"
        >
          Follow a question. Find the extraordinary. At your own pace.
        </motion.p>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.85 }}
          className="mt-9 w-full"
        >
          <SearchBar
            onSubmit={onSearch}
            placeholder="What would you like to understand today?"
            autoFocus
          />
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 1.05 }}
          className="mt-5 flex flex-wrap items-center justify-center gap-2"
        >
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => onSearch(chip.label)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-border bg-paper/70 px-4 py-2 text-xs text-forest/80",
                "transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:bg-paper",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              )}
            >
              <span aria-hidden="true" className="text-sm text-gold">
                {chip.glyph}
              </span>
              {chip.label}
            </button>
          ))}
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.button
        type="button"
        onClick={() => {
          window.scrollTo({ top: window.innerHeight * 0.85, behavior: "smooth" });
        }}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.4 }}
        aria-label="Scroll to explore"
        className={cn(
          "absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[2px] text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-md px-2 py-1"
        )}
      >
        <span>Scroll to explore</span>
        <motion.span
          aria-hidden="true"
          animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="block text-base text-sage"
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </motion.button>
    </section>
  );
}

interface LineProps {
  delay: number;
  children: React.ReactNode;
}

function Line({ delay, children }: LineProps) {
  const reduceMotion = useReducedMotion();
  return (
    <span className="block overflow-hidden pb-1">
      <motion.span
        initial={reduceMotion ? false : { y: "110%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1.05, ease: [0.18, 0.78, 0.23, 1], delay }}
        className="inline-block"
      >
        {children}
      </motion.span>
    </span>
  );
}

export default HomeHero;
