import { NextRequest, NextResponse } from "next/server";

import { getDemoUserId } from "@/lib/persistence/user";
import { findTopicBySlug, serializeTopic, recordLearningEvent } from "@/lib/persistence";
import type { TopicData } from "@/lib/types";

export const runtime = "nodejs";

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

function isValidSlug(slug: string): boolean {
  return typeof slug === "string" && slug.length > 0 && slug.length <= 120 && /^[a-z0-9-]+$/.test(slug);
}

/**
 * GET /api/topic/[slug]?recordView=true
 *
 * Fetch a persisted topic by slug. Optionally record a `topic_resumed`
 * learning event when `recordView=true` is passed.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { error: "Bad request", message: "Invalid slug." },
        { status: 400 }
      );
    }

    const userId = await getDemoUserId();
    const row = await findTopicBySlug(userId, slug);
    if (!row) {
      return NextResponse.json(
        { error: "Not found", message: "Topic not found." },
        { status: 404 }
      );
    }

    const topic: TopicData = serializeTopic(row);

    const recordView = req.nextUrl.searchParams.get("recordView") === "true";
    if (recordView) {
      await recordLearningEvent(userId, {
        type: "topic_resumed",
        label: `Resumed: ${topic.title}`,
        topicId: topic.id,
      });
    }

    return NextResponse.json({ topic });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}
