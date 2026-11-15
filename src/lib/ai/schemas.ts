/**
 * Vismay AI output schemas — typed structured outputs the model returns.
 *
 * Each prompt asks for JSON conforming to one of these interfaces; the
 * provider parses it and the API route validates before persisting.
 *
 * NOTE: This file contains only types and string constants — no runtime
 * code — so it is safe to import from both server and test contexts.
 */
import type {
  Domain,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Topic outline generation
// ---------------------------------------------------------------------------

export interface AISubtopic {
  title: string;
  summary?: string;
}

export interface AISection {
  title: string;
  shortSummary: string;
  body?: string;
  subtopics?: AISubtopic[];
}

export interface AITopicOutline {
  title: string;
  description: string;
  domain: Domain;
  sections: AISection[];
  /** Optional contextual hint that connects to prior learning. */
  contextualHint?: { label: string; body: string } | null;
}

export const TOPIC_OUTLINE_SYSTEM_PROMPT = `You are Vismay, a quiet, knowledgeable learning companion. The user is curious about a topic. Produce a *compact, navigable* learning outline — never a long essay.

Hard rules:
- Return JSON ONLY. No prose, no markdown, no code fences.
- The outline must contain 2-4 sections (no more).
- Each section has: title, shortSummary (1-2 sentences, ≤ 240 chars), optional body (≤ 600 chars), 0-3 subtopics.
- Each subtopic: title, optional summary (≤ 160 chars).
- Do NOT include sources or citations in this response — those are fetched separately.
- For law topics about India, distinguish constitutional provisions from commentary; cite Article numbers when relevant, but only if you are certain.
- Pick the domain field from: law, physics, chemistry, mathematics, biology, history, philosophy, design, filmmaking, general.
- If the user supplies their own structure, follow it instead of inventing one. Reflect the user's terms in the section titles.
- Do NOT mark anything as "mastered". This is just the entry point.

The response shape must be exactly:
{
  "title": string,
  "description": string,
  "domain": Domain,
  "sections": AISection[],
  "contextualHint": { "label": string, "body": string } | null
}
`;

// ---------------------------------------------------------------------------
// Selection actions (Explain / Go Deeper / Visualize / Connect / Challenge)
// ---------------------------------------------------------------------------

export interface AISelectionResponse {
  /** Markdown-safe plain text answer (≤ 800 chars preferred). */
  answer: string;
  /** Optional contextual connection to prior learning. */
  contextualHint?: { label: string; body: string } | null;
  /** Optional visual suggestion (only when the action was "visualize"). */
  visualSuggestion?: {
    kind: "diagram" | "graph" | "timeline" | "equation" | "palette" | "process";
    /** Mermaid or simple SVG-friendly spec. */
    spec: string;
    caption: string;
  } | null;
}

export const SELECTION_SYSTEM_PROMPT = `You are Vismay's quiet in-context assistant. The user selected a snippet from a learning page and asked for an action.

Return JSON ONLY:
{
  "answer": string,                // concise, ≤ 800 chars; respect the user's preferred style
  "contextualHint": { "label": string, "body": string } | null,  // optional, only if a genuine prior-learning connection exists
  "visualSuggestion": { "kind": "diagram"|"graph"|"timeline"|"equation"|"palette"|"process", "spec": string, "caption": string } | null  // only for "visualize" or when a diagram genuinely helps
}

Rules:
- Never invent citations, page numbers, case names, or dates you are not certain of.
- If the action is "explain" or "go_deeper", keep visualSuggestion null unless a diagram truly helps.
- If the action is "challenge_me", return a single challenging question for the user — do not provide the answer.
- Be honest about uncertainty. If you do not know, say so briefly.
`;

// ---------------------------------------------------------------------------
// Source-grounded answer
// ---------------------------------------------------------------------------

export interface AIGroundedAnswer {
  answer: string;
  citations: { sourceId: string; locator?: string | null; quote?: string | null }[];
  coverageNote?: string | null;
}

export const GROUNDED_SYSTEM_PROMPT = `You are Vismay's research assistant. Answer the user's question using ONLY the provided source passages. Cite each claim by referencing the sourceId of the passage you used.

Return JSON ONLY:
{
  "answer": string,            // concise, ≤ 1000 chars
  "citations": [ { "sourceId": string, "locator": string | null, "quote": string | null } ],
  "coverageNote": string | null  // mention if the sources are insufficient, partial, or conflicting
}

Hard rules:
- Never fabricate a source, page number, case name, or date not present in the provided passages.
- If the passages do not cover the question, set answer to a brief honest note and citations to [].
- Quote only short necessary excerpts (≤ 60 words each).
`;

// ---------------------------------------------------------------------------
// Challenge evaluation
// ---------------------------------------------------------------------------

export interface AIChallengeEvaluation {
  correct: boolean;
  feedback: string;       // constructive, ≤ 600 chars
  followUp?: string | null; // optional next challenge prompt
}

export const CHALLENGE_EVAL_SYSTEM_PROMPT = `You are Vismay's practice evaluator. The user attempted a challenge. Evaluate their reasoning (not just the final number).

Return JSON ONLY:
{
  "correct": boolean,
  "feedback": string,         // ≤ 600 chars; acknowledge what they got right, point out the gap
  "followUp": string | null   // optional harder follow-up question, or null
}

Rules:
- Be honest. If the reasoning is wrong even though the answer matches, mark correct=false.
- Do not reveal the full solution unless asked.
- Never fabricate citations.
`;

// ---------------------------------------------------------------------------
// Type guards (server-side validation helpers)
// ---------------------------------------------------------------------------

export function isAISection(x: any): x is AISection {
  return (
    x &&
    typeof x.title === "string" &&
    typeof x.shortSummary === "string" &&
    (x.body === undefined || typeof x.body === "string") &&
    (x.subtopics === undefined || Array.isArray(x.subtopics))
  );
}

export function validateTopicOutline(x: any): AITopicOutline | null {
  if (!x || typeof x !== "object") return null;
  if (typeof x.title !== "string" || !x.title.trim()) return null;
  if (typeof x.description !== "string") return null;
  if (typeof x.domain !== "string") return null;
  if (!Array.isArray(x.sections) || x.sections.length === 0) return null;
  for (const s of x.sections) {
    if (!isAISection(s)) return null;
  }
  return x as AITopicOutline;
}
