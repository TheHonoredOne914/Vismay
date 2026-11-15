"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  BookOpen,
  ArrowDownNarrowWide,
  Eye,
  FileText,
  Swords,
  Network,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSelectionMenu, useVismayStore } from "@/lib/store/useVismayStore";
import type { Domain } from "@/lib/types";

export interface SelectionMenuProps {
  /**
   * The current topic's domain. When it falls in the visualization-friendly
   * set (physics, math, biology, chemistry, design), the "Visualize" action
   * is shown.
   */
  domain?: Domain | null;
  /**
   * Whether the user has prior learning to connect to. When true, the
   * "Connect" action appears.
   */
  hasPriorLearning?: boolean;
  className?: string;
}

/**
 * SelectionMenu
 *
 * The floating action menu that appears when the user selects text inside a
 * topic reading page. Listens to the singleton `useSelectionMenu` store.
 *
 * Behaviour:
 *   - Positions itself just below the selection rect (position: fixed).
 *   - Shows a contextual set of action buttons (Explain, Go Deeper,
 *     Visualize [domain-gated], Find Sources, Challenge Me, Connect
 *     [prior-learning-gated], Save).
 *   - Clicking an action POSTs to `/api/assistant/selection` with the
 *     selected text + action + topic/section context, then opens the
 *     AssistantDrawer with the response as the drawer's context.
 *   - Prevents the selection from being cleared on mousedown.
 *
 * Rendered through a portal to `document.body` so that fixed positioning is
 * always relative to the viewport (not a transformed ancestor).
 */

type ActionId =
  | "explain"
  | "go_deeper"
  | "visualize"
  | "find_sources"
  | "challenge"
  | "connect"
  | "save";

interface ActionDef {
  id: ActionId;
  label: string;
  icon: typeof BookOpen;
  always?: boolean;
}

const ALL_ACTIONS: ActionDef[] = [
  { id: "explain", label: "Explain", icon: BookOpen, always: true },
  { id: "go_deeper", label: "Go Deeper", icon: ArrowDownNarrowWide, always: true },
  { id: "visualize", label: "Visualize", icon: Eye },
  { id: "find_sources", label: "Find Sources", icon: FileText, always: true },
  { id: "challenge", label: "Challenge Me", icon: Swords, always: true },
  { id: "connect", label: "Connect", icon: Network },
  { id: "save", label: "Save", icon: Save, always: true },
];

const VISUALIZE_DOMAINS: Domain[] = [
  "physics",
  "mathematics",
  "biology",
  "chemistry",
  "design",
];

export function SelectionMenu({
  domain = null,
  hasPriorLearning = false,
  className,
}: SelectionMenuProps) {
  const { open, text, rect, topicSlug, sectionId, hide } = useSelectionMenu();
  const openDrawer = useVismayStore((s) => s.openDrawer);
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState<ActionId | null>(null);

  // Defer portal mount until client-side (avoid SSR mismatch).
  useEffect(() => setMounted(true), []);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") hide();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hide]);

  const runAction = useCallback(
    async (action: ActionId) => {
      if (loading || !text) return;
      setLoading(action);
      try {
        const res = await fetch("/api/assistant/selection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            action,
            topicSlug,
            sectionId,
          }),
        });
        if (!res.ok) {
          throw new Error(`Selection action failed (${res.status})`);
        }
        // Endpoint returns JSON: { title, body } for the drawer context.
        const data = (await res.json()) as {
          title?: string;
          body?: string;
        };
        hide();
        openDrawer({
          title: data.title ?? "Vismay AI",
          body: data.body ?? "",
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown error.";
        hide();
        openDrawer({
          title: "Vismay AI",
          body: `Sorry — I couldn't complete that request. ${msg}`,
        });
      } finally {
        setLoading(null);
      }
    },
    [loading, text, topicSlug, sectionId, hide, openDrawer],
  );

  if (!mounted) return null;

  // Compute the visible actions.
  const showVisualize =
    domain != null && VISUALIZE_DOMAINS.includes(domain);
  const visibleActions = ALL_ACTIONS.filter((a) => {
    if (a.always) return true;
    if (a.id === "visualize") return showVisualize;
    if (a.id === "connect") return hasPriorLearning;
    return false;
  });

  // Compute position — clamp so the menu never overflows the viewport.
  const MENU_W = 220; // approximate
  const GAP = 8;
  let top = 0;
  let left = 0;
  if (rect) {
    top = rect.bottom + GAP;
    left = rect.left;
    if (typeof window !== "undefined") {
      if (left + MENU_W > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - MENU_W - 12);
      }
      if (top + 200 > window.innerHeight) {
        // Flip above the selection if there's no room below.
        top = Math.max(12, rect.top - 200);
      }
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && rect && (
        <motion.div
          role="menu"
          aria-label="Selection actions"
          // Prevent mousedown from clearing the native text selection.
          onMouseDown={(e) => e.preventDefault()}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ position: "fixed", top, left, zIndex: 70 }}
          className={cn(
            "rounded-xl border border-border bg-paper/95 backdrop-blur",
            "shadow-warm-lg",
            "py-1.5 w-[220px]",
            className,
          )}
        >
          {visibleActions.map((a) => {
            const Icon = a.icon;
            const isLoading = loading === a.id;
            return (
              <button
                key={a.id}
                type="button"
                role="menuitem"
                disabled={loading !== null}
                onClick={() => void runAction(a.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left",
                  "text-sm text-forest",
                  "transition-colors duration-150 hover:bg-cream/70",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset",
                  "disabled:opacity-50 disabled:cursor-progress",
                )}
              >
                <Icon
                  aria-hidden="true"
                  size={15}
                  strokeWidth={1.75}
                  className={cn(
                    "shrink-0 text-sage",
                    isLoading && "animate-pulse text-gold",
                  )}
                />
                <span className="truncate">{a.label}</span>
                {isLoading && (
                  <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wider">
                    …
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default SelectionMenu;
