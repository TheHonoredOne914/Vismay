"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Home as HomeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VismayAmbientScene } from "@/components/vismay/ambient/VismayAmbientScene";
import { TopicSection } from "@/components/vismay/primitives/TopicSection";
import { AssistantDrawer } from "@/components/vismay/primitives/AssistantDrawer";
import { SelectionMenu } from "@/components/vismay/primitives/SelectionMenu";
import { TopicBreadcrumb } from "@/components/vismay/topic/TopicBreadcrumb";
import { TopicSidebar } from "@/components/vismay/topic/TopicSidebar";
import { TopicSources } from "@/components/vismay/topic/TopicSources";
import { TopicAssistantMini } from "@/components/vismay/topic/TopicAssistantMini";
import { useVismayStore } from "@/lib/store/useVismayStore";
import type { Subtopic, TopicData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TopicResponse {
  topic: TopicData;
}

/**
 * Full topic reading view.
 *
 * Layout:
 *   - Desktop (lg+): grid-cols-[200px_1fr_320px]
 *   - Tablet (md):  grid-cols-[160px_1fr]  (right sidebar hidden)
 *   - Mobile:       single column, sidebars collapse into Sheets
 *
 * The main column holds the breadcrumb, topic title, description, an
 * optional contextual hint, then the topic sections. The right sidebar
 * carries the assistant prompt and relevant sources.
 *
 * Opening the assistant drawer does NOT scroll the main column — the
 * sheet overlays rather than shifting layout.
 */
export function TopicView() {
  const view = useVismayStore((s) => s.view);
  const currentTopic = useVismayStore((s) => s.currentTopic);
  const currentTopicSlug = useVismayStore((s) => s.currentTopicSlug);
  const setCurrentTopic = useVismayStore((s) => s.setCurrentTopic);
  const setActiveSection = useVismayStore((s) => s.setActiveSection);
  const drawerOpen = useVismayStore((s) => s.drawerOpen);
  const drawerContext = useVismayStore((s) => s.drawerContext);
  const closeDrawer = useVismayStore((s) => s.closeDrawer);
  const setView = useVismayStore((s) => s.setView);
  const closeTopic = useVismayStore((s) => s.closeTopic);
  const setTopicError = useVismayStore((s) => s.setTopicError);
  const setLearningEvents = useVismayStore((s) => s.setLearningEvents);
  const learningEvents = useVismayStore((s) => s.learningEvents);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordedSectionsRef = useRef<Set<string>>(new Set());

  // Hydrate the topic if we land on this view with a slug but no topic.
  useEffect(() => {
    if (view !== "topic") return;
    if (currentTopic) return;
    if (!currentTopicSlug) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/topic/${encodeURIComponent(currentTopicSlug!)}?recordView=true`
        );
        if (!res.ok) {
          throw new Error("Could not load this topic.");
        }
        const data = (await res.json()) as TopicResponse;
        if (cancelled) return;
        if (data.topic) {
          setCurrentTopic(data.topic);
          // Reflect URL.
          try {
            window.history.replaceState(
              null,
              "",
              `?view=topic&slug=${encodeURIComponent(data.topic.slug)}`
            );
          } catch {
            // ignore
          }
        }
      } catch {
        if (!cancelled) setError("Could not load this topic.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [view, currentTopic, currentTopicSlug, setCurrentTopic]);

  // Refetch learning events quietly when we enter the topic view.
  useEffect(() => {
    if (view !== "topic") return;
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch("/api/learning");
        if (!res.ok) return;
        const data = (await res.json()) as { events: typeof learningEvents };
        if (!cancelled && data.events) setLearningEvents(data.events);
      } catch {
        // silent
      }
    }
    refresh();
    return () => {
      cancelled = true;
    };
  }, [view, setLearningEvents, learningEvents]);

  const recordEvent = useCallback(
    async (payload: {
      type: string;
      label: string;
      detail?: string;
      topicSlug?: string;
      sectionId?: string;
    }) => {
      try {
        await fetch("/api/learning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // silent — recording is best-effort.
      }
    },
    []
  );

  const handleExpand = useCallback(
    (sectionId: string) => {
      setActiveSection(sectionId);
      if (!currentTopic) return;
      if (recordedSectionsRef.current.has(sectionId)) return;
      recordedSectionsRef.current.add(sectionId);
      const section = currentTopic.sections.find((s) => s.id === sectionId);
      if (!section) return;
      void recordEvent({
        type: "section_opened",
        label: `Opened ${section.title}`,
        topicSlug: currentTopic.slug,
        sectionId,
      });
    },
    [currentTopic, recordEvent, setActiveSection]
  );

  const handleSubtopicClick = useCallback(
    (subtopic: Subtopic) => {
      if (!currentTopic) return;
      // Find the section that contains this subtopic (for the sectionId log).
      const section = currentTopic.sections.find(
        (s) => s.subtopics?.some((st) => st.id === subtopic.id),
      );
      void recordEvent({
        type: "subtopic_explored",
        label: subtopic.title,
        detail: subtopic.summary ?? undefined,
        topicSlug: currentTopic.slug,
        sectionId: section?.id,
      });
      // Open the assistant drawer with a "go deeper" action for this subtopic.
      useVismayStore.getState().openDrawer({
        title: subtopic.title,
        body:
          subtopic.body ??
          `Tell me more about ${subtopic.title} in the context of ${currentTopic.title}.`,
      });
    },
    [currentTopic, recordEvent]
  );

  const handleSourceClick = useCallback((sourceId: string) => {
    if (!currentTopic) return;
    if (sourceId.startsWith("discovery:")) {
      const slug = sourceId.slice("discovery:".length);
      // Switch to that topic.
      setCurrentTopic(null);
      useVismayStore.getState().openTopic(slug);
      return;
    }
    void fetch("/api/learning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "source_viewed",
        label: "Opened a source",
        topicSlug: currentTopic.slug,
        sourceId,
      }),
    }).catch(() => {
      // best-effort
    });
  }, [currentTopic, setCurrentTopic]);

  const handleBackHome = useCallback(() => {
    setTopicError(null);
    closeTopic();
    setView("home");
  }, [closeTopic, setTopicError, setView]);

  if (view !== "topic") return null;

  return (
    <div className="relative isolate">
      {/* Calm ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <VismayAmbientScene intensity="calm" />
      </div>

      <SelectionMenu />

      <div className="relative mx-auto grid min-h-[calc(100vh-72px)] w-full max-w-[1400px] grid-cols-1 lg:grid-cols-[200px_1fr_320px] xl:grid-cols-[220px_1fr_340px]">
        {/* Left: sections sidebar */}
        <TopicSidebar
          topic={currentTopic ?? PLACEHOLDER_TOPIC}
          className="lg:block"
        />

        {/* Center: reading column */}
        <main className="relative px-5 py-10 sm:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-3xl">
            {loading && <TopicSkeleton />}
            {!loading && error && (
              <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
                <p className="font-serif text-2xl text-forest">{error}</p>
                <Button
                  type="button"
                  onClick={handleBackHome}
                  className="bg-forest text-paper hover:bg-forest/90"
                >
                  <HomeIcon className="size-4" />
                  Back to home
                </Button>
              </div>
            )}
            {!loading && !error && currentTopic && (
              <>
                <TopicBreadcrumb domain={currentTopic.domain} context="India" />

                <h1 className="mt-6 font-serif text-4xl leading-tight tracking-tight text-forest sm:text-5xl">
                  {currentTopic.title}
                </h1>

                {currentTopic.description && (
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {currentTopic.description}
                  </p>
                )}

                {/* Mobile-only assistant mini (since right sidebar is hidden on small screens) */}
                <div className="mt-6 lg:hidden">
                  <TopicAssistantMini topic={currentTopic} />
                </div>

                {/* Contextual hint for the first section, if any */}
                {currentTopic.sections[0]?.contextualHint && (
                  <div className="mt-6 hidden lg:block">
                    <TopicAssistantMini topic={currentTopic} />
                  </div>
                )}

                <div className="mt-8 space-y-4">
                  {[...currentTopic.sections]
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((section, i) => (
                      <TopicSection
                        key={section.id}
                        section={section}
                        index={i}
                        defaultOpen={i === 0}
                        onExpand={handleExpand}
                        onSubtopicClick={handleSubtopicClick}
                      />
                    ))}
                </div>

                <div className="mt-12 flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={handleBackHome}
                    className={cn(
                      "inline-flex items-center gap-1.5 transition-colors hover:text-forest",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-md px-1 py-0.5"
                    )}
                  >
                    <ArrowLeft className="size-3.5" />
                    Back to home
                  </button>
                  <span>
                    {currentTopic.sections.length} section
                    {currentTopic.sections.length === 1 ? "" : "s"} &middot;{" "}
                    {new Date(currentTopic.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </main>

        {/* Right: assistant mini + sources (desktop only) */}
        <div className="hidden lg:block">
          {currentTopic && !loading && !error && (
            <>
              <div className="border-l border-border bg-paper/40 px-6 pb-4 pt-8">
                <TopicAssistantMini topic={currentTopic} />
              </div>
              <TopicSources topic={currentTopic} onSourceClick={handleSourceClick} />
            </>
          )}
        </div>
      </div>

      <AssistantDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        context={drawerContext}
        topicSlug={currentTopicSlug}
        sectionId={useVismayStore.getState().activeSectionId}
      />
    </div>
  );
}

const PLACEHOLDER_TOPIC: TopicData = {
  id: "placeholder",
  title: "",
  slug: "",
  description: "",
  domain: "general",
  sections: [],
  userProvidedStructure: false,
  lastSectionId: null,
  savedForLater: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function TopicSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-3 w-32 bg-cream/60" />
      <Skeleton className="h-12 w-2/3 bg-cream/60" />
      <Skeleton className="h-4 w-1/2 bg-cream/60" />
      <div className="space-y-3 pt-4">
        <Skeleton className="h-24 rounded-2xl bg-cream/60" />
        <Skeleton className="h-24 rounded-2xl bg-cream/60" />
        <Skeleton className="h-24 rounded-2xl bg-cream/60" />
      </div>
    </div>
  );
}

export default TopicView;
