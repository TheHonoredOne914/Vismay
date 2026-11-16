/**
 * Shared Vismay types — used across client, server, and AI schemas.
 * Keep this file dependency-free so it can be imported anywhere.
 */

export type ViewName =
  | "home"
  | "topic"
  | "my-learning"
  | "journey"
  | "connected-concepts"
  | "library"
  | "notes"
  | "uploads";

export type ExplanationStyle = "concise" | "examples" | "detailed" | "exploratory";
export type TechnicalLevel = "beginner" | "balanced" | "advanced";

export type Domain =
  | "law"
  | "physics"
  | "chemistry"
  | "mathematics"
  | "biology"
  | "history"
  | "philosophy"
  | "design"
  | "filmmaking"
  | "general";

export interface UserPreferencesData {
  explanationStyle: ExplanationStyle;
  technicalLevel: TechnicalLevel;
  showDiagrams: boolean;
  showCitations: boolean;
  onboardingDone: boolean;
}

// ---------------------------------------------------------------------------
// Topic structure
// ---------------------------------------------------------------------------

export interface Subtopic {
  id: string;
  title: string;
  summary?: string;
  body?: string;
  expanded?: boolean;
}

export interface TopicSectionData {
  id: string;
  orderIndex: number;
  title: string;
  shortSummary: string;
  body?: string;
  subtopics?: Subtopic[];
  contextualHint?: ContextualHintData;
}

export interface ContextualHintData {
  /** Short label like "Connects to Fundamental Rights, which you studied before." */
  label: string;
  /** Body of the explanation shown when the user opens the assistant drawer. */
  body: string;
  /** Optional concept id this hint references (for the connected-concepts graph). */
  conceptId?: string;
}

export interface TopicData {
  id: string;
  title: string;
  slug: string;
  description: string;
  domain: Domain;
  sections: TopicSectionData[];
  userProvidedStructure: boolean;
  lastSectionId?: string | null;
  savedForLater: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Learning journey
// ---------------------------------------------------------------------------

export type LearningEventType =
  | "topic_started"
  | "section_opened"
  | "subtopic_explored"
  | "source_viewed"
  | "explanation_requested"
  | "visual_viewed"
  | "challenge_attempted"
  | "note_saved"
  | "discovery_followed"
  | "topic_resumed";

export interface LearningEvent {
  id: string;
  occurredAt: string;
  type: LearningEventType;
  label: string;
  detail?: string | null;
  parentId?: string | null;
  topicId?: string | null;
  topicTitle?: string | null;
  sectionId?: string | null;
  sourceId?: string | null;
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export type SourceTier =
  | "primary"
  | "secondary"
  | "commentary"
  | "uncertain"
  | "conflicting"
  | "unchecked";

export type SourceKind =
  | "constitution"
  | "legislation"
  | "judgment"
  | "textbook"
  | "article"
  | "paper"
  | "video"
  | "upload"
  | "other";

export interface SourceDocumentData {
  id: string;
  tier: SourceTier;
  kind: SourceKind;
  title: string;
  url?: string | null;
  source?: string | null;
  publishedDate?: string | null;
  snippet?: string | null;
  coverageNote?: string | null;
  verified: boolean;
}

export interface SourcePassageData {
  id: string;
  passage: string;
  locator?: string | null;
}

// ---------------------------------------------------------------------------
// Assistant
// ---------------------------------------------------------------------------

export interface AssistantMessage {
  role: "user" | "assistant" | "system";
  content: string;
  /** Optional citation references for this message. */
  citations?: {
    sourceId: string;
    title: string;
    url?: string | null;
    locator?: string | null;
  }[];
}

// ---------------------------------------------------------------------------
// Connected concepts graph
// ---------------------------------------------------------------------------

export interface ConceptNodeData {
  id: string;
  title: string;
  description?: string;
  domain?: string;
}

export interface ConceptEdgeData {
  id: string;
  fromId: string;
  toId: string;
  relationship: "prerequisite" | "related" | "extends" | "contrasts";
  note?: string;
}

// ---------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------

export interface ChallengeAttempt {
  attempt: string;
  feedback: string;
  correct: boolean;
  at: string;
}

export interface ChallengeData {
  id: string;
  difficulty: "conceptual" | "derivational" | "problem_solving";
  prompt: string;
  attempts: ChallengeAttempt[];
  solved: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Notes & uploads
// ---------------------------------------------------------------------------

export interface NoteData {
  id: string;
  title?: string | null;
  body: string;
  kind: "manual" | "saved_excerpt" | "assistant_summary";
  excerpt?: string | null;
  excerptLocator?: string | null;
  topicId?: string | null;
  topicTitle?: string | null;
  sourceId?: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UploadData {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  status: "pending" | "ready" | "failed";
  errorMessage?: string | null;
  topicId?: string | null;
  createdAt: string;
}
