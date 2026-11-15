import { NextRequest, NextResponse } from "next/server";

import { getDemoUserId } from "@/lib/persistence/user";
import {
  listNotes,
  createNote,
  recordLearningEvent,
  findTopicBySlug,
} from "@/lib/persistence";
import type { NoteData } from "@/lib/types";

type NoteKind = "manual" | "saved_excerpt" | "assistant_summary";

export const runtime = "nodejs";

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

const VALID_KINDS: NoteKind[] = ["manual", "saved_excerpt", "assistant_summary"];

/**
 * GET /api/notes?topicId=... — list notes, optionally filtered by topic.
 *
 * NOTE: listNotes returns notes for the user across all topics; the optional
 * `topicId` query param filters client-side here for clarity.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getDemoUserId();
    let notes: NoteData[] = await listNotes(userId);
    const topicId = req.nextUrl.searchParams.get("topicId");
    if (topicId) {
      notes = notes.filter((n) => n.topicId === topicId);
    }
    return NextResponse.json({ notes });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}

interface NoteRequestBody {
  title?: string | null;
  body: string;
  topicSlug?: string | null;
  sourceId?: string | null;
  kind?: NoteKind;
  excerpt?: string | null;
  excerptLocator?: string | null;
  pinned?: boolean;
}

/**
 * POST /api/notes — create a note.
 *
 * If `kind === "saved_excerpt"`, also record a `note_saved` learning event.
 */
export async function POST(req: NextRequest) {
  try {
    let body: NoteRequestBody;
    try {
      body = (await req.json()) as NoteRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Bad request", message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const noteBody = (body.body ?? "").toString().trim();
    if (!noteBody) {
      return NextResponse.json(
        { error: "Bad request", message: "Note body is required." },
        { status: 400 }
      );
    }
    if (noteBody.length > 8000) {
      return NextResponse.json(
        { error: "Bad request", message: "Note body too long (max 8000 chars)." },
        { status: 400 }
      );
    }

    const kind: NoteKind = body.kind && VALID_KINDS.includes(body.kind) ? body.kind : "manual";

    const userId = await getDemoUserId();

    // Resolve topicId from slug.
    let topicId: string | undefined;
    if (body.topicSlug) {
      const t = await findTopicBySlug(userId, body.topicSlug);
      if (t) topicId = t.id;
    }

    const note = await createNote(userId, {
      title: body.title,
      body: noteBody,
      topicId,
      sourceId: body.sourceId ?? undefined,
      kind,
      excerpt: body.excerpt ?? undefined,
      excerptLocator: body.excerptLocator ?? undefined,
      pinned: body.pinned ?? false,
    });

    if (kind === "saved_excerpt") {
      await recordLearningEvent(userId, {
        type: "note_saved",
        label: body.title ? `Saved: ${body.title}` : "Saved excerpt",
        detail: body.excerpt ?? noteBody.slice(0, 200),
        topicId,
        sourceId: body.sourceId ?? undefined,
      });
    }

    return NextResponse.json({ note });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}
