"use client";

/**
 * Vismay / My Learning
 * A list of every topic the user has saved or is still exploring.
 */

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Bookmark, Compass, Search, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useVismayStore } from "@/lib/store/useVismayStore";
import type { TopicData } from "@/lib/types";
import {
  ViewShell,
  ViewLoading,
  ViewError,
  ViewEmpty,
  relativeTime,
  domainLabel,
} from "./_shared";

export function MyLearningView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const openTopic = useVismayStore((s) => s.openTopic);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch("/api/topic", { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = (await res.json()) as { topics: TopicData[] };
        if (!cancelled) setTopics(json.topics ?? []);
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message ?? e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(load, [load]);

  // Derive filter chips from the actual domains present + "All" + "Saved".
  const chips = useMemo(() => {
    const domains = Array.from(new Set(topics.map((t) => t.domain))).sort();
    return ["all", "saved", ...domains] as string[];
  }, [topics]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return topics
      .filter((t) => {
        if (filter === "saved") return t.savedForLater;
        if (filter !== "all" && t.domain !== filter) return false;
        return true;
      })
      .filter(
        (t) =>
          q === "" ||
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }, [topics, filter, query]);

  if (loading) {
    return (
      <ViewShell
        overline="01 / YOUR LEARNING"
        title="My Learning"
        subtitle="Every thread you've followed — saved or still in progress."
      >
        <FiltersBar
          query={query}
          onQuery={setQuery}
          chips={chips}
          filter={filter}
          onFilter={setFilter}
          disabled
        />
        <div className="mt-6">
          <ViewLoading rows={4} />
        </div>
      </ViewShell>
    );
  }

  if (error) {
    return (
      <ViewShell
        overline="01 / YOUR LEARNING"
        title="My Learning"
        subtitle="Every thread you've followed — saved or still in progress."
      >
        <ViewError error={error} onRetry={load} />
      </ViewShell>
    );
  }

  if (topics.length === 0) {
    return (
      <ViewShell
        overline="01 / YOUR LEARNING"
        title="My Learning"
        subtitle="Every thread you've followed — saved or still in progress."
      >
        <ViewEmpty
          icon={Compass}
          message="No topics yet. Start one from the home page — ask the first question that comes to mind."
          cta="Start a topic"
          onCta={() => useVismayStore.getState().setView("home")}
        />
      </ViewShell>
    );
  }

  return (
    <ViewShell
      overline="01 / YOUR LEARNING"
      title="My Learning"
      subtitle="Every thread you've followed — saved or still in progress."
    >
      <FiltersBar
        query={query}
        onQuery={setQuery}
        chips={chips}
        filter={filter}
        onFilter={setFilter}
      />

      {filtered.length === 0 ? (
        <div className="mt-10">
          <ViewEmpty
            icon={Search}
            message="Nothing matches that search yet. Try a different word, or clear the filter."
            cta="Clear filter"
            onCta={() => {
              setQuery("");
              setFilter("all");
            }}
          />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {filtered.map((t, i) => (
            <TopicCard key={t.id} topic={t} index={i} onOpen={openTopic} />
          ))}
        </ul>
      )}
    </ViewShell>
  );
}

// ---------------------------------------------------------------------------
// Filters bar
// ---------------------------------------------------------------------------

function FiltersBar({
  query,
  onQuery,
  chips,
  filter,
  onFilter,
  disabled,
}: {
  query: string;
  onQuery: (q: string) => void;
  chips: string[];
  filter: string;
  onFilter: (c: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search your topics"
          aria-label="Search your topics"
          disabled={disabled}
          className="rounded-full border-border bg-paper pl-9 pr-3 focus-visible:ring-2 focus-visible:ring-gold"
        />
      </div>
      <div
        role="tablist"
        aria-label="Filter topics"
        className="flex flex-wrap items-center gap-1.5"
      >
        {chips.map((c) => {
          const active = c === filter;
          const label =
            c === "all"
              ? "All"
              : c === "saved"
              ? "Saved"
              : domainLabel(c);
          return (
            <button
              key={c}
              role="tab"
              aria-selected={active}
              onClick={() => onFilter(c)}
              disabled={disabled}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                active
                  ? "border-forest bg-forest text-primary-foreground"
                  : "border-border bg-paper text-muted-foreground hover:border-forest/40 hover:text-forest"
              )}
            >
              {c === "saved" ? (
                <span className="inline-flex items-center gap-1">
                  <Bookmark className="size-3" aria-hidden="true" />
                  {label}
                </span>
              ) : (
                label
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Topic card
// ---------------------------------------------------------------------------

function TopicCard({
  topic,
  index,
  onOpen,
}: {
  topic: TopicData;
  index: number;
  onOpen: (slug: string) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.05, 0.4),
        ease: [0.22, 0.61, 0.36, 1],
      }}
    >
      <button
        type="button"
        onClick={() => onOpen(topic.slug)}
        className="group flex w-full items-stretch gap-0 rounded-2xl border border-border bg-paper text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-forest/40 hover:shadow-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        aria-label={`Continue topic: ${topic.title}`}
      >
        {/* Left accent stripe */}
        <span
          aria-hidden="true"
          className="w-1.5 shrink-0 rounded-l-2xl bg-gradient-to-b from-forest/80 to-sage/50"
        />
        <div className="flex flex-1 flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-full bg-cream text-xs font-medium text-forest"
              >
                {domainLabel(topic.domain)}
              </Badge>
              {topic.savedForLater ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-gold/40 text-xs text-gold"
                >
                  <Bookmark className="size-3" aria-hidden="true" />
                  Saved
                </Badge>
              ) : null}
              <span className="text-[11px] text-muted-foreground">
                Updated {relativeTime(topic.updatedAt)}
              </span>
            </div>
            <h3 className="font-serif-display text-xl text-ink sm:text-2xl">
              {topic.title}
            </h3>
            <p className="line-clamp-2 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
              {topic.description}
            </p>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>
                {topic.sections.length} section
                {topic.sections.length === 1 ? "" : "s"}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {topic.userProvidedStructure
                  ? "Your own structure"
                  : "Vismay outline"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center sm:pl-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-xs font-medium text-primary-foreground transition-transform group-hover:translate-x-0.5">
              Continue
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </button>
    </motion.li>
  );
}

export default MyLearningView;
