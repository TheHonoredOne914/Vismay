"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X, Send, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssistantMessage } from "@/lib/types";

export interface AssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Drawer heading. Defaults to "Vismay AI". */
  title?: string;
  /** The triggering context — shown at the top of the drawer in a cream box. */
  context?: { title: string; body: string } | null;
  /** Topic slug for the assistant API call. */
  topicSlug?: string | null;
  /** Section id for the assistant API call. */
  sectionId?: string | null;
  className?: string;
}

/**
 * AssistantDrawer
 *
 * A right-side slide-in panel for the contextual Vismay AI assistant.
 * Slides in from the right edge with a soft cubic-bezier transform.
 *
 * Layout:
 *   - Desktop: fixed ~340px panel pinned to the right of the viewport, so
 *     it does NOT overlay the main reading column (it sits beside it).
 *   - Mobile: takes nearly the full viewport.
 *
 * Behaviour:
 *   - If `context` is provided, shows it at the top in a cream box.
 *   - Below, an input + send button. Follow-ups POST to `/api/assistant`
 *     with `{ topicSlug, sectionId, context, messages }` and the response
 *     is streamed incrementally into the conversation thread.
 *   - ESC closes. Close button in the top-right.
 */
export function AssistantDrawer({
  open,
  onClose,
  title = "Vismay AI",
  context,
  topicSlug = null,
  sectionId = null,
  className,
}: AssistantDrawerProps) {
  const reduceMotion = useReducedMotion();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset the conversation whenever a new context opens the drawer.
  useEffect(() => {
    if (open && context) {
      setMessages([
        {
          role: "assistant",
          content: context.body,
        },
      ]);
    }
  }, [open, context]);

  // Close on ESC.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Move focus into the drawer when it opens.
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 350);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  // Auto-scroll the thread to the bottom as content streams in.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  const sendFollowUp = useCallback(async () => {
    const text = draft.trim();
    if (!text || streaming) return;

    const userMsg: AssistantMessage = { role: "user", content: text };
    const placeholder: AssistantMessage = { role: "assistant", content: "" };
    const nextMessages = [...messages, userMsg];
    setMessages([...nextMessages, placeholder]);
    setDraft("");
    setStreaming(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicSlug,
          sectionId,
          context: "followup",
          messages: nextMessages,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Assistant request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      // Read chunks and incrementally render into the last assistant message.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `Sorry — I couldn't complete that. ${msg}`,
        };
        return copy;
      });
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }, [draft, messages, sectionId, streaming, topicSlug]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendFollowUp();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Mobile scrim — desktop does not need one because the drawer
              sits beside the content rather than over it. */}
          <motion.div
            aria-hidden="true"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[1px] lg:hidden"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduceMotion ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: "100%" }}
            transition={{
              duration: 0.55,
              ease: [0.25, 0.75, 0.2, 1],
            }}
            className={cn(
              "fixed top-0 right-0 bottom-0 z-50",
              "bg-paper border-l border-border shadow-warm-lg",
              "flex flex-col",
              "w-[100vw] sm:w-[380px] lg:w-[340px]",
              "focus-visible:outline-none",
              className,
            )}
          >
            {/* Header */}
            <header className="flex items-center justify-between gap-3 px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-center gap-2.5 min-w-0">
                <BookOpen
                  aria-hidden="true"
                  size={18}
                  className="text-gold shrink-0"
                  strokeWidth={1.75}
                />
                <h2 className="font-serif text-2xl text-forest truncate">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close assistant"
                className={cn(
                  "shrink-0 grid place-items-center w-9 h-9 rounded-full",
                  "text-muted-foreground hover:text-forest hover:bg-cream/70",
                  "transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                )}
              >
                <X aria-hidden="true" size={18} strokeWidth={2} />
              </button>
            </header>

            {/* Body — scrollable thread + context */}
            <div
              ref={scrollRef}
              className={cn(
                "flex-1 overflow-y-auto vismay-scroll",
                "px-6 py-5 space-y-4",
              )}
            >
              {context && (
                <div className="rounded-xl bg-cream/70 border border-border p-4">
                  <div className="text-[10px] font-semibold tracking-[0.18em] text-sage uppercase mb-1">
                    Context
                  </div>
                  <div className="font-serif text-base text-forest leading-snug">
                    {context.title}
                  </div>
                  {context.body && (
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {context.body}
                    </p>
                  )}
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-forest text-white ml-6"
                      : "bg-cream/60 text-foreground mr-6",
                  )}
                >
                  {m.content || (
                    <span className="inline-flex gap-1 items-center text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-sage/70 animate-pulse" />
                      <span className="w-1.5 h-1.5 rounded-full bg-sage/70 animate-pulse [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-sage/70 animate-pulse [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Composer */}
            <footer className="border-t border-border px-4 py-3 bg-paper">
              <div className="flex items-end gap-2 rounded-2xl border border-border bg-cream/30 px-3 py-2 focus-within:border-gold/60 transition-colors">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKey}
                  rows={1}
                  placeholder="Ask a follow-up…"
                  aria-label="Follow-up question"
                  className={cn(
                    "flex-1 resize-none bg-transparent outline-none border-0",
                    "text-sm text-ink placeholder:text-muted-foreground",
                    "py-1 max-h-32",
                  )}
                />
                <button
                  type="button"
                  onClick={() => void sendFollowUp()}
                  disabled={!draft.trim() || streaming}
                  aria-label="Send follow-up"
                  className={cn(
                    "shrink-0 grid place-items-center w-9 h-9 rounded-full",
                    "bg-forest text-white",
                    "transition-transform duration-200",
                    "hover:translate-x-0.5 hover:bg-forest/90",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                    "disabled:opacity-50 disabled:pointer-events-none",
                  )}
                >
                  <Send aria-hidden="true" size={15} strokeWidth={2} />
                </button>
              </div>
              <p className="mt-1.5 px-1 text-[10px] text-muted-foreground/80">
                Enter to send · Shift+Enter for newline
              </p>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default AssistantDrawer;
