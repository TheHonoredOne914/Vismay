import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { getDemoUserId } from "@/lib/persistence/user";
import {
  loadPreferences,
  listTopics,
  upsertTopic,
  recordLearningEvent,
  ensureConceptNode,
} from "@/lib/persistence";
import { chatJson, isAIConfigured } from "@/lib/ai/provider";
import {
  TOPIC_OUTLINE_SYSTEM_PROMPT,
  validateTopicOutline,
  type AITopicOutline,
  type AISection,
} from "@/lib/ai/schemas";
import { rateLimit } from "@/lib/rate-limit";
import type { TopicData, Subtopic, Domain } from "@/lib/types";

export const runtime = "nodejs";

const VALID_DOMAINS: Domain[] = [
  "law",
  "physics",
  "chemistry",
  "mathematics",
  "biology",
  "history",
  "philosophy",
  "design",
  "filmmaking",
  "general",
];

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

/**
 * GET /api/topic — list all topics for the demo user.
 */
export async function GET() {
  try {
    const userId = await getDemoUserId();
    const topics: TopicData[] = await listTopics(userId);
    return NextResponse.json({ topics });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}

interface UserStructureSection {
  title: string;
  subtopics?: string[];
}

interface TopicRequestBody {
  query: string;
  userStructure?: { sections: UserStructureSection[] } | null;
}

/**
 * POST /api/topic — generate (or refresh) a topic outline.
 *
 * Body: { query: string; userStructure?: { sections: { title, subtopics? }[] } | null }
 *
 * - If `userStructure` is provided, we ask the AI to fill in `shortSummary`
 *   and `body` for each section, but keep the user's titles.
 * - Otherwise, we ask the AI to invent the outline from scratch.
 *
 * Rate-limited to 20/min per IP.
 */
export async function POST(req: NextRequest) {
  try {
    // --- Rate limit (20/min per IP) -----------------------------------------
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rlKey = `topic:${ip}`;
    if (!rateLimit(rlKey, 20, 60 * 1000)) {
      return NextResponse.json(
        { error: "Rate limited", message: "Too many topic requests. Please wait a moment." },
        { status: 429 }
      );
    }

    // --- Parse body ----------------------------------------------------------
    let body: TopicRequestBody;
    try {
      body = (await req.json()) as TopicRequestBody;
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

    const userId = await getDemoUserId();
    const preferences = await loadPreferences(userId);

    // --- Compose AI request -------------------------------------------------
    let outline: AITopicOutline | null = null;
    let rawFallback: string | undefined;

    const userStructure = body.userStructure?.sections?.length
      ? body.userStructure.sections
      : null;

    if (userStructure) {
      // Build a request that asks the model to fill in shortSummary + body
      // while honoring the user-supplied section titles & subtopics.
      const sectionSpec = userStructure.map((s, i) => ({
        index: i,
        title: s.title,
        subtopics: s.subtopics ?? [],
      }));

      const result = await chatJson<AITopicOutline>(
        [
          {
            role: "user",
            content: JSON.stringify({
              query,
              preferences,
              userStructure: sectionSpec,
              instruction:
                "Follow the user-supplied structure exactly. Use the section titles and subtopics verbatim. Fill in shortSummary and body for each section. Pick the most fitting domain.",
            }),
          },
        ],
        {
          systemPrompt: TOPIC_OUTLINE_SYSTEM_PROMPT,
          json: true,
          temperature: 0.5,
        }
      );

      if (!result.ok) {
        return NextResponse.json(
          {
            error: "AI returned an invalid outline. Please try rephrasing your question.",
            raw: result.raw,
          },
          { status: 502 }
        );
      }
      outline = result.data;

      // Force the model to honor user-supplied titles/subtopics.
      outline = reconcileUserStructure(outline, userStructure);
    } else {
      const result = await chatJson<AITopicOutline>(
        [{ role: "user", content: JSON.stringify({ query, preferences }) }],
        {
          systemPrompt: TOPIC_OUTLINE_SYSTEM_PROMPT,
          json: true,
          temperature: 0.5,
        }
      );

      if (!result.ok) {
        return NextResponse.json(
          {
            error: "AI returned an invalid outline. Please try rephrasing your question.",
            raw: result.raw,
          },
          { status: 502 }
        );
      }
      outline = result.data;
    }

    // --- Validate ------------------------------------------------------------
    const validated = validateTopicOutline(outline);
    if (!validated) {
      return NextResponse.json(
        {
          error: "AI returned an invalid outline. Please try rephrasing your question.",
          raw: rawFallback ?? JSON.stringify(outline).slice(0, 800),
        },
        { status: 502 }
      );
    }

    const safeDomain: Domain = VALID_DOMAINS.includes(validated.domain as Domain)
      ? (validated.domain as Domain)
      : "general";

    // --- Persist -------------------------------------------------------------
    const sectionsForDb = validated.sections.map((s: AISection) => {
      const subtopics: Subtopic[] | undefined = s.subtopics?.length
        ? s.subtopics.map((sub) => ({
            id: randomUUID(),
            title: sub.title,
            summary: sub.summary,
          }))
        : undefined;
      return {
        title: s.title,
        shortSummary: s.shortSummary,
        body: s.body,
        subtopics,
      };
    });

    const topic = await upsertTopic(userId, {
      title: validated.title,
      description: validated.description,
      domain: safeDomain,
      sections: sectionsForDb,
      userProvidedStructure: !!userStructure,
      contextualHint: validated.contextualHint ?? null,
    });

    // --- Learning event + concept graph --------------------------------------
    await recordLearningEvent(userId, {
      type: "topic_started",
      label: `Started: ${topic.title}`,
      detail: query,
      topicId: topic.id,
    });

    await ensureConceptNode(userId, {
      title: topic.title,
      description: topic.description,
      domain: topic.domain,
      topicId: topic.id,
    });

    return NextResponse.json({ topic, configured: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}

/**
 * Force the AI's output to match the user-supplied structure exactly:
 * same number of sections, same titles, same subtopic titles (when given).
 * We keep the model's shortSummary / body / extra subtopic summaries.
 */
function reconcileUserStructure(
  outline: AITopicOutline,
  userStructure: UserStructureSection[]
): AITopicOutline {
  const modelSections = outline.sections ?? [];
  const reconciled: AISection[] = userStructure.map((us, i) => {
    const model = modelSections[i] ?? ({} as AISection);
    const subtopics = (us.subtopics ?? []).map((title, j) => {
      const modelSub = model.subtopics?.[j];
      return {
        title,
        summary: modelSub?.summary,
      };
    });
    return {
      title: us.title,
      shortSummary: model.shortSummary ?? "",
      body: model.body,
      subtopics: subtopics.length > 0 ? subtopics : undefined,
    };
  });
  return {
    ...outline,
    sections: reconciled,
  };
}
