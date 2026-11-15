import { NextRequest, NextResponse } from "next/server";

import { getDemoUserId } from "@/lib/persistence/user";
import {
  loadPreferences,
  findTopicBySlug,
  createNote,
  saveSourceDocument,
  savePassages,
  recordLearningEvent,
} from "@/lib/persistence";
import { chatJson, isAIConfigured } from "@/lib/ai/provider";
import { SELECTION_SYSTEM_PROMPT, type AISelectionResponse } from "@/lib/ai/schemas";
import { discoverSources, isSearchConfigured } from "@/lib/search/provider";
import { rateLimit } from "@/lib/rate-limit";
import type { SourceDocumentData, SourceKind, SourceTier } from "@/lib/types";

export const runtime = "nodejs";

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

type SelectionAction =
  | "explain"
  | "go_deeper"
  | "visualize"
  | "find_sources"
  | "challenge_me"
  | "connect"
  | "save";

const VALID_ACTIONS: SelectionAction[] = [
  "explain",
  "go_deeper",
  "visualize",
  "find_sources",
  "challenge_me",
  "connect",
  "save",
];

interface SelectionRequestBody {
  text: string;
  action: SelectionAction;
  topicSlug?: string;
  sectionId?: string;
}

function inferKind(host: string, url: string, snippet: string): SourceKind {
  const u = (url || "").toLowerCase();
  const h = (host || "").toLowerCase();
  const s = (snippet || "").toLowerCase();
  if (/constitution|article-\d|fundamental-right/i.test(u + " " + s)) return "constitution";
  if (/act|bill|ordinance|statute|legislation|gov\.in/i.test(u + " " + h + " " + s)) return "legislation";
  if (/judgment|court|case-law/i.test(u + " " + h + " " + s)) return "judgment";
  if (/arxiv|doi|journal/i.test(u + " " + h)) return "paper";
  if (/textbook|springer|wiley|cambridge/i.test(h)) return "textbook";
  if (/youtube|vimeo/i.test(u + " " + h)) return "video";
  return "article";
}

function tierForKind(kind: SourceKind): SourceTier {
  if (kind === "constitution" || kind === "legislation" || kind === "judgment") {
    return "primary";
  }
  return "secondary";
}

/**
 * POST /api/assistant/selection — handle a text-selection action.
 *
 * Rate-limited to 30/min per IP.
 */
export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rlKey = `selection:${ip}`;
    if (!rateLimit(rlKey, 30, 60 * 1000)) {
      return NextResponse.json(
        { error: "Rate limited", message: "Too many selection requests. Please wait a moment." },
        { status: 429 }
      );
    }

    let body: SelectionRequestBody;
    try {
      body = (await req.json()) as SelectionRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Bad request", message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const text = (body.text ?? "").toString().trim();
    if (!text) {
      return NextResponse.json(
        { error: "Bad request", message: "Text is required." },
        { status: 400 }
      );
    }
    if (text.length > 4000) {
      return NextResponse.json(
        { error: "Bad request", message: "Selected text too long (max 4000 chars)." },
        { status: 400 }
      );
    }

    const action = body.action as SelectionAction;
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: "Bad request", message: `Invalid action: ${String(body.action)}` },
        { status: 400 }
      );
    }

    const userId = await getDemoUserId();

    // Resolve topicId if slug was provided (used for many actions).
    let topicId: string | undefined;
    if (body.topicSlug) {
      const t = await findTopicBySlug(userId, body.topicSlug);
      if (t) topicId = t.id;
    }

    // ---------------------------------------------------------------------
    // action === "save" — create a saved_excerpt note.
    // ---------------------------------------------------------------------
    if (action === "save") {
      const note = await createNote(userId, {
        kind: "saved_excerpt",
        body: text,
        excerpt: text,
        excerptLocator: body.sectionId ?? undefined,
        topicId,
      });
      await recordLearningEvent(userId, {
        type: "note_saved",
        label: "Saved excerpt",
        detail: text.slice(0, 200),
        topicId,
        sectionId: body.sectionId ?? undefined,
      });
      return NextResponse.json({ note });
    }

    // ---------------------------------------------------------------------
    // action === "find_sources" — discover sources, persist for the topic.
    // ---------------------------------------------------------------------
    if (action === "find_sources") {
      if (!isSearchConfigured()) {
        return NextResponse.json(
          {
            configured: false,
            sources: [],
            error: "Search provider not configured.",
          },
          { status: 200 }
        );
      }
      const { candidates, coverageNote } = await discoverSources(text, {
        fetchPages: 3,
        passagesPerSource: 3,
      });

      const saved: SourceDocumentData[] = [];
      for (const candidate of candidates) {
        if (!topicId) {
          // If no topic context, still record a SourceDocument but skip persistence.
          saved.push({
            id: "",
            tier: tierForKind(inferKind(candidate.host, candidate.url, candidate.snippet)),
            kind: inferKind(candidate.host, candidate.url, candidate.snippet),
            title: candidate.title,
            url: candidate.url,
            source: candidate.host,
            publishedDate: candidate.date ?? null,
            snippet: candidate.snippet ?? null,
            coverageNote: null,
            verified: false,
          });
          continue;
        }
        const kind = inferKind(candidate.host, candidate.url, candidate.snippet);
        const doc = await saveSourceDocument(userId, {
          topicId,
          tier: tierForKind(kind),
          kind,
          title: candidate.title,
          url: candidate.url,
          source: candidate.host,
          publishedDate: candidate.date ?? null,
          snippet: candidate.snippet ?? null,
          fullText: candidate.fetchedText ?? null,
        });
        if (candidate.passages && candidate.passages.length > 0) {
          await savePassages(
            doc.id,
            candidate.passages.map((p) => ({
              id: "",
              passage: p.passage,
              locator: p.locator,
            }))
          );
        }
        await recordLearningEvent(userId, {
          type: "source_viewed",
          label: `Viewed source: ${doc.title}`,
          topicId,
          sourceId: doc.id,
        });
        saved.push({
          id: doc.id,
          tier: doc.tier as SourceTier,
          kind: doc.kind as SourceKind,
          title: doc.title,
          url: doc.url,
          source: doc.source,
          publishedDate: doc.publishedDate,
          snippet: doc.snippet,
          coverageNote: doc.coverageNote,
          verified: doc.verified,
        });
      }

      return NextResponse.json({
        sources: saved,
        coverageNote,
        configured: true,
      });
    }

    // ---------------------------------------------------------------------
    // Other actions — chatJson for explain/go_deeper/visualize/challenge_me/connect
    // ---------------------------------------------------------------------
    if (!isAIConfigured()) {
      return NextResponse.json(
        {
          configured: false,
          error:
            "AI provider not configured. Set ZAI_API_KEY or OPENAI_API_KEY in .env",
        },
        { status: 200 }
      );
    }

    const preferences = await loadPreferences(userId);

    const result = await chatJson<AISelectionResponse>(
      [
        {
          role: "user",
          content: JSON.stringify({
            selectedText: text,
            action,
            topicSlug: body.topicSlug,
            sectionId: body.sectionId,
            preferences,
          }),
        },
      ],
      {
        systemPrompt: SELECTION_SYSTEM_PROMPT,
        json: true,
        temperature: 0.4,
      }
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "AI returned an invalid response. Please try again.",
          raw: result.raw,
        },
        { status: 502 }
      );
    }

    const response: AISelectionResponse = result.data;

    // Record the appropriate learning event.
    const eventType =
      action === "visualize"
        ? "visual_viewed"
        : action === "challenge_me"
          ? "challenge_attempted"
          : "explanation_requested";
    await recordLearningEvent(userId, {
      type: eventType,
      label: `Selection action: ${action}`,
      detail: text.slice(0, 200),
      topicId,
      sectionId: body.sectionId ?? undefined,
    });

    return NextResponse.json({ response, configured: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}
