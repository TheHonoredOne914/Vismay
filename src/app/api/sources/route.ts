import { NextRequest, NextResponse } from "next/server";

import { getDemoUserId } from "@/lib/persistence/user";
import {
  findTopicBySlug,
  saveSourceDocument,
  savePassages,
  recordLearningEvent,
  listAllSources,
} from "@/lib/persistence";
import { discoverSources, isSearchConfigured } from "@/lib/search/provider";
import type { SourceDocumentData, SourceKind, SourceTier } from "@/lib/types";

export const runtime = "nodejs";

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

/**
 * GET /api/sources — list all saved sources for the user (across topics).
 */
export async function GET() {
  try {
    const userId = await getDemoUserId();
    const sources = await listAllSources(userId);
    return NextResponse.json({ sources, configured: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}

const VALID_KINDS: SourceKind[] = [
  "constitution",
  "legislation",
  "judgment",
  "textbook",
  "article",
  "paper",
  "video",
  "upload",
  "other",
];

interface SourcesRequestBody {
  query: string;
  topicSlug: string;
  scope?: "light" | "deep";
  kinds?: SourceKind[];
}

/**
 * Heuristic mapping from URL/host hints to a source kind.
 */
function inferKind(candidate: { url: string; host: string; snippet: string }): SourceKind {
  const u = (candidate.url || "").toLowerCase();
  const h = (candidate.host || "").toLowerCase();
  const s = (candidate.snippet || "").toLowerCase();

  if (/constitution|constitutional|fundamental-right|art-\d|article-\d/i.test(u + " " + s)) {
    return "constitution";
  }
  if (/act|bill|ordinance|statute|legislation|gov\.in/i.test(u + " " + h + " " + s)) {
    return "legislation";
  }
  if (/judgment|judgement|court|supremecourt|highcourt|ecsci|case-law/i.test(u + " " + h + " " + s)) {
    return "judgment";
  }
  if (/arxiv|doi|journal|researchgate|semanticscholar/i.test(u + " " + h)) {
    return "paper";
  }
  if (/textbook|springer|wiley|cambridge|oxford|press/i.test(h)) {
    return "textbook";
  }
  if (/youtube|vimeo|youtu\.be/i.test(u + " " + h)) {
    return "video";
  }
  return "article";
}

/**
 * Decide the source tier based on its kind. Primary sources are original
 * legal/instrumental documents; secondary are commentary/analysis.
 */
function tierForKind(kind: SourceKind): SourceTier {
  if (kind === "constitution" || kind === "legislation" || kind === "judgment") {
    return "primary";
  }
  if (kind === "paper" || kind === "textbook") {
    return "secondary";
  }
  return "secondary";
}

/**
 * POST /api/sources — discover and persist sources for a query.
 */
export async function POST(req: NextRequest) {
  try {
    let body: SourcesRequestBody;
    try {
      body = (await req.json()) as SourcesRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Bad request", message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const query = (body.query ?? "").toString().trim();
    if (!query) {
      return NextResponse.json(
        { error: "Bad request", message: "Query is required." },
        { status: 400 }
      );
    }
    if (query.length > 500) {
      return NextResponse.json(
        { error: "Bad request", message: "Query too long (max 500 chars)." },
        { status: 400 }
      );
    }

    const topicSlug = (body.topicSlug ?? "").toString().trim();
    if (!topicSlug) {
      return NextResponse.json(
        { error: "Bad request", message: "topicSlug is required." },
        { status: 400 }
      );
    }

    if (body.kinds) {
      const invalid = body.kinds.filter((k) => !VALID_KINDS.includes(k));
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: "Bad request", message: `Invalid source kinds: ${invalid.join(", ")}` },
          { status: 400 }
        );
      }
    }

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

    const userId = await getDemoUserId();
    const topic = await findTopicBySlug(userId, topicSlug);
    if (!topic) {
      return NextResponse.json(
        { error: "Bad request", message: `Topic '${topicSlug}' not found.` },
        { status: 404 }
      );
    }

    const scope = body.scope === "deep" ? "deep" : "light";
    const fetchPages = scope === "deep" ? 5 : 3;
    const passagesPerSource = scope === "deep" ? 5 : 3;

    const { candidates, coverageNote } = await discoverSources(query, {
      fetchPages,
      passagesPerSource,
    });

    // If the caller provided a kind whitelist, filter candidates by inferred kind.
    const allowedKinds = body.kinds ? new Set(body.kinds) : null;

    const saved: SourceDocumentData[] = [];
    for (const candidate of candidates) {
      const inferredKind = inferKind(candidate);
      if (allowedKinds && !allowedKinds.has(inferredKind)) continue;

      const tier = tierForKind(inferredKind);
      const doc = await saveSourceDocument(userId, {
        topicId: topic.id,
        tier,
        kind: inferredKind,
        title: candidate.title,
        url: candidate.url,
        source: candidate.host,
        publishedDate: candidate.date ?? null,
        snippet: candidate.snippet ?? null,
        fullText: candidate.fetchedText ?? null,
        coverageNote: null,
      });

      // Persist the passages associated with this source.
      if (candidate.passages && candidate.passages.length > 0) {
        await savePassages(doc.id, candidate.passages.map((p) => ({
          id: "", // Will be assigned by the DB.
          passage: p.passage,
          locator: p.locator,
        })));
      }

      // Record a learning event per saved source.
      await recordLearningEvent(userId, {
        type: "source_viewed",
        label: `Viewed source: ${doc.title}`,
        topicId: topic.id,
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
      coverageNote: coverageNote ?? null,
      configured: true,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}
