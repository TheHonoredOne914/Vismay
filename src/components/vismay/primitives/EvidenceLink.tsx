"use client";

import { forwardRef } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SourceTier } from "@/lib/types";

export interface EvidenceLinkProps {
  /** External URL — when set (and looks external), renders as an anchor. */
  href?: string;
  /** Citation title. */
  title: string;
  /** Source tier — controls the dot color. Defaults to "commentary". */
  tier?: SourceTier;
  /** Optional locator string (e.g. "Art. 44" or "p. 12"). */
  locator?: string;
  /** When provided, renders as a button (overriding href). */
  onClick?: () => void;
  className?: string;
}

/**
 * EvidenceLink
 *
 * An inline citation/source link used inside reading bodies and source
 * lists. Renders a small tier-colored dot, the title in forest text, an
 * optional locator, and an external-link glyph when the link points out.
 *
 * Render mode is selected automatically:
 *   - `onClick` provided → <button>
 *   - `href` provided (and looks external) → <a target="_blank" rel="noreferrer">
 *   - otherwise → <span> (non-interactive label)
 */
const tierDotColor: Record<SourceTier, string> = {
  primary: "bg-gold",
  secondary: "bg-sage",
  commentary: "bg-muted-foreground/60",
  uncertain: "bg-gold/50",
  conflicting: "bg-destructive/60",
  unchecked: "bg-muted-foreground/30",
};

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith("//");
}

export const EvidenceLink = forwardRef<
  HTMLElement,
  EvidenceLinkProps
>(function EvidenceLink(
  { href, title, tier = "commentary", locator, onClick, className },
  ref,
) {
  const dotCls = cn(
    "shrink-0 inline-block w-2 h-2 rounded-full",
    tierDotColor[tier],
  );

  const inner = (
    <>
      <span aria-hidden="true" className={dotCls} />
      <span className="text-sm text-forest leading-snug truncate">
        {title}
      </span>
      {locator && (
        <span className="text-xs text-muted-foreground leading-snug">
          · {locator}
        </span>
      )}
      {href && isExternalUrl(href) && (
        <ExternalLink
          aria-hidden="true"
          size={11}
          strokeWidth={1.75}
          className="shrink-0 text-muted-foreground"
        />
      )}
    </>
  );

  const baseCls = cn(
    "inline-flex items-center gap-1.5 max-w-full",
    "rounded-md align-middle",
    "transition-colors duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    className,
  );

  if (onClick) {
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={onClick}
        className={cn(baseCls, "hover:bg-cream/60 cursor-pointer px-0.5")}
      >
        {inner}
      </button>
    );
  }

  if (href) {
    if (isExternalUrl(href)) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(baseCls, "hover:bg-cream/60 px-0.5")}
        >
          {inner}
        </a>
      );
    }
    // Internal path — render as a regular anchor.
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={cn(baseCls, "hover:bg-cream/60 px-0.5")}
      >
        {inner}
      </a>
    );
  }

  return (
    <span ref={ref as React.Ref<HTMLElement>} className={baseCls}>
      {inner}
    </span>
  );
});

export default EvidenceLink;
