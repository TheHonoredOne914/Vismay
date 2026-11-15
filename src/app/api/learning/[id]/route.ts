import { NextRequest, NextResponse } from "next/server";

import { getDemoUserId } from "@/lib/persistence/user";
import { deleteLearningEvent } from "@/lib/persistence";

export const runtime = "nodejs";

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

/**
 * DELETE /api/learning/[id] — delete a learning event by id.
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
    await deleteLearningEvent(userId, id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Prisma throws P2025 when the record doesn't exist.
    if (e?.code === "P2025") {
      return NextResponse.json(
        { error: "Not found", message: "Learning event not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}
