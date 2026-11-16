"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface VisualExplanationProps {
  /**
   * The visual kind — drives how `spec` is interpreted and rendered.
   *
   * - palette  : comma-separated hex values → row of swatches
   * - equation : raw spec → centered display equation in serif
   * - timeline : newline-separated `year|label` → horizontal timeline
   * - diagram  : rendered as a labelled code block (honest placeholder)
   * - graph    : same as diagram
   * - process  : same as diagram
   *
   * We do NOT pull in a runtime mermaid renderer — instead diagram/graph/
   * process are shown as code-style blocks with a "diagram" caption so
   * the user is not misled about what's actually being rendered.
   */
  kind: "diagram" | "graph" | "timeline" | "equation" | "palette" | "process";
  /** The serialised content for the visual. */
  spec: string;
  /** Optional caption rendered below the visual. */
  caption?: string;
  className?: string;
}

/**
 * VisualExplanation
 *
 * Renders a small visual aid inline with reading content. Light, honest
 * rendering — no run-time diagram engine is loaded. Container styling:
 * `bg-cream/40 rounded-xl p-4 my-4 border border-border`.
 */
export function VisualExplanation({
  kind,
  spec,
  caption,
  className,
}: VisualExplanationProps) {
  const containerCls = cn(
    "bg-cream/40 rounded-xl border border-border p-4 my-4",
    "text-ink",
    className,
  );

  const body = useMemo(() => {
    switch (kind) {
      case "palette":
        return <PaletteVisual spec={spec} />;
      case "equation":
        return <EquationVisual spec={spec} />;
      case "timeline":
        return <TimelineVisual spec={spec} />;
      case "diagram":
      case "graph":
      case "process":
        return <CodeVisual kind={kind} spec={spec} />;
      default:
        return null;
    }
  }, [kind, spec]);

  return (
    <figure className={containerCls}>
      <div className="flex flex-col">{body}</div>
      {caption && (
        <figcaption className="mt-3 text-xs text-muted-foreground leading-relaxed">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/* ------------------------------------------------------------------ */

function PaletteVisual({ spec }: { spec: string }) {
  const swatches = spec
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (swatches.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {swatches.map((hex, i) => {
        const safe = /^#?[0-9a-fA-F]{3,8}$/.test(hex) ? hex : "#cccccc";
        const display = safe.startsWith("#") ? safe : `#${safe}`;
        return (
          <div
            key={`${hex}-${i}`}
            className="flex flex-col items-center gap-1"
          >
          <span
            aria-label={`Color ${display}`}
            className="block w-14 h-14 rounded-md border border-border shadow-soft"
            style={{ backgroundColor: display }}
          />
            <code className="text-[10px] text-muted-foreground uppercase">
              {display}
            </code>
          </div>
        );
      })}
    </div>
  );
}

function EquationVisual({ spec }: { spec: string }) {
  return (
    <div className="py-2 text-center">
      <span className="font-serif text-xl text-forest tracking-wide">
        {spec}
      </span>
    </div>
  );
}

function TimelineVisual({ spec }: { spec: string }) {
  const points = spec
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [year, ...rest] = line.split("|");
      return {
        year: (year ?? "").trim(),
        label: rest.join("|").trim(),
      };
    })
    .filter((p) => p.year || p.label);

  if (points.length === 0) return null;

  return (
    <div className="relative py-2">
      {/* horizontal line */}
      <div className="absolute left-0 right-0 top-1/2 h-px bg-sage/40 -translate-y-1/2" />
      <ol className="relative flex justify-between gap-2">
        {points.map((p, i) => (
          <li
            key={i}
            className="flex flex-1 flex-col items-center text-center gap-1.5 min-w-0"
          >
            <span className="text-xs text-forest font-semibold whitespace-nowrap">
              {p.year}
            </span>
            <span
              aria-hidden="true"
              className="block w-2.5 h-2.5 rounded-full bg-forest border-2 border-paper"
            />
            <span className="text-[11px] text-muted-foreground leading-snug">
              {p.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CodeVisual({
  kind,
  spec,
}: {
  kind: "diagram" | "graph" | "process";
  spec: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block w-1.5 h-1.5 rounded-full bg-gold"
        />
        <span className="text-[10px] uppercase tracking-[0.18em] text-sage font-semibold">
          {kind}
        </span>
      </div>
      <pre
        className={cn(
          "m-0 overflow-x-auto vismay-scroll",
          "bg-paper/80 border border-border rounded-lg p-3",
          "text-xs leading-relaxed text-ink whitespace-pre-wrap",
        )}
      >
        <code>{spec}</code>
      </pre>
      <p className="text-[11px] text-muted-foreground">
        Diagram rendered as source — visual rendering pending.
      </p>
    </div>
  );
}

export default VisualExplanation;
