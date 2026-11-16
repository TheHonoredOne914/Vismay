import { NextRequest, NextResponse } from "next/server";

import { getDemoUserId } from "@/lib/persistence/user";
import {
  listLearningEvents,
  recordLearningEvent,
  findTopicBySlug,
  getLastVisitedPoint,
} from "@/lib/persistence";
import type { LearningEvent, LearningEventType, TopicData } from "@/lib/types";

export const runtime = "nodejs";

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

const VALID_TYPES: LearningEventType[] = [
  "topic_started",
  "section_opened",
  "subtopic_explored",
  "source_viewed",
  "explanation_requested",
  "visual_viewed",
  "challenge_attempted",
  "note_saved",
  "discovery_followed",
  "topic_resumed",
];

/**
 * GET /api/learning — list learning events (chronological) + last visited point.
 */
export async function GET() {
  try {
    const userId = await getDemoUserId();
    const events: LearningEvent[] = await listLearningEvents(userId);
    const lastVisited = await getLastVisitedPoint(userId);

    return NextResponse.json({
      events,
      lastVisited:
        lastVisited.topic && lastVisited.lastEvent
          ? {
              topic: lastVisited.topic as TopicData,
              lastEvent: lastVisited.lastEvent as LearningEvent,
            }
          : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}

interface LearningRequestBody {
  type: LearningEventType;
  label: string;
  detail?: string | null;
  topicSlug?: string | null;
  sectionId?: string | null;
  sourceId?: string | null;
  parentId?: string | null;
}

/**
 * POST /api/learning — record a new learning event.
 *
 * Body: { type, label, detail?, topicSlug?, sectionId?, sourceId?, parentId? }
 * Resolves `topicId` from `topicSlug`.
 */
export async function POST(req: NextRequest) {
  try {
    let body: LearningRequestBody;
    try {
      body = (await req.json()) as LearningRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Bad request", message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const type = body.type as LearningEventType;
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Bad request", message: `Invalid event type: ${String(body.type)}` },
        { status: 400 }
      );
    }

    const label = (body.label ?? "").toString().trim();
    if (!label) {
      return NextResponse.json(
        { error: "Bad request", message: "Label is required." },
        { status: 400 }
      );
    }
    if (label.length > 300) {
      return NextResponse.json(
        { error: "Bad request", message: "Label too long (max 300 chars)." },
        { status: 400 }
      );
    }

    const userId = await getDemoUserId();

    // Resolve topicId from slug if provided.
    let topicId: string | undefined;
    if (body.topicSlug) {
      const t = await findTopicBySlug(userId, body.topicSlug);
      if (t) topicId = t.id;
    }

    const event = await recordLearningEvent(userId, {
      type,
      label,
      detail: body.detail ?? undefined,
      topicId,
      sectionId: body.sectionId ?? undefined,
      sourceId: body.sourceId ?? undefined,
      parentId: body.parentId ?? undefined,
    });

    return NextResponse.json({ event });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}
