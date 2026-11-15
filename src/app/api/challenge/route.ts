import { NextRequest, NextResponse } from "next/server";

import { getDemoUserId } from "@/lib/persistence/user";
import {
  findTopicBySlug,
  listChallenges,
  createChallenge,
} from "@/lib/persistence";
import { chatJson, isAIConfigured } from "@/lib/ai/provider";
import type { ChallengeData } from "@/lib/types";

export const runtime = "nodejs";

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

type Difficulty = "conceptual" | "derivational" | "problem_solving";

const VALID_DIFFICULTIES: Difficulty[] = [
  "conceptual",
  "derivational",
  "problem_solving",
];

const CHALLENGE_GEN_PROMPT = `You are Vismay's practice-question generator. The user wants a single challenging question on a topic at the requested difficulty level.

Return JSON ONLY:
{
  "prompt": string,            // the challenge question for the user
  "expected": string | null    // optional private answer key / reasoning kept for evaluation only
}

Rules:
- "conceptual": ask the user to explain a concept in their own words or identify a tension.
- "derivational": ask the user to derive a result step by step.
- "problem_solving": give a small scenario and ask the user to apply the concept.
- Do NOT reveal the expected answer in the prompt itself.
- One question only, concise, ≤ 400 chars for the prompt.`;

/**
 * GET /api/challenge?topicSlug=... — list challenges for a topic.
 */
export async function GET(req: NextRequest) {
  try {
    const topicSlug = req.nextUrl.searchParams.get("topicSlug");
    if (!topicSlug) {
      return NextResponse.json(
        { error: "Bad request", message: "topicSlug query param is required." },
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

    const challenges: ChallengeData[] = await listChallenges(userId, topic.id);
    return NextResponse.json({ challenges });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}

interface ChallengeRequestBody {
  topicSlug: string;
  difficulty: Difficulty;
}

/**
 * POST /api/challenge — generate a single challenge for a topic.
 *
 * Body: { topicSlug, difficulty }
 */
export async function POST(req: NextRequest) {
  try {
    let body: ChallengeRequestBody;
    try {
      body = (await req.json()) as ChallengeRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Bad request", message: "Invalid JSON body." },
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
    const difficulty = body.difficulty as Difficulty;
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json(
        {
          error: "Bad request",
          message: `Invalid difficulty: ${String(body.difficulty)}`,
        },
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
    const topic = await findTopicBySlug(userId, topicSlug);
    if (!topic) {
      return NextResponse.json(
        { error: "Not found", message: "Topic not found." },
        { status: 404 }
      );
    }

    // Build a context summary of the topic for the AI.
    const topicSummary = `${topic.title}: ${topic.description ?? ""}`.trim();

    const result = await chatJson<{ prompt: string; expected: string | null }>(
      [
        {
          role: "user",
          content: JSON.stringify({
            topic: topicSummary,
            difficulty,
          }),
        },
      ],
      {
        systemPrompt: CHALLENGE_GEN_PROMPT,
        json: true,
        temperature: 0.6,
      }
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "AI returned an invalid challenge. Please try again.",
          raw: result.raw,
        },
        { status: 502 }
      );
    }

    const challengePrompt = (result.data.prompt ?? "").toString().trim();
    if (!challengePrompt) {
      return NextResponse.json(
        { error: "AI returned an empty challenge prompt." },
        { status: 502 }
      );
    }

    const challenge: ChallengeData = await createChallenge(userId, topic.id, {
      difficulty,
      prompt: challengePrompt,
      expected: result.data.expected ?? undefined,
    });

    return NextResponse.json({ challenge, configured: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}
