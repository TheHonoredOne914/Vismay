/**
 * Vismay client-side learning store.
 *
 * Holds the active view, the current topic, assistant drawer state, and the
 * in-memory mirror of learning events (so the homepage can render the
 * timeline instantly without a refetch).
 */
"use client";

import { create } from "zustand";
import type {
  ViewName,
  TopicData,
  LearningEvent,
  UserPreferencesData,
} from "@/lib/types";

export interface VismayState {
  // Navigation
  view: ViewName;
  /** Topic slug when view === "topic" */
  currentTopicSlug: string | null;
  /** Active section id within the topic (for the left sidebar highlight) */
  activeSectionId: string | null;
  /** Whether the contextual assistant drawer is open */
  drawerOpen: boolean;
  /** Optional context for the drawer (which hint triggered it) */
  drawerContext: { title: string; body: string } | null;

  // Data
  currentTopic: TopicData | null;
  learningEvents: LearningEvent[];
  lastVisited: { topic: TopicData; lastEvent?: LearningEvent } | null;
  preferences: UserPreferencesData | null;
  onboardingOpen: boolean;

  // Loading
  loadingTopic: boolean;
  topicError: string | null;

  // Actions
  setView: (view: ViewName) => void;
  openTopic: (slug: string) => void;
  closeTopic: () => void;
  setCurrentTopic: (t: TopicData | null) => void;
  setActiveSection: (id: string | null) => void;
  openDrawer: (ctx?: { title: string; body: string }) => void;
  closeDrawer: () => void;
  setLearningEvents: (e: LearningEvent[]) => void;
  prependLearningEvent: (e: LearningEvent) => void;
  setLastVisited: (v: { topic: TopicData; lastEvent?: LearningEvent } | null) => void;
  setPreferences: (p: UserPreferencesData | null) => void;
  setOnboardingOpen: (open: boolean) => void;
  setLoadingTopic: (b: boolean) => void;
  setTopicError: (e: string | null) => void;
}

export const useVismayStore = create<VismayState>((set, get) => ({
  view: "home",
  currentTopicSlug: null,
  activeSectionId: null,
  drawerOpen: false,
  drawerContext: null,

  currentTopic: null,
  learningEvents: [],
  lastVisited: null,
  preferences: null,
  onboardingOpen: false,

  loadingTopic: false,
  topicError: null,

  setView: (view) => set({ view }),
  openTopic: (slug) =>
    set({
      view: "topic",
      currentTopicSlug: slug,
      drawerOpen: false,
      activeSectionId: null,
    }),
  closeTopic: () =>
    set({
      view: "home",
      currentTopicSlug: null,
      currentTopic: null,
      drawerOpen: false,
      activeSectionId: null,
    }),
  setCurrentTopic: (t) => set({ currentTopic: t }),
  setActiveSection: (id) => set({ activeSectionId: id }),
  openDrawer: (ctx) => set({ drawerOpen: true, drawerContext: ctx ?? get().drawerContext }),
  closeDrawer: () => set({ drawerOpen: false }),
  setLearningEvents: (e) => set({ learningEvents: e }),
  prependLearningEvent: (e) =>
    set((s) => ({ learningEvents: [...s.learningEvents, e] })),
  setLastVisited: (v) => set({ lastVisited: v }),
  setPreferences: (p) => set({ preferences: p }),
  setOnboardingOpen: (open) => set({ onboardingOpen: open }),
  setLoadingTopic: (b) => set({ loadingTopic: b }),
  setTopicError: (e) => set({ topicError: e }),
}));

/**
 * Selection menu state — separate from the main store so multiple
 * SelectionMenu instances (one per page) can share the same singleton.
 */
interface SelectionMenuState {
  open: boolean;
  text: string;
  rect: DOMRect | null;
  topicSlug: string | null;
  sectionId: string | null;
  show: (text: string, rect: DOMRect, ctx: { topicSlug?: string; sectionId?: string }) => void;
  hide: () => void;
}

export const useSelectionMenu = create<SelectionMenuState>((set) => ({
  open: false,
  text: "",
  rect: null,
  topicSlug: null,
  sectionId: null,
  show: (text, rect, ctx) =>
    set({
      open: true,
      text,
      rect,
      topicSlug: ctx.topicSlug ?? null,
      sectionId: ctx.sectionId ?? null,
    }),
  hide: () => set({ open: false, text: "", rect: null }),
}));
