"use client";

/**
 * Vismay / Connected Concepts
 * A logical knowledge graph — separate from chronology. Each node is a
 * concept; each edge is a typed relationship (prerequisite, related,
 * extends, contrasts).
 *
 * Layout is a tiny hand-rolled force-directed relaxation — no d3, no
 * external dependency. Pan with drag, zoom with scroll / pinch.
 */

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowUpRight, MoveDiagonal, Network, Plus, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useVismayStore } from "@/lib/store/useVismayStore";
import type {
  ConceptNodeData,
  ConceptEdgeData,
} from "@/lib/types";
import { ViewShell, ViewLoading, ViewError, ViewEmpty } from "./_shared";

// Some seeds may carry an optional topicId link to open the related topic.
type ResolvedNode = ConceptNodeData & { topicId?: string | null };

// ---------------------------------------------------------------------------
// Domain → color (light theme — soft, warm, never indigo/blue)
// ---------------------------------------------------------------------------

const DOMAIN_COLOR: Record<string, string> = {
  law: "#244737",
  physics: "#C7A875",
  chemistry: "#8B5A3C",
  mathematics: "#5A7B5A",
  biology: "#6B8E5A",
  history: "#8B6F4E",
  philosophy: "#4E5D6E",
  design: "#A1B3A0",
  filmmaking: "#7B5A6B",
  general: "#6E7A6E",
};

function domainColor(d?: string): string {
  if (!d) return DOMAIN_COLOR.general;
  return DOMAIN_COLOR[d] ?? DOMAIN_COLOR.general;
}

// ---------------------------------------------------------------------------
// Layout — basic force-directed relaxation
// ---------------------------------------------------------------------------

interface Positioned {
  x: number;
  y: number;
}

function layoutGraph(
  nodes: ConceptNodeData[],
  edges: ConceptEdgeData[],
  width: number,
  height: number
): Map<string, Positioned> {
  const pos = new Map<string, Positioned>();
  const vel = new Map<string, Positioned>();
  if (nodes.length === 0) return pos;

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.34;

  // Initial circular placement with deterministic jitter so isolated
  // graphs don't overlap perfectly.
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    const jitter = ((i * 37) % 17) - 8;
    pos.set(n.id, {
      x: cx + Math.cos(angle) * (radius + jitter),
      y: cy + Math.sin(angle) * (radius + jitter),
    });
    vel.set(n.id, { x: 0, y: 0 });
  });

  const ideal = 130;
  const repulsion = 18000;
  const iterations = 200;
  const damping = 0.82;
  const maxStep = 18;

  for (let iter = 0; iter < iterations; iter++) {
    // Decay the step size as iterations progress for stability.
    const stepScale = Math.max(0.15, 1 - iter / iterations);

    const force = new Map<string, Positioned>();
    nodes.forEach((n) => force.set(n.id, { x: 0, y: 0 }));

    // Repulsion between every pair.
    for (let i = 0; i < nodes.length; i++) {
      const a = pos.get(nodes[i].id)!;
      for (let j = i + 1; j < nodes.length; j++) {
        const b = pos.get(nodes[j].id)!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = Math.max(160, dx * dx + dy * dy);
        const dist = Math.sqrt(distSq);
        const f = repulsion / distSq;
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        force.get(nodes[i].id)!.x -= fx;
        force.get(nodes[i].id)!.y -= fy;
        force.get(nodes[j].id)!.x += fx;
        force.get(nodes[j].id)!.y += fy;
      }
    }

    // Attraction along edges (spring).
    edges.forEach((e) => {
      const a = pos.get(e.fromId);
      const b = pos.get(e.toId);
      if (!a || !b) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const f = (dist - ideal) * 0.06;
      const fx = (dx / dist) * f;
      const fy = (dy / dist) * f;
      force.get(e.fromId)!.x += fx;
      force.get(e.fromId)!.y += fy;
      force.get(e.toId)!.x -= fx;
      force.get(e.toId)!.y -= fy;
    });

    // Integrate with damping + step clamping. Keep nodes inside the canvas.
    nodes.forEach((n) => {
      const f = force.get(n.id)!;
      const v = vel.get(n.id)!;
      v.x = (v.x + f.x * stepScale) * damping;
      v.y = (v.y + f.y * stepScale) * damping;
      const vxClamped = Math.max(-maxStep, Math.min(maxStep, v.x));
      const vyClamped = Math.max(-maxStep, Math.min(maxStep, v.y));
      const p = pos.get(n.id)!;
      p.x = Math.max(40, Math.min(width - 40, p.x + vxClamped));
      p.y = Math.max(40, Math.min(height - 40, p.y + vyClamped));
    });
  }

  return pos;
}

// ---------------------------------------------------------------------------
// Relationship → stroke style
// ---------------------------------------------------------------------------

const RELATIONSHIP_STYLE: Record<
  ConceptEdgeData["relationship"],
  { strokeDasharray: string; label: string; description: string }
> = {
  prerequisite: {
    strokeDasharray: "none",
    label: "Prerequisite",
    description: "You usually need this first.",
  },
  related: {
    strokeDasharray: "6 4",
    label: "Related",
    description: "Touches the same idea.",
  },
  extends: {
    strokeDasharray: "2 4",
    label: "Extends",
    description: "Builds on top of it.",
  },
  contrasts: {
    strokeDasharray: "none",
    label: "Contrasts",
    description: "Stands in tension with it.",
  },
};

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

const VIEW_W = 900;
const VIEW_H = 560;

export function ConnectedConceptsView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<ResolvedNode[]>([]);
  const [edges, setEdges] = useState<ConceptEdgeData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // viewBox state for pan / zoom
  const [view, setView] = useState({
    x: 0,
    y: 0,
    w: VIEW_W,
    h: VIEW_H,
  });
  const [isPanning, setIsPanning] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; vx: number; vy: number } | null>(null);

  const reduce = useReducedMotion();
  const openTopic = useVismayStore((s) => s.openTopic);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch("/api/concepts", { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = (await res.json()) as {
          nodes: ConceptNodeData[];
          edges: ConceptEdgeData[];
        };
        if (!cancelled) {
          setNodes(json.nodes ?? []);
          setEdges(json.edges ?? []);
        }
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

  // Compute layout only when nodes / edges change.
  const positions = useMemo(
    () => layoutGraph(nodes, edges, VIEW_W, VIEW_H),
    [nodes, edges]
  );

  // ---------------------------------------------------------------------------
  // Pan / zoom handlers
  // ---------------------------------------------------------------------------

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      vx: view.x,
      vy: view.y,
    };
    setIsPanning(true);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scale = view.w / rect.width;
    const dx = (e.clientX - dragRef.current.startX) * scale;
    const dy = (e.clientY - dragRef.current.startY) * scale;
    setView((v) => ({ ...v, x: dragRef.current!.vx - dx, y: dragRef.current!.vy - dy }));
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = null;
    setIsPanning(false);
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  const zoomBy = (factor: number) => {
    setView((v) => {
      const newW = Math.max(220, Math.min(VIEW_W * 3, v.w / factor));
      const newH = Math.max(140, Math.min(VIEW_H * 3, v.h / factor));
      // Keep the center stable.
      const cx = v.x + v.w / 2;
      const cy = v.y + v.h / 2;
      return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
    });
  };

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    // Basic zoom on wheel.
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomBy(factor);
  };

  const resetView = () =>
    setView({ x: 0, y: 0, w: VIEW_W, h: VIEW_H });

  const selected = selectedId
    ? nodes.find((n) => n.id === selectedId) ?? null
    : null;
  const hover = hoverId
    ? nodes.find((n) => n.id === hoverId) ?? null
    : null;

  if (loading) {
    return (
      <ViewShell
        overline="03 / CONNECTED CONCEPTS"
        title="How ideas connect."
        subtitle="A quiet map of how the things you've learned relate to one another."
      >
        <ViewLoading rows={2} />
      </ViewShell>
    );
  }

  if (error) {
    return (
      <ViewShell
        overline="03 / CONNECTED CONCEPTS"
        title="How ideas connect."
        subtitle="A quiet map of how the things you've learned relate to one another."
      >
        <ViewError error={error} onRetry={load} />
      </ViewShell>
    );
  }

  if (nodes.length === 0) {
    return (
      <ViewShell
        overline="03 / CONNECTED CONCEPTS"
        title="How ideas connect."
        subtitle="A quiet map of how the things you've learned relate to one another."
      >
        <ViewEmpty
          icon={Network}
          message="As you learn, Vismay will quietly map how ideas connect. Start a topic to begin."
          cta="Start a topic"
          onCta={() => useVismayStore.getState().setView("home")}
        />
      </ViewShell>
    );
  }

  return (
    <ViewShell
      overline="03 / CONNECTED CONCEPTS"
      title="How ideas connect."
      subtitle="A quiet map of how the things you've learned relate to one another. Drag to pan, scroll to zoom."
      actions={
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => zoomBy(1.2)}
            aria-label="Zoom in"
            className="h-8 w-8 p-0 rounded-full border-border bg-paper"
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => zoomBy(0.83)}
            aria-label="Zoom out"
            className="h-8 w-8 p-0 rounded-full border-border bg-paper"
          >
            <Minus className="size-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetView}
            aria-label="Reset view"
            className="h-8 gap-1.5 rounded-full border-border bg-paper text-xs"
          >
            <MoveDiagonal className="size-3.5" aria-hidden="true" />
            Reset
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        {/* Graph canvas */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-paper shadow-soft">
          <svg
            viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
            className="h-[440px] w-full cursor-grab touch-none select-none sm:h-[560px]"
            style={{ cursor: isPanning ? "grabbing" : "grab" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onWheel={onWheel}
            role="img"
            aria-label="Concept graph. Each node is a concept; each line is a relationship."
          >
            {/* Edges */}
            <g>
              {edges.map((e) => {
                const a = positions.get(e.fromId);
                const b = positions.get(e.toId);
                if (!a || !b) return null;
                const style = RELATIONSHIP_STYLE[e.relationship];
                const isDouble = e.relationship === "contrasts";
                if (isDouble) {
                  // Two parallel lines for "contrasts".
                  const dx = b.x - a.x;
                  const dy = b.y - a.y;
                  const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                  const nx = (-dy / len) * 3;
                  const ny = (dx / len) * 3;
                  return (
                    <g
                      key={e.id}
                      stroke="#A1B3A0"
                      strokeWidth={1.1}
                      opacity={0.85}
                    >
                      <line
                        x1={a.x + nx}
                        y1={a.y + ny}
                        x2={b.x + nx}
                        y2={b.y + ny}
                      />
                      <line
                        x1={a.x - nx}
                        y1={a.y - ny}
                        x2={b.x - nx}
                        y2={b.y - ny}
                      />
                    </g>
                  );
                }
                return (
                  <line
                    key={e.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#A1B3A0"
                    strokeWidth={1.4}
                    strokeDasharray={style.strokeDasharray}
                    opacity={0.85}
                  />
                );
              })}
            </g>

            {/* Nodes */}
            <g>
              {nodes.map((n) => {
                const p = positions.get(n.id);
                if (!p) return null;
                const isSelected = selectedId === n.id;
                const isHover = hoverId === n.id;
                const fill = domainColor(n.domain);
                return (
                  <g
                    key={n.id}
                    transform={`translate(${p.x}, ${p.y})`}
                    tabIndex={0}
                    role="button"
                    aria-label={`${n.title}${
                      n.description ? `: ${n.description}` : ""
                    }`}
                    onClick={() => setSelectedId(n.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(n.id);
                      }
                    }}
                    onMouseEnter={() => setHoverId(n.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onFocus={() => setHoverId(n.id)}
                    onBlur={() => setHoverId(null)}
                    className="cursor-pointer focus:outline-none"
                    style={{ outline: "none" }}
                  >
                    {/* Outer halo for hover / selected */}
                    {(isHover || isSelected) && !reduce ? (
                      <circle
                        r={16}
                        fill={fill}
                        opacity={0.18}
                        className="transition-all"
                      />
                    ) : null}
                    <circle
                      r={isSelected ? 12 : 10}
                      fill={fill}
                      stroke="#FFFDF8"
                      strokeWidth={2}
                      className="transition-all"
                    />
                    <text
                      y={24}
                      textAnchor="middle"
                      className="pointer-events-none select-none fill-ink font-sans text-[11px]"
                      style={{ fontSize: 11 }}
                    >
                      {n.title.length > 24
                        ? `${n.title.slice(0, 22)}…`
                        : n.title}
                    </text>
                    {/* Native SVG tooltip — accessible hover affordance */}
                    <title>{n.title}</title>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Hover chip — title + brief description */}
          {hover && hover.id !== selectedId ? (
            <div
              className="pointer-events-none absolute left-4 top-4 max-w-xs rounded-xl border border-border bg-paper/95 px-3 py-2 shadow-soft"
              aria-hidden="true"
            >
              <p className="text-sm font-medium text-ink">{hover.title}</p>
              {hover.description ? (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {hover.description}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Selected node popover — title, description, open topic */}
          {selected ? (
            <div
              role="dialog"
              aria-label={`Details for ${selected.title}`}
              className="absolute bottom-4 left-4 right-4 max-w-md rounded-xl border border-border bg-paper px-4 py-3 shadow-warm sm:right-auto"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block size-2.5 rounded-full"
                      style={{ background: domainColor(selected.domain) }}
                    />
                    <h3 className="font-serif-display text-lg text-ink">
                      {selected.title}
                    </h3>
                  </div>
                  {selected.description ? (
                    <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                      {selected.description}
                    </p>
                  ) : (
                    <p className="text-xs italic text-muted-foreground">
                      No description yet.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close"
                  className="inline-grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  ×
                </button>
              </div>
              {selected.topicId ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5 rounded-full border-forest text-forest hover:bg-cream"
                  onClick={() => {
                    if (selected.topicId) openTopic(selected.topicId);
                  }}
                >
                  Open topic
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Legend */}
        <aside className="flex flex-col gap-3">
          <div className="rounded-2xl border border-border bg-paper p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Relationships
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {(
                Object.keys(RELATIONSHIP_STYLE) as ConceptEdgeData["relationship"][]
              ).map((r) => {
                const s = RELATIONSHIP_STYLE[r];
                return (
                  <li key={r} className="flex items-center gap-3">
                    <svg
                      width="36"
                      height="10"
                      viewBox="0 0 36 10"
                      aria-hidden="true"
                    >
                      {r === "contrasts" ? (
                        <>
                          <line
                            x1="0"
                            y1="3"
                            x2="36"
                            y2="3"
                            stroke="#A1B3A0"
                            strokeWidth="1.4"
                          />
                          <line
                            x1="0"
                            y1="7"
                            x2="36"
                            y2="7"
                            stroke="#A1B3A0"
                            strokeWidth="1.4"
                          />
                        </>
                      ) : (
                        <line
                          x1="0"
                          y1="5"
                          x2="36"
                          y2="5"
                          stroke="#A1B3A0"
                          strokeWidth="1.6"
                          strokeDasharray={s.strokeDasharray === "none" ? undefined : s.strokeDasharray}
                        />
                      )}
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-ink">
                        {s.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {s.description}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-paper p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Domains
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {Array.from(new Set(nodes.map((n) => n.domain ?? "general"))).map(
                (d) => (
                  <li
                    key={d}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] text-ink"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block size-2 rounded-full"
                      style={{ background: domainColor(d) }}
                    />
                    {d}
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-dashed border-border bg-cream/40 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {nodes.length} concept{nodes.length === 1 ? "" : "s"} ·{" "}
              {edges.length} connection{edges.length === 1 ? "" : "s"}
            </p>
          </div>
        </aside>
      </div>

      {/* Footnote */}
      <p className="mt-4 text-xs text-muted-foreground">
        <Badge
          variant="outline"
          className="mr-2 rounded-full border-gold/40 text-[10px] text-gold"
        >
          Logical graph
        </Badge>
        Separate from your chronological journey. Relationships are suggested
        by Vismay as you learn.
      </p>
    </ViewShell>
  );
}

export default ConnectedConceptsView;
