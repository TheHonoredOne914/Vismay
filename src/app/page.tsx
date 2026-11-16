"use client";

import { TopBar } from "@/components/vismay/nav/TopBar";
import { HomeView } from "@/components/vismay/home/HomeView";
import { TopicView } from "@/components/vismay/topic/TopicView";
import { MyLearningView } from "@/components/vismay/views/MyLearningView";
import { JourneyView } from "@/components/vismay/views/JourneyView";
import { ConnectedConceptsView } from "@/components/vismay/views/ConnectedConceptsView";
import { LibraryView } from "@/components/vismay/views/LibraryView";
import { NotesView } from "@/components/vismay/views/NotesView";
import { UploadsView } from "@/components/vismay/views/UploadsView";
import { useVismayStore } from "@/lib/store/useVismayStore";

/**
 * Vismay is a single-page app: there is no Next.js router navigation.
 * The active view is driven by `useVismayStore.view`, and the TopBar
 * is always mounted above whichever view is active.
 *
 * Light theme only. No dark mode, no theme toggle, no dark variants.
 */
export default function Home() {
  const view = useVismayStore((s) => s.view);

  return (
    <div className="flex min-h-screen flex-col bg-background text-ink">
      <TopBar />
      <div className="flex flex-1 flex-col">
        {view === "home" && <HomeView />}
        {view === "topic" && <TopicView />}
        {view === "my-learning" && <MyLearningView />}
        {view === "journey" && <JourneyView />}
        {view === "connected-concepts" && <ConnectedConceptsView />}
        {view === "library" && <LibraryView />}
        {view === "notes" && <NotesView />}
        {view === "uploads" && <UploadsView />}
      </div>
    </div>
  );
}
