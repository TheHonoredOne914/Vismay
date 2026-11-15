"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EvidenceLink } from "@/components/vismay/primitives/EvidenceLink";
import { useVismayStore } from "@/lib/store/useVismayStore";
import type {
  SourceDocumentData,
  SourcePassageData,
  TopicData,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface TopicSourcesProps {
  topic: TopicData;
  onSourceClick?: (sourceId: string) => void;
  className?: string;
}

interface SourcesResponse {
  sources: SourceDocumentData[];
  passages?: SourcePassageData[];
  coverageNote?: string;
  configured?: boolean;
}

/**
 * Right sidebar with relevant sources for the current topic.
 *
 * On first render: shows a "Find sources" button. Once clicked, calls
 * POST /api/sources with `{ query: topic.title, topicSlug, scope: "light" }`
 * and lists each source as a row (EvidenceLink + snippet + tier badge).
 *
 * Below sources: a "YOUR LAST DISCOVERY" section listing the previous
 * topic's title from `lastVisited` (if it's a different topic).
 */
export function TopicSources({ topic, onSourceClick, className }: TopicSourcesProps) {
  const lastVisited = useVismayStore((s) => s.lastVisited);
  const [sources, setSources] = useState<SourceDocumentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: topic.title,
          topicSlug: topic.slug,
          scope: "light",
        }),
      });
      const data = (await res.json()) as SourcesResponse;
      if (!res.ok) {
        throw new Error(data.coverageNote ?? "Could not fetch sources.");
      }
      setSources(data.sources ?? []);
      setFetched(true);
    } catch {
      setError("Could not fetch sources. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [topic.title, topic.slug]);

  // If sources were already persisted for this topic (GET), hydrate them
  // so the user does not need to click "Find sources" again on resume.
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        const res = await fetch(`/api/sources/${topic.slug}`);
        if (!res.ok) return;
        const data = (await res.json()) as SourcesResponse;
        if (cancelled) return;
        if (data.sources && data.sources.length > 0) {
          setSources(data.sources);
          setFetched(true);
        }
      } catch {
        // Silent — user can still click "Find sources".
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [topic.slug]);

  const lastDiscovery =
    lastVisited && lastVisited.topic.id !== topic.id ? lastVisited.topic : null;

  return (
    <aside
      className={cn(
        "border-l border-border bg-paper/40 px-6 py-8",
        className
      )}
    >
      <div className="sticky top-[88px] space-y-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-sage">
            Relevant material
          </p>
          {sources.length === 0 && !loading && !fetched && (
            <Button
              type="button"
              size="sm"
              onClick={fetchSources}
              disabled={loading}
              className="mt-3 bg-forest text-paper hover:bg-forest/90"
            >
              <Sparkles className="size-3.5" />
              Find sources
            </Button>
          )}
          {loading && (
            <ul className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-3/4 bg-cream/70" />
                  <Skeleton className="h-2.5 w-1/2 bg-cream/60" />
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p className="mt-3 text-xs text-forest/70">{error}</p>
          )}
          {sources.length > 0 && (
            <ul className="mt-4 divide-y divide-border/70">
              {sources.map((src) => (
                <li key={src.id} className="py-3">
                  <div className="flex items-start gap-2">
                    <FileText
                      className="mt-1 size-3.5 shrink-0 text-sage"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <EvidenceLink
                        href={src.url ?? undefined}
                        title={src.title}
                        tier={src.tier}
                        locator={src.publishedDate ?? undefined}
                        onClick={() => onSourceClick?.(src.id)}
                      />
                      {src.snippet && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                          {src.snippet}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lastDiscovery && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-sage">
              Your last discovery
            </p>
            <button
              type="button"
              onClick={() => {
                // Routing handled by parent context; we just notify.
                onSourceClick?.(`discovery:${lastDiscovery.slug}`);
              }}
              className={cn(
                "mt-3 flex w-full items-center gap-2 rounded-lg border border-border bg-cream/40 px-3 py-2 text-left text-sm text-forest",
                "transition-colors hover:bg-cream/70",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              )}
            >
              <span aria-hidden="true" className="text-gold">
                &#10022;
              </span>
              <span className="min-w-0 flex-1 truncate">
                {lastDiscovery.title}
              </span>
              <span aria-hidden="true" className="text-muted-foreground">
                &#8599;
              </span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default TopicSources;
