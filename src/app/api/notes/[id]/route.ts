import { NextRequest, NextResponse } from "next/server";

import { getDemoUserId } from "@/lib/persistence/user";
import { updateNote, deleteNote } from "@/lib/persistence";

export const runtime = "nodejs";

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

interface NoteUpdateBody {
  title?: string | null;
  body?: string;
  pinned?: boolean;
}

/**
 * PUT /api/notes/[id] — update a note (title, body, pinned).
 */
export async function PUT(
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

    let body: NoteUpdateBody;
    try {
      body = (await req.json()) as NoteUpdateBody;
    } catch {
      return NextResponse.json(
        { error: "Bad request", message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    if (body.body !== undefined && body.body.length > 8000) {
      return NextResponse.json(
        { error: "Bad request", message: "Note body too long (max 8000 chars)." },
        { status: 400 }
      );
    }

    const userId = await getDemoUserId();
    await updateNote(userId, id, {
      title: body.title,
      body: body.body,
      pinned: typeof body.pinned === "boolean" ? body.pinned : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json(
        { error: "Not found", message: "Note not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/[id] — delete a note.
 */
export async function DELETE(
  _req: NextRequest,
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

    const userId = await getDemoUserId();
    await deleteNote(userId, id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json(
        { error: "Not found", message: "Note not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}
