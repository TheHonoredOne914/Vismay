"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface LogoProps {
  /** Visual size of the logo lockup. */
  size?: "sm" | "md" | "lg";
  /** Show the Devanagari secondary identity (विस्मय). */
  showDevanagari?: boolean;
  /** When provided, the logo becomes a button (clickable). */
  onClick?: () => void;
  className?: string;
  /** Optional accessible label override. Defaults to "Vismay home". */
  ariaLabel?: string;
}

/**
 * Vismay logo lockup.
 *
 * Composition:
 *   - A small compass/wonder mark: a 4-pointed star (✦) in antique gold,
 *     enclosed in a soft rounded square with a thin gold border. The outer
 *     container is rotated 45° (becoming a diamond bezel); the inner glyph
 *     counter-rotates so the star remains visually upright.
 *   - The wordmark "VISMAY" in Fraunces (font-serif), wide letter-spacing.
 *   - The Devanagari "विस्मय" in Tiro Devanagari Sanskrit, muted + small,
 *     shown only when `showDevanagari` is true.
 *
 * The element renders as a button when `onClick` is supplied, otherwise as
 * a non-interactive span styled identically.
 */
const sizeMap: Record<
  NonNullable<LogoProps["size"]>,
  {
    bezel: string;
    star: string;
    wordmark: string;
    devanagari: string;
    gap: string;
  }
> = {
  sm: {
    bezel: "w-6 h-6 rounded-[6px]",
    star: "text-[13px]",
    wordmark: "text-base",
    devanagari: "text-[10px]",
    gap: "gap-2",
  },
  md: {
    bezel: "w-8 h-8 rounded-[8px]",
    star: "text-[18px]",
    wordmark: "text-xl",
    devanagari: "text-xs",
    gap: "gap-2.5",
  },
  lg: {
    bezel: "w-10 h-10 rounded-[10px]",
    star: "text-[22px]",
    wordmark: "text-2xl",
    devanagari: "text-sm",
    gap: "gap-3",
  },
};

export const Logo = forwardRef<HTMLElement, LogoProps>(function Logo(
  {
    size = "md",
    showDevanagari = true,
    onClick,
    className,
    ariaLabel = "Vismay home",
  },
  ref,
) {
  const s = sizeMap[size];

  const inner = (
    <>
      {/* Bezel — outer container rotated 45° so it becomes a diamond. */}
      <span
        aria-hidden="true"
        className={cn(
          "inline-grid place-items-center border border-gold/70 text-gold rotate-45",
          "transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          "group-hover/logo:rotate-[90deg]",
          s.bezel,
        )}
      >
        {/* Inner glyph counter-rotated so the star stays upright
            at rest; on hover it follows the bezel for a subtle turn. */}
        <span className={cn("leading-none -rotate-45", s.star)}>✦</span>
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn("font-serif text-forest", s.wordmark)}
          style={{ letterSpacing: "0.15em" }}
        >
          VISMAY
        </span>
        {showDevanagari && (
          <span
            className={cn(
              "font-deva text-muted-foreground/80 mt-1",
              s.devanagari,
            )}
          >
            विस्मय
          </span>
        )}
      </span>
    </>
  );

  const cls = cn(
    "group/logo inline-flex items-center",
    s.gap,
    "text-forest",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md",
    onClick && "cursor-pointer transition-opacity hover:opacity-90",
    className,
  );

  if (onClick) {
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={onClick}
        className={cls}
        aria-label={ariaLabel}
      >
        {inner}
      </button>
    );
  }

  return (
    <span
      ref={ref as React.Ref<HTMLElement>}
      className={cls}
      aria-label={ariaLabel}
    >
      {inner}
    </span>
  );
});

export default Logo;
