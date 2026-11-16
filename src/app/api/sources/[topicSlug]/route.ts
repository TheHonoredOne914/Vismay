import { NextRequest, NextResponse } from "next/server";

import { getDemoUserId } from "@/lib/persistence/user";
import {
  findTopicBySlug,
  listSourcesForTopic,
  listPassagesForTopic,
} from "@/lib/persistence";
import type { SourceDocumentData, SourcePassageData } from "@/lib/types";

export const runtime = "nodejs";

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

/**
 * GET /api/sources/[topicSlug] — list saved sources + passages for a topic.
 *
 * Returns: { sources: SourceDocumentData[], passages: { sourceId, sourceTitle,
 *          sourceUrl, sourceTier, sourceKind, passages: SourcePassageData[] }[] }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ topicSlug: string }> }
) {
  try {
    const { topicSlug } = await params;
    if (!topicSlug || topicSlug.length > 120) {
      return NextResponse.json(
        { error: "Bad request", message: "Invalid topic slug." },
        { status: 400 }
      );
    }

    const userId = await getDemoUserId();
    const topic = await findTopicBySlug(userId, topicSlug);
    if (!topic) {
      return NextResponse.json(
        { error: "Not found", message: "Topic not found." },
        { status: 404 }
      );
    }

    const sources: SourceDocumentData[] = await listSourcesForTopic(topic.id);
    const passages = await listPassagesForTopic(topic.id);

    // Normalize passage rows.
    const normalizedPassages = passages.map((p) => ({
      sourceId: p.sourceId,
      sourceTitle: p.sourceTitle,
      sourceUrl: p.sourceUrl,
      sourceTier: p.sourceTier,
      sourceKind: p.sourceKind,
      passages: p.passages as SourcePassageData[],
    }));

    return NextResponse.json({
      sources,
      passages: normalizedPassages,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}
