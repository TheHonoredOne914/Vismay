"use client";

import { useCallback, useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { useVismayStore } from "@/lib/store/useVismayStore";
import type { LearningEvent, TopicData, UserPreferencesData } from "@/lib/types";
import { HomeHero } from "@/components/vismay/home/HomeHero";
import { ContinueLearningCard } from "@/components/vismay/home/ContinueLearningCard";
import { LearningTimeline } from "@/components/vismay/home/LearningTimeline";
import { ExtraPanels } from "@/components/vismay/home/ExtraPanels";
import { OnboardingDialog } from "@/components/vismay/home/OnboardingDialog";
import { cn } from "@/lib/utils";

interface LastVisitedResponse {
  topic: TopicData;
  lastEvent?: LearningEvent;
}

interface LearningResponse {
  events: LearningEvent[];
  topics?: TopicData[];
}

interface PreferencesResponse {
  preferences: UserPreferencesData;
}

interface TopicCreateResponse {
  topic?: TopicData;
  configured?: boolean;
  error?: string;
}

/**
 * Home view container. Renders the hero plus a main column with the
 * continue-learning card, learning timeline, and editorial panels.
 *
 * On mount, fetches:
 *   - GET /api/last-visited
 *   - GET /api/learning  (top 6 events)
 *   - GET /api/preferences
 *
 * `handleSearch(query)`:
 *   1. setLoadingTopic(true)
 *   2. POST /api/topic with { query }
 *   3. If `{ configured: false }`: set topicError, open onboarding dialog.
 *   4. Else: setCurrentTopic, openTopic(slug), refetch last-visited & learning.
 *   5. setLoadingTopic(false)
 */
export function HomeView() {
  const view = useVismayStore((s) => s.view);
  const setView = useVismayStore((s) => s.setView);
  const setLastVisited = useVismayStore((s) => s.setLastVisited);
  const setLearningEvents = useVismayStore((s) => s.setLearningEvents);
  const setPreferences = useVismayStore((s) => s.setPreferences);
  const setCurrentTopic = useVismayStore((s) => s.setCurrentTopic);
  const openTopic = useVismayStore((s) => s.openTopic);
  const setLoadingTopic = useVismayStore((s) => s.setLoadingTopic);
  const setTopicError = useVismayStore((s) => s.setTopicError);
  const setOnboardingOpen = useVismayStore((s) => s.setOnboardingOpen);

  const lastVisited = useVismayStore((s) => s.lastVisited);
  const learningEvents = useVismayStore((s) => s.learningEvents);
  const preferences = useVismayStore((s) => s.preferences);
  const topicError = useVismayStore((s) => s.topicError);
  const loadingTopic = useVismayStore((s) => s.loadingTopic);

  // Local mirror of topics for the timeline to resolve slugs.
  const topicsRef = useRef<TopicData[]>([]);
  const setTopicsMirror = (topics: TopicData[]) => {
    topicsRef.current = topics;
  };

  // Initial data load.
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      const [lastRes, learningRes, prefsRes] = await Promise.all([
        fetch("/api/last-visited").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/learning").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/preferences").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (cancelled) return;

      const last = lastRes as LastVisitedResponse | null;
      if (last?.topic) setLastVisited(last);

      const learning = learningRes as LearningResponse | null;
      if (learning?.events) setLearningEvents(learning.events);
      if (learning?.topics) setTopicsMirror(learning.topics);

      const prefs = prefsRes as PreferencesResponse | null;
      if (prefs?.preferences) setPreferences(prefs.preferences);
    }

    loadAll();
    return () => {
      cancelled = true;
    };
    // Run once on mount; store setters are stable.
  }, []);

  const refreshTrail = useCallback(async () => {
    try {
      const [lastRes, learningRes] = await Promise.all([
        fetch("/api/last-visited").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/learning").then((r) => (r.ok ? r.json() : null)),
      ]);
      const last = lastRes as LastVisitedResponse | null;
      if (last?.topic) setLastVisited(last);
      const learning = learningRes as LearningResponse | null;
      if (learning?.events) setLearningEvents(learning.events);
      if (learning?.topics) setTopicsMirror(learning.topics);
    } catch {
      // Silently ignore — the user can still proceed.
    }
  }, [setLastVisited, setLearningEvents]);

  const handleSearch = useCallback(
    async (query: string) => {
      setLoadingTopic(true);
      setTopicError(null);
      try {
        const res = await fetch("/api/topic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const data = (await res.json()) as TopicCreateResponse;
        if (!res.ok || data.configured === false) {
          const msg = data.error ?? "Vismay is not fully configured yet.";
          setTopicError(msg);
          setOnboardingOpen(true);
          return;
        }
        if (data.topic) {
          setCurrentTopic(data.topic);
          openTopic(data.topic.slug);
          // Reflect the URL state for shareability.
          try {
            window.history.replaceState(
              null,
              "",
              `?view=topic&slug=${encodeURIComponent(data.topic.slug)}`
            );
          } catch {
            // ignore
          }
          // Refresh trail so the new topic shows up in the timeline.
          void refreshTrail();
        }
      } catch {
        setTopicError("Something went wrong while preparing your topic.");
      } finally {
        setLoadingTopic(false);
      }
    },
    [
      setLoadingTopic,
      setTopicError,
      setOnboardingOpen,
      setCurrentTopic,
      openTopic,
      refreshTrail,
    ]
  );

  const handleContinue = useCallback(
    (slug: string) => {
      setCurrentTopic(null);
      openTopic(slug);
      setView("topic");
    },
    [setCurrentTopic, openTopic, setView]
  );

  const handleTimelineSelect = useCallback(
    (slug: string) => {
      setCurrentTopic(null);
      openTopic(slug);
      setView("topic");
    },
    [setCurrentTopic, openTopic, setView]
  );

  // Don't render home content when the view is elsewhere — the page.tsx
  // shell handles view switching. This keeps effects mounted though.
  if (view !== "home") return null;

  return (
    <div className="relative">
      <HomeHero onSearch={handleSearch} />

      <main className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10 lg:px-12">
        {topicError && (
          <div
            role="alert"
            className={cn(
              "mb-6 flex items-start gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-forest"
            )}
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
            <span>
              {topicError}{" "}
              <button
                type="button"
                onClick={() => setOnboardingOpen(true)}
                className="underline decoration-gold underline-offset-2 hover:text-forest/80"
              >
                Review your setup
              </button>
              .
            </span>
          </div>
        )}

        {loadingTopic && (
          <div className="mb-6 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-gold" />
            Preparing your topic...
          </div>
        )}

        <ContinueLearningCard lastVisited={lastVisited} onContinue={handleContinue} />

        <div className="mt-20">
          <LearningTimeline
            events={learningEvents}
            topics={topicsRef.current}
            onSelect={handleTimelineSelect}
          />
        </div>

        <ExtraPanels className="mt-24" />
      </main>

      <OnboardingDialog />
      {/* Force preferences re-evaluation when onboarding closes. */}
      <span className="hidden" aria-hidden="true">
        {preferences?.onboardingDone ? "onboarded" : "fresh"}
      </span>
    </div>
  );
}

export default HomeView;
