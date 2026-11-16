import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { getDemoUserId } from "@/lib/persistence/user";
import { listUploads, createUpload, findTopicBySlug } from "@/lib/persistence";
import type { UploadData } from "@/lib/types";

export const runtime = "nodejs";

const UPLOAD_DIR = "/home/z/my-project/uploads";
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

function devError(e: unknown): string | undefined {
  return process.env.NODE_ENV === "development"
    ? String((e as any)?.message ?? e)
    : undefined;
}

function sanitizeFileName(name: string): string {
  // Keep ascii alphanumerics, dashes, underscores, and a single dot.
  const base = (name || "upload").replace(/[\\]+/g, "/");
  const parts = base.split("/").pop() || "upload";
  return parts
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80) || "upload";
}

/**
 * GET /api/uploads — list uploads for the user.
 */
export async function GET() {
  try {
    const userId = await getDemoUserId();
    const uploads: UploadData[] = await listUploads(userId);
    return NextResponse.json({ uploads });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/uploads — multipart upload of a single file.
 *
 * Allowed: pdf, txt, md, docx (max 10 MB).
 * For text/markdown files we extract text directly. For PDFs / docx we store
 * the file path and mark status: "ready" with extractedText: null (we don't
 * have a parser available in the sandbox).
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const topicSlug = formData.get("topicSlug");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Bad request", message: "file field is required." },
        { status: 400 }
      );
    }

    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME[mimeType]) {
      return NextResponse.json(
        {
          error: "Bad request",
          message: `Unsupported MIME type: ${mimeType}. Allowed: ${Object.keys(ALLOWED_MIME).join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "Bad request", message: "File is empty." },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Bad request", message: "File too large (max 10 MB)." },
        { status: 400 }
      );
    }

    const userId = await getDemoUserId();

    // Resolve topicId if slug was provided.
    let topicId: string | null = null;
    if (typeof topicSlug === "string" && topicSlug.trim()) {
      const t = await findTopicBySlug(userId, topicSlug.trim());
      if (t) topicId = t.id;
    }

    // Ensure upload dir exists.
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const uploadId = randomUUID();
    const safeName = sanitizeFileName(file.name || `upload.${ALLOWED_MIME[mimeType]}`);
    const storagePath = path.join(UPLOAD_DIR, `${uploadId}-${safeName}`);

    // Read file bytes.
    const arrayBuf = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    await fs.writeFile(storagePath, buf);

    // Extract text for text/markdown. For PDF/docx, store metadata only.
    let extractedText: string | undefined;
    let status: "pending" | "ready" | "failed" = "ready";
    let errorMessage: string | null = null;

    if (mimeType === "text/plain" || mimeType === "text/markdown") {
      try {
        extractedText = buf.toString("utf-8").slice(0, 200_000);
      } catch (e) {
        status = "failed";
        errorMessage = "Failed to decode text file.";
      }
    } else {
      // PDF / docx — no parser available in the sandbox. Store the file path
      // honestly; full extraction would require pdf-parse or mammoth.
      extractedText = undefined;
    }

    const upload: UploadData = await createUpload(userId, {
      fileName: file.name || safeName,
      storagePath,
      mimeType,
      fileSize: buf.length,
      topicId: topicId ?? undefined,
      extractedText,
      status,
    });

    if (errorMessage) {
      // Surface but still return the upload metadata.
      return NextResponse.json(
        { upload, warning: errorMessage },
        { status: 200 }
      );
    }

    return NextResponse.json({ upload });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", message: devError(e) },
      { status: 500 }
    );
  }
}
