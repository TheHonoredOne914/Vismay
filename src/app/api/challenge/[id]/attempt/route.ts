import { NextRequest, NextResponse } from "next/server";

import { getDemoUserId } from "@/lib/persistence/user";
import { appendChallengeAttempt } from "@/lib/persistence";
import { chatJson, isAIConfigured } from "@/lib/ai/provider";
import {
  CHALLENGE_EVAL_SYSTEM_PROMPT,
  type AIChallengeEvaluation,
} from "@/lib/ai/schemas";
import { db } from "@/lib/db";
import type { ChallengeData } from "@/lib/types";

export const runtime = "nodejs";

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

interface AttemptRequestBody {
  attempt: string;
}

/**
 * POST /api/challenge/[id]/attempt — evaluate an attempt.
 *
 * Body: { attempt: string }
 * Returns: { challenge: ChallengeData, evaluation: AIChallengeEvaluation }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || id.length > 64) {
      return NextResponse.json(
        { error: "Bad request", message: "Invalid id." },
        { status: 400 }
      );
    }

    let body: AttemptRequestBody;
    try {
      body = (await req.json()) as AttemptRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Bad request", message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const attemptText = (body.attempt ?? "").toString().trim();
    if (!attemptText) {
      return NextResponse.json(
        { error: "Bad request", message: "attempt is required." },
        { status: 400 }
      );
    }
    if (attemptText.length > 8000) {
      return NextResponse.json(
        { error: "Bad request", message: "Attempt too long (max 8000 chars)." },
        { status: 400 }
      );
    }

    if (!isAIConfigured()) {
      return NextResponse.json(
        {
          configured: false,
          error: "AI provider not configured. Set ZAI_API_KEY or OPENAI_API_KEY in .env",
        },
        { status: 200 }
      );
    }

    const userId = await getDemoUserId();

    // Fetch the challenge row (we need userId scoping + expectedJson).
    const challengeRow = await db.challenge.findUnique({
      where: { id },
    });
    if (!challengeRow || challengeRow.userId !== userId) {
      return NextResponse.json(
        { error: "Not found", message: "Challenge not found." },
        { status: 404 }
      );
    }

    // Compose prompt — provide the challenge prompt + the user's attempt.
    const userContent = JSON.stringify({
      challengePrompt: challengeRow.prompt,
      expectedKey: challengeRow.expectedJson ?? null,
      userAttempt: attemptText,
      difficulty: challengeRow.difficulty,
      instruction:
        "Evaluate the user's attempt. Be honest about correctness. If their reasoning is wrong even though the final answer matches, mark correct=false.",
    });

    const result = await chatJson<AIChallengeEvaluation>(
      [{ role: "user", content: userContent }],
      {
        systemPrompt: CHALLENGE_EVAL_SYSTEM_PROMPT,
        json: true,
        temperature: 0.3,
      }
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "AI returned an invalid evaluation. Please try again.",
          raw: result.raw,
        },
        { status: 502 }
      );
    }

    const evaluation: AIChallengeEvaluation = result.data;
    const challenge: ChallengeData = await appendChallengeAttempt(userId, id, {
      attempt: attemptText,
      feedback: evaluation.feedback,
      correct: evaluation.correct,
      at: new Date().toISOString(),
    });

    return NextResponse.json({ challenge, evaluation });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}
