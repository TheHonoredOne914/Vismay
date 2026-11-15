"use client";

import { cn } from "@/lib/utils";

interface TopicBreadcrumbProps {
  domain: string;
  context?: string;
  className?: string;
}

const DOMAIN_TITLES: Record<string, string> = {
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
 * Tiny breadcrumb at the top of the topic reading column.
 * Renders the domain (uppercase) and an optional region/context.
 */
export function TopicBreadcrumb({ domain, context, className }: TopicBreadcrumbProps) {
  const domainLabel = DOMAIN_TITLES[domain] ?? domain;
  return (
    <nav aria-label="Topic context" className={cn("text-xs text-muted-foreground tracking-wide", className)}>
      <span className="uppercase">{domainLabel}</span>
      {context && (
        <>
          <span aria-hidden="true" className="mx-2 text-sage/60">
            &middot;
          </span>
          <span className="uppercase">{context}</span>
        </>
      )}
    </nav>
  );
}

export default TopicBreadcrumb;
