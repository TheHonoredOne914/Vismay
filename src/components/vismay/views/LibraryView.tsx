"use client";

/**
 * Vismay / Library
 * A searchable, filterable list of every source Vismay has gathered —
 * primary, secondary, commentary, and the ones still uncertain or
 * unchecked. Honest about what is verified and what isn't.
 */

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ExternalLink, Library, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useVismayStore } from "@/lib/store/useVismayStore";
import type {
  SourceDocumentData,
  SourceTier,
  SourceKind,
} from "@/lib/types";
import { EvidenceLink } from "@/components/vismay/primitives/EvidenceLink";
import {
  ViewShell,
  ViewLoading,
  ViewError,
  ViewEmpty,
} from "./_shared";

// ---------------------------------------------------------------------------
// Tier presentation
// ---------------------------------------------------------------------------

const TIER_LABEL: Record<SourceTier, string> = {
  primary: "Primary",
  secondary: "Secondary",
  commentary: "Commentary",
  uncertain: "Uncertain",
  conflicting: "Conflicting",
  unchecked: "Unchecked",
};

const TIER_BADGE: Record<SourceTier, string> = {
  primary: "border-forest/40 bg-forest/10 text-forest",
  secondary: "border-sage/50 bg-sage/15 text-forest",
  commentary: "border-gold/40 bg-gold/15 text-gold",
  uncertain: "border-border bg-cream text-muted-foreground",
  conflicting: "border-destructive/30 bg-destructive/10 text-destructive",
  unchecked: "border-dashed border-border bg-paper text-muted-foreground",
};

const KIND_LABEL: Record<SourceKind, string> = {
  constitution: "Constitution",
  legislation: "Legislation",
  judgment: "Judgment",
  textbook: "Textbook",
  article: "Article",
  paper: "Paper",
  video: "Video",
  upload: "Upload",
  other: "Other",
};

const ALL_TIERS: SourceTier[] = [
  "primary",
  "secondary",
  "commentary",
  "uncertain",
  "conflicting",
  "unchecked",
];

const ALL_KINDS: SourceKind[] = [
  "constitution",
  "legislation",
  "judgment",
  "textbook",
  "article",
  "paper",
  "video",
  "upload",
  "other",
];

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function LibraryView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceDocumentData[]>([]);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<SourceTier | "all">("all");
  const [kind, setKind] = useState<SourceKind | "all">("all");

  const setView = useVismayStore((s) => s.setView);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch("/api/sources", { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = (await res.json()) as { sources: SourceDocumentData[] };
        if (!cancelled) setSources(json.sources ?? []);
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

  // Available tiers / kinds present in the data — drives the filter chips.
  const availableTiers = useMemo(
    () => ALL_TIERS.filter((t) => sources.some((s) => s.tier === t)),
    [sources]
  );
  const availableKinds = useMemo(
    () => ALL_KINDS.filter((k) => sources.some((s) => s.kind === k)),
    [sources]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sources
      .filter((s) => (tier === "all" ? true : s.tier === tier))
      .filter((s) => (kind === "all" ? true : s.kind === kind))
      .filter(
        (s) =>
          q === "" ||
          s.title.toLowerCase().includes(q) ||
          (s.source ?? "").toLowerCase().includes(q) ||
          (s.snippet ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => {
        // Primary first, then by title.
        const order: Record<SourceTier, number> = {
          primary: 0,
          secondary: 1,
          commentary: 2,
          unchecked: 3,
          uncertain: 4,
          conflicting: 5,
        };
        const diff = order[a.tier] - order[b.tier];
        if (diff !== 0) return diff;
        return a.title.localeCompare(b.title);
      });
  }, [sources, tier, kind, query]);

  if (loading) {
    return (
      <ViewShell
        overline="04 / LIBRARY"
        title="A library of what you've found."
        subtitle="Every source Vismay has gathered or you've saved, in one quiet shelf."
      >
        <ViewLoading rows={4} />
      </ViewShell>
    );
  }

  if (error) {
    return (
      <ViewShell
        overline="04 / LIBRARY"
        title="A library of what you've found."
        subtitle="Every source Vismay has gathered or you've saved, in one quiet shelf."
      >
        <ViewError error={error} onRetry={load} />
      </ViewShell>
    );
  }

  if (sources.length === 0) {
    return (
      <ViewShell
        overline="04 / LIBRARY"
        title="A library of what you've found."
        subtitle="Every source Vismay has gathered or you've saved, in one quiet shelf."
      >
        <ViewEmpty
          icon={Library}
          message="Sources you find or save will live here. Try searching for a topic first — Vismay will gather what it can."
          cta="Go home"
          onCta={() => setView("home")}
        />
      </ViewShell>
    );
  }

  return (
    <ViewShell
      overline="04 / LIBRARY"
      title="A library of what you've found."
      subtitle="Every source Vismay has gathered or you've saved, in one quiet shelf."
    >
      {/* Search + filters */}
      <div className="flex flex-col gap-4">
        <div className="relative w-full max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sources, titles, snippets"
            aria-label="Search sources"
            className="rounded-full border-border bg-paper pl-9 focus-visible:ring-2 focus-visible:ring-gold"
          />
        </div>

        {/* Tier filter row */}
        <FilterRow
          label="Tier"
          value={tier}
          onChange={(v) => setTier(v as SourceTier | "all")}
          options={[
            { value: "all", label: "All tiers" },
            ...availableTiers.map((t) => ({ value: t, label: TIER_LABEL[t] })),
          ]}
        />

        {/* Kind filter row */}
        <FilterRow
          label="Kind"
          value={kind}
          onChange={(v) => setKind(v as SourceKind | "all")}
          options={[
            { value: "all", label: "All kinds" },
            ...availableKinds.map((k) => ({ value: k, label: KIND_LABEL[k] })),
          ]}
        />
      </div>

      <Separator className="my-6 bg-border" />

      {filtered.length === 0 ? (
        <ViewEmpty
          icon={Search}
          message="Nothing matches that filter yet. Try a different combination, or clear the filters."
          cta="Clear filters"
          onCta={() => {
            setQuery("");
            setTier("all");
            setKind("all");
          }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((s, i) => (
            <SourceRow key={s.id} source={s} index={i} />
          ))}
        </ul>
      )}
    </ViewShell>
  );
}

// ---------------------------------------------------------------------------
// Filter row
// ---------------------------------------------------------------------------

function FilterRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <div role="tablist" aria-label={`Filter by ${label}`} className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                active
                  ? "border-forest bg-forest text-primary-foreground"
                  : "border-border bg-paper text-muted-foreground hover:border-forest/40 hover:text-forest"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Source row
// ---------------------------------------------------------------------------

function SourceRow({
  source,
  index,
}: {
  source: SourceDocumentData;
  index: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.32,
        delay: Math.min(index * 0.04, 0.32),
        ease: [0.22, 0.61, 0.36, 1],
      }}
      className="rounded-2xl border border-border bg-paper p-5 shadow-soft transition-colors hover:border-forest/30"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("rounded-full text-[10px]", TIER_BADGE[source.tier])}
              >
                {TIER_LABEL[source.tier]}
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full bg-cream text-[10px] text-forest"
              >
                {KIND_LABEL[source.kind]}
              </Badge>
              {source.verified ? (
                <span className="text-[10px] uppercase tracking-wider text-sage">
                  Verified
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Not yet checked
                </span>
              )}
            </div>
            <EvidenceLink
              href={source.url ?? "#"}
              title={source.title}
              tier={source.tier}
              locator={source.source ?? undefined}
            />
            {source.source ? (
              <p className="text-xs text-muted-foreground">{source.source}</p>
            ) : null}
          </div>
          {source.url ? (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="shrink-0 gap-1.5 rounded-full border-forest text-forest hover:bg-cream"
            >
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open "${source.title}" in a new tab`}
              >
                Open
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </Button>
          ) : null}
        </div>

        {source.snippet ? (
          <p className="line-clamp-3 max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
            {source.snippet}
          </p>
        ) : null}

        {source.coverageNote ? (
          <p className="rounded-lg border border-dashed border-border bg-cream/40 px-3 py-2 text-[11px] italic text-muted-foreground">
            {source.coverageNote}
          </p>
        ) : null}
      </div>
    </motion.li>
  );
}

export default LibraryView;
