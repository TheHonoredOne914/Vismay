import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";

import { getDemoUserId } from "@/lib/persistence/user";
import { getUpload } from "@/lib/persistence";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

/**
 * GET /api/uploads/[id] — return upload metadata + extractedText (if any).
 */
export async function GET(
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
    const upload = await getUpload(userId, id);
    if (!upload) {
      return NextResponse.json(
        { error: "Not found", message: "Upload not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      upload: {
        id: upload.id,
        fileName: upload.fileName,
        mimeType: upload.mimeType,
        fileSize: upload.fileSize,
        status: upload.status,
        errorMessage: upload.errorMessage,
        topicId: upload.topicId,
        createdAt: upload.createdAt.toISOString(),
      },
      extractedText: upload.extractedText,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/uploads/[id] — remove the upload record + the file on disk.
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
    const upload = await getUpload(userId, id);
    if (!upload) {
      return NextResponse.json(
        { error: "Not found", message: "Upload not found." },
        { status: 404 }
      );
    }

    // Try to delete the file (ignore errors if it's already gone).
    try {
      await fs.unlink(upload.storagePath);
    } catch {
      // Ignore — file may already be removed.
    }

    await db.upload.delete({ where: { id, userId } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json(
        { error: "Not found", message: "Upload not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}
