import { NextRequest, NextResponse } from "next/server";

import { getDemoUserId } from "@/lib/persistence/user";
import { getUpload } from "@/lib/persistence";
import { chatJson, isAIConfigured } from "@/lib/ai/provider";
import {
  GROUNDED_SYSTEM_PROMPT,
  type AIGroundedAnswer,
} from "@/lib/ai/schemas";
import { splitIntoPassages, rankPassages } from "@/lib/search/provider";

export const runtime = "nodejs";

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

interface AskRequestBody {
  question: string;
}

/**
 * POST /api/uploads/[id]/ask — source-based Q&A on an uploaded document.
 *
 * Body: { question: string }
 *
 * Splits the upload's extractedText into passages, ranks them by query
 * relevance, takes top 5, and asks the model to answer grounded in those
 * passages with citations.
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

    let body: AskRequestBody;
    try {
      body = (await req.json()) as AskRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Bad request", message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const question = (body.question ?? "").toString().trim();
    if (!question) {
      return NextResponse.json(
        { error: "Bad request", message: "question is required." },
        { status: 400 }
      );
    }
    if (question.length > 1000) {
      return NextResponse.json(
        { error: "Bad request", message: "question too long (max 1000 chars)." },
        { status: 400 }
      );
    }

    const userId = await getDemoUserId();
    const upload = await getUpload(userId, id);
    if (!upload) {
      return NextResponse.json(
        { error: "Not found", message: "Upload not found." },
        { status: 404 }
      );
    }

    if (!upload.extractedText) {
      return NextResponse.json(
        {
          error:
            "This document has not been indexed yet. Upload a plain-text or markdown file to enable Q&A.",
        },
        { status: 409 }
      );
    }

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

    // Split into passages and rank by query relevance.
    const passages = splitIntoPassages(upload.extractedText, 180, 30);
    const ranked = rankPassages(question, passages)
      .slice(0, 5)
      .filter((p) => p.score > 0);

    if (ranked.length === 0) {
      // Fall back to the first few passages regardless of score.
      const fallback = passages.slice(0, 5).map((p) => ({ ...p, score: 0 }));
      if (fallback.length === 0) {
        return NextResponse.json({
          answer: "No content available to answer this question.",
          citations: [],
          coverageNote: "The document is empty.",
        });
      }
      return await runGroundedChat(id, question, fallback);
    }

    return await runGroundedChat(id, question, ranked);
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}

async function runGroundedChat(
  uploadId: string,
  question: string,
  passages: { passage: string; locator: string; score: number }[]
) {
  // Compose the grounded prompt. Passages are quoted, NOT executed as
  // instructions — the system prompt forbids the model from treating them
  // as commands.
  const passageBlock = passages
    .map(
      (p, i) =>
        `[${i + 1}] (sourceId="${uploadId}", locator="${p.locator}")\n""${p.passage}""`
    )
    .join("\n\n");

  const userContent = JSON.stringify({
    question,
    passages: passageBlock,
    instruction:
      "Answer using ONLY the passages above. Cite each claim with { sourceId, locator, quote }. If the passages are insufficient, return coverageNote and an honest answer.",
  });

  const result = await chatJson<AIGroundedAnswer>(
    [{ role: "user", content: userContent }],
    {
      systemPrompt: GROUNDED_SYSTEM_PROMPT,
      json: true,
      temperature: 0.2,
    }
  );

  if (!result.ok) {
    return NextResponse.json(
      {
        error: "AI returned an invalid grounded answer. Please try again.",
        raw: result.raw,
      },
      { status: 502 }
    );
  }

  const answer: AIGroundedAnswer = result.data;
  return NextResponse.json({
    answer: answer.answer,
    citations: answer.citations ?? [],
    coverageNote: answer.coverageNote ?? null,
  });
}
