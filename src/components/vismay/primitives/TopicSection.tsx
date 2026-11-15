"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TopicSectionData, Subtopic } from "@/lib/types";

export interface TopicSectionProps {
  /** The section payload (title, summary, body, subtopics, hint). */
  section: TopicSectionData;
  /** Render the panel open initially. */
  defaultOpen?: boolean;
  /** Fired when a subtopic row is clicked. */
  onSubtopicClick?: (subtopic: Subtopic) => void;
  /** Fired when the panel expands (for analytics / scroll-sync). */
  onExpand?: (sectionId: string) => void;
  /** 1-based index — used for the numbered badge. */
  index: number;
  className?: string;
}

/**
 * TopicSection
 *
 * An expandable accordion panel for the topic reading page. Header shows a
 * numbered circular badge, the serif section title, and a chevron that
 * rotates 180° when expanded. Collapsed state shows the short summary;
 * expanding reveals the long-form body and a list of clickable subtopic
 * rows (title left, ↗ arrow right, hover bg-cream).
 */
export function TopicSection({
  section,
  defaultOpen = false,
  onSubtopicClick,
  onExpand,
  index,
  className,
}: TopicSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reduceMotion = useReducedMotion();

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next && onExpand) onExpand(section.id);
      return next;
    });
  }, [onExpand, section.id]);

  const panelId = `vismay-section-${section.id}`;
  const headerId = `${panelId}-header`;

  return (
    <section
      className={cn(
        "bg-paper border border-border rounded-lg",
        "shadow-soft",
        "overflow-hidden",
        "transition-shadow duration-300",
        open && "shadow-warm",
        className,
      )}
      data-state={open ? "open" : "closed"}
    >
      <h3 className="m-0">
        <button
          id={headerId}
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={panelId}
          className={cn(
            "group flex w-full items-center justify-between gap-4",
            "px-6 py-5 text-left",
            "transition-colors duration-200",
            "hover:bg-cream/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset",
          )}
        >
          <span className="flex items-center gap-3 min-w-0">
            <span
              aria-hidden="true"
              className={cn(
                "shrink-0 grid place-items-center",
                "w-7 h-7 rounded-full",
                "bg-cream text-forest",
                "font-sans font-semibold text-sm",
              )}
            >
              {index}
            </span>
            <span className="font-serif text-2xl text-forest truncate">
              {section.title}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "shrink-0 text-sage transition-transform duration-300 ease-out",
              open && "rotate-180",
            )}
            size={20}
            strokeWidth={1.75}
          />
        </button>
      </h3>

      {/* Short summary is always visible — it's the "teaser" line. */}
      {!open && (
        <p
          className={cn(
            "px-6 pb-5 -mt-1 pl-[60px]",
            "text-sm text-muted-foreground leading-relaxed",
            "max-w-[670px]",
          )}
        >
          {section.shortSummary}
        </p>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={headerId}
            key="content"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pl-[60px]">
              {section.body && (
                <p className="text-sm text-foreground/90 leading-relaxed max-w-[670px] mb-4">
                  {section.body}
                </p>
              )}

              {section.subtopics && section.subtopics.length > 0 && (
                <ul className="m-0 p-0 list-none border-t border-border">
                  {section.subtopics.map((sub) => (
                    <li key={sub.id} className="m-0 p-0">
                      <button
                        type="button"
                        onClick={() => onSubtopicClick?.(sub)}
                        className={cn(
                          "group/sub flex w-full items-center justify-between gap-3",
                          "py-3 text-left",
                          "transition-colors duration-200",
                          "hover:bg-cream/60",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset",
                          "px-2 -mx-2 rounded-sm",
                        )}
                      >
                        <span className="flex flex-col min-w-0">
                          <span className="text-sm text-forest truncate">
                            {sub.title}
                          </span>
                          {sub.summary && (
                            <span className="text-xs text-muted-foreground mt-0.5 truncate">
                              {sub.summary}
                            </span>
                          )}
                        </span>
                        <ArrowUpRight
                          aria-hidden="true"
                          className={cn(
                            "shrink-0 text-sage",
                            "transition-transform duration-200",
                            "group-hover/sub:translate-x-0.5 group-hover/sub:-translate-y-0.5",
                            "group-hover/sub:text-forest",
                          )}
                          size={16}
                          strokeWidth={1.75}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default TopicSection;
