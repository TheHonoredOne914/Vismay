import { NextResponse } from "next/server";

import { getDemoUserId } from "@/lib/persistence/user";
import { getLastVisitedPoint } from "@/lib/persistence";
import type { TopicData, LearningEvent } from "@/lib/types";

export const runtime = "nodejs";

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

/**
 * GET /api/last-visited — return the user's last visited topic + event.
 *
 * Returns: { topic: TopicData | null, lastEvent: LearningEvent | null }
 */
export async function GET() {
  try {
    const userId = await getDemoUserId();
    const result = await getLastVisitedPoint(userId);
    return NextResponse.json({
      topic: (result.topic as TopicData | null) ?? null,
      lastEvent: (result.lastEvent as LearningEvent | null) ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}
