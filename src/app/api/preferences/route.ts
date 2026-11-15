import { NextRequest, NextResponse } from "next/server";

import { getDemoUserId } from "@/lib/persistence/user";
import { loadPreferences, savePreferences } from "@/lib/persistence";
import type {
  UserPreferencesData,
  ExplanationStyle,
  TechnicalLevel,
} from "@/lib/types";

export const runtime = "nodejs";

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

const VALID_STYLES: ExplanationStyle[] = [
  "concise",
  "examples",
  "detailed",
  "exploratory",
];
const VALID_LEVELS: TechnicalLevel[] = ["beginner", "balanced", "advanced"];

/**
 * GET /api/preferences — return current user preferences.
 */
export async function GET() {
  try {
    const userId = await getDemoUserId();
    const preferences: UserPreferencesData = await loadPreferences(userId);
    return NextResponse.json(preferences);
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/preferences — update user preferences (partial).
 *
 * Body: Partial<UserPreferencesData>
 */
export async function PUT(req: NextRequest) {
  try {
    let body: Partial<UserPreferencesData>;
    try {
      body = (await req.json()) as Partial<UserPreferencesData>;
    } catch {
      return NextResponse.json(
        { error: "Bad request", message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    if (body.explanationStyle && !VALID_STYLES.includes(body.explanationStyle)) {
      return NextResponse.json(
        { error: "Bad request", message: `Invalid explanationStyle: ${body.explanationStyle}` },
        { status: 400 }
      );
    }
    if (body.technicalLevel && !VALID_LEVELS.includes(body.technicalLevel)) {
      return NextResponse.json(
        { error: "Bad request", message: `Invalid technicalLevel: ${body.technicalLevel}` },
        { status: 400 }
      );
    }

    const patch: Partial<UserPreferencesData> = {
      explanationStyle: body.explanationStyle,
      technicalLevel: body.technicalLevel,
      showDiagrams:
        typeof body.showDiagrams === "boolean" ? body.showDiagrams : undefined,
      showCitations:
        typeof body.showCitations === "boolean" ? body.showCitations : undefined,
      onboardingDone:
        typeof body.onboardingDone === "boolean" ? body.onboardingDone : undefined,
    };

    const userId = await getDemoUserId();
    const updated: UserPreferencesData = await savePreferences(userId, patch);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}
