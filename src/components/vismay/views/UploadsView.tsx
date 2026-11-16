"use client";

/**
 * Vismay / Uploads
 * Drag-and-drop your own PDFs and notes. Files you upload stay private to
 * you; if Vismay has indexed them, you can ask a question and get an
 * answer with grounded citations.
 */

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  Upload as UploadIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { UploadData } from "@/lib/types";
import { EvidenceLink } from "@/components/vismay/primitives/EvidenceLink";
import {
  ViewShell,
  ViewLoading,
  ViewError,
  ViewEmpty,
  relativeTime,
} from "./_shared";

// Some seeds may carry an optional `extractedText` once indexing completes.
type ResolvedUpload = UploadData & { extractedText?: string | null };

const ALLOWED = [".pdf", ".txt", ".md", ".markdown", ".docx"];
const ACCEPT = ".pdf,.txt,.md,.markdown,.docx";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

interface AskResponse {
  answer: string;
  citations?: Array<{
    sourceId: string;
    title: string;
    url?: string | null;
    locator?: string | null;
  }>;
  coverageNote?: string | null;
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function UploadsView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<ResolvedUpload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch("/api/uploads", { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = (await res.json()) as { uploads: UploadData[] };
        if (!cancelled) setUploads((json.uploads ?? []) as ResolvedUpload[]);
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message ?? e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(load, [load]);

  // ---- Upload via multipart -------------------------------------------------

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploadError(null);

    // Client-side validation per file (the server still re-checks).
    const rejected: string[] = [];
    const accepted: File[] = [];
    for (const f of list) {
      const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
      if (!ALLOWED.includes(ext)) {
        rejected.push(`${f.name} — unsupported type`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        rejected.push(`${f.name} — exceeds 10 MB`);
        continue;
      }
      accepted.push(f);
    }
    if (rejected.length > 0) {
      setUploadError(rejected.join("\n"));
    }
    if (accepted.length === 0) return;

    setUploading(true);
    try {
      await Promise.all(
        accepted.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/uploads", { method: "POST", body: fd });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(
              `Upload failed for ${file.name} (${res.status})${text ? `: ${text}` : ""}`
            );
          }
          const json = (await res.json()) as { upload: UploadData };
          setUploads((cur) => [json.upload as ResolvedUpload, ...cur]);
        })
      );
    } catch (e: any) {
      setUploadError(String(e?.message ?? e));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onDelete = async (id: string) => {
    const previous = uploads;
    setUploads((cur) => cur.filter((u) => u.id !== id));
    if (openId === id) setOpenId(null);
    try {
      const res = await fetch(`/api/uploads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
    } catch (e: any) {
      setUploads(previous);
      setError(String(e?.message ?? e));
    }
  };

  // Drag handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer?.files?.length) {
      void uploadFiles(e.dataTransfer.files);
    }
  };

  const sorted = useMemo(
    () =>
      [...uploads].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [uploads]
  );

  const open = openId ? uploads.find((u) => u.id === openId) ?? null : null;

  // ---- Render -------------------------------------------------------------

  if (loading) {
    return (
      <ViewShell
        overline="06 / UPLOADS"
        title="Your own materials."
        subtitle="Drop in a PDF or notes file. Vismay reads it privately and answers your questions with grounded citations."
      >
        <ViewLoading rows={3} />
      </ViewShell>
    );
  }

  if (error && uploads.length === 0) {
    return (
      <ViewShell
        overline="06 / UPLOADS"
        title="Your own materials."
        subtitle="Drop in a PDF or notes file. Vismay reads it privately and answers your questions with grounded citations."
      >
        <ViewError error={error} onRetry={load} />
      </ViewShell>
    );
  }

  return (
    <ViewShell
      overline="06 / UPLOADS"
      title="Your own materials."
      subtitle="Drop in a PDF or notes file. Vismay reads it privately and answers your questions with grounded citations."
    >
      {/* Drop zone */}
      <div
        role="region"
        aria-label="Upload files by dragging them here or clicking to browse"
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging
            ? "border-forest bg-cream/70"
            : "border-border bg-paper hover:border-forest/40 hover:bg-cream/40"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) void uploadFiles(e.target.files);
          }}
          aria-label="Browse files to upload"
        />
        <div className="grid size-12 place-items-center rounded-full bg-cream text-forest">
          {uploading ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <UploadIcon className="size-5" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="font-serif-display text-lg text-ink">
            {uploading
              ? "Uploading…"
              : dragging
              ? "Drop to upload"
              : "Drop a PDF or notes file here, or click to browse."}
          </p>
          <p className="text-xs text-muted-foreground">
            Allowed: PDF, TXT, MD, DOCX · Max 10 MB · Private to you
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-1 rounded-full border-forest text-forest hover:bg-cream"
        >
          Browse files
        </Button>
        {uploadError ? (
          <pre
            role="alert"
            className="mt-2 max-w-full whitespace-pre-wrap rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {uploadError}
          </pre>
        ) : null}
      </div>

      {/* List */}
      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif-display text-xl text-ink">
            Your uploads
          </h2>
          <span className="text-xs text-muted-foreground">
            {sorted.length} file{sorted.length === 1 ? "" : "s"}
          </span>
        </div>

        {sorted.length === 0 ? (
          <div className="mt-4">
            <ViewEmpty
              icon={FileText}
              message="No uploads yet. Try dropping a PDF or your study notes above — Vismay will read it privately."
            />
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {sorted.map((u, i) => (
              <UploadRow
                key={u.id}
                upload={u}
                index={i}
                onOpen={() => setOpenId(u.id)}
                onDelete={() => onDelete(u.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent
          side="right"
          className="w-full gap-0 sm:max-w-lg md:max-w-xl"
        >
          {open ? (
            <UploadDetail upload={open} onDelete={() => onDelete(open.id)} />
          ) : null}
        </SheetContent>
      </Sheet>
    </ViewShell>
  );
}

// ---------------------------------------------------------------------------
// Upload row
// ---------------------------------------------------------------------------

function UploadRow({
  upload,
  index,
  onOpen,
  onDelete,
}: {
  upload: ResolvedUpload;
  index: number;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const reduce = useReducedMotion();
  const statusBadge = statusBadgeFor(upload.status);
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.04, 0.3),
        ease: [0.22, 0.61, 0.36, 1],
      }}
      className="flex items-stretch gap-3 rounded-2xl border border-border bg-paper p-4 shadow-soft transition-colors hover:border-forest/30"
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-xl"
        aria-label={`Open details for ${upload.fileName}`}
      >
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-cream text-forest"
        >
          <FileText className="size-5" strokeWidth={1.4} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-sm font-medium text-ink">
            {upload.fileName}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Badge
              variant="outline"
              className={cn("rounded-full text-[10px]", statusBadge.className)}
            >
              {statusBadge.icon}
              {statusBadge.label}
            </Badge>
            <span>{formatBytes(upload.fileSize)}</span>
            <span aria-hidden="true">·</span>
            <span>{relativeTime(upload.createdAt)}</span>
          </div>
        </div>
      </button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${upload.fileName}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              <code className="rounded bg-cream px-1 py-0.5 text-xs">
                {upload.fileName}
              </code>{" "}
              will be permanently removed. You can't undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.li>
  );
}

// ---------------------------------------------------------------------------
// Upload detail (side sheet content)
// ---------------------------------------------------------------------------

function UploadDetail({
  upload,
  onDelete,
}: {
  upload: ResolvedUpload;
  onDelete: () => void;
}) {
  return (
    <ScrollArea className="h-full">
      <SheetHeader className="pr-10">
        <SheetTitle className="font-serif-display text-xl text-ink">
          {upload.fileName}
        </SheetTitle>
        <SheetDescription className="text-xs">
          {formatBytes(upload.fileSize)} · {upload.mimeType || "file"} ·{" "}
          {relativeTime(upload.createdAt)}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-4 px-4 pb-10">
        {/* Status block */}
        <div className="rounded-xl border border-border bg-cream/40 p-3">
          {upload.status === "ready" ? (
            <div className="flex items-center gap-2 text-sm text-forest">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Indexed and ready to question.
            </div>
          ) : upload.status === "pending" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" aria-hidden="true" />
              Still processing — please wait a moment and reopen.
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <span>Upload failed to process.</span>
                {upload.errorMessage ? (
                  <pre className="whitespace-pre-wrap rounded bg-destructive/10 px-2 py-1 text-xs">
                    {upload.errorMessage}
                  </pre>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Question / answer */}
        {upload.status === "ready" && upload.extractedText ? (
          <AskPanel uploadId={upload.id} />
        ) : upload.status === "ready" ? (
          <div className="rounded-xl border border-dashed border-border bg-cream/40 p-3 text-xs text-muted-foreground">
            This file type isn't fully indexed yet. PDF text extraction is on
            the roadmap — you can still keep the file here as a private
            reference.
          </div>
        ) : null}

        {/* Delete */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 self-start rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete file
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this file?</AlertDialogTitle>
              <AlertDialogDescription>
                <code className="rounded bg-cream px-1 py-0.5 text-xs">
                  {upload.fileName}
                </code>{" "}
                will be permanently removed. You can't undo this.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ScrollArea>
  );
}

// ---------------------------------------------------------------------------
// Ask panel
// ---------------------------------------------------------------------------

function AskPanel({ uploadId }: { uploadId: string }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResponse | null>(null);

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/uploads/${uploadId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = (await res.json()) as AskResponse;
      setResult(json);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-forest">
        <Sparkles className="size-4" aria-hidden="true" />
        <span className="font-medium">Ask a question about this file</span>
      </div>
      <form onSubmit={ask} className="flex flex-col gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What would you like to understand?"
          aria-label="Your question"
          className="border-border bg-paper focus-visible:ring-2 focus-visible:ring-gold"
        />
        <Button
          type="submit"
          disabled={loading || !question.trim()}
          className="gap-2 self-start rounded-full bg-forest text-primary-foreground hover:bg-forest/90"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          {loading ? "Thinking…" : "Ask"}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="rounded-xl border border-border bg-paper p-4 shadow-soft">
          <p className="whitespace-pre-wrap text-pretty text-sm leading-relaxed text-ink">
            {result.answer}
          </p>
          {result.coverageNote ? (
            <p className="mt-3 rounded-lg border border-dashed border-border bg-cream/40 px-3 py-2 text-[11px] italic text-muted-foreground">
              {result.coverageNote}
            </p>
          ) : null}
          {result.citations && result.citations.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Citations
              </p>
              <ul className="flex flex-col gap-1">
                {result.citations.map((c, i) => (
                  <li key={`${c.sourceId}-${i}`}>
                    <EvidenceLink
                      href={c.url ?? "#"}
                      title={c.title}
                      tier="primary"
                      locator={c.locator ?? undefined}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadgeFor(status: UploadData["status"]): {
  label: string;
  className: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case "ready":
      return {
        label: "Ready",
        className: "border-forest/40 bg-forest/10 text-forest",
        icon: <CheckCircle2 className="size-3" aria-hidden="true" />,
      };
    case "pending":
      return {
        label: "Processing",
        className: "border-gold/40 bg-gold/15 text-gold",
        icon: <Clock className="size-3" aria-hidden="true" />,
      };
    case "failed":
      return {
        label: "Failed",
        className: "border-destructive/30 bg-destructive/10 text-destructive",
        icon: <AlertCircle className="size-3" aria-hidden="true" />,
      };
  }
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / Math.pow(1024, i);
  const rounded = i === 0 ? Math.round(value) : value.toFixed(1);
  return `${rounded} ${units[i]}`;
}

export default UploadsView;
