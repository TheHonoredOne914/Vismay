"use client";

/**
 * Vismay / Notes
 * Two-pane note-taking: list on the left, editor / viewer on the right.
 * Notes can be pinned, edited, and deleted (with confirmation).
 */

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  NotebookPen,
  Pin,
  PinOff,
  Plus,
  Save,
  SquarePen,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import type { NoteData } from "@/lib/types";
import {
  ViewShell,
  ViewLoading,
  ViewError,
  ViewEmpty,
  relativeTime,
} from "./_shared";

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function NotesView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch("/api/notes", { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = (await res.json()) as { notes: NoteData[] };
        if (!cancelled) setNotes(json.notes ?? []);
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

  // Sorted: pinned first, then most recently updated.
  const sorted = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
  }, [notes]);

  const selected = selectedId
    ? notes.find((n) => n.id === selectedId) ?? null
    : null;

  // ---- Mutations ----------------------------------------------------------

  const createNote = async () => {
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: "",
          kind: "manual",
        }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      const json = (await res.json()) as { note: NoteData };
      setNotes((cur) => [json.note, ...cur]);
      setSelectedId(json.note.id);
      setEditing(true);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  const updateNote = async (
    id: string,
    patch: { title?: string | null; body?: string; pinned?: boolean }
  ) => {
    // Optimistic update.
    const previous = notes;
    setNotes((cur) =>
      cur.map((n) =>
        n.id === id
          ? {
              ...n,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : n
      )
    );
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const json = (await res.json()) as { note: NoteData };
      setNotes((cur) => cur.map((n) => (n.id === id ? json.note : n)));
    } catch (e: any) {
      setNotes(previous);
      setError(String(e?.message ?? e));
    }
  };

  const deleteNote = async (id: string) => {
    const previous = notes;
    setNotes((cur) => cur.filter((n) => n.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setEditing(false);
    }
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
    } catch (e: any) {
      setNotes(previous);
      setError(String(e?.message ?? e));
    }
  };

  // ---- Render -------------------------------------------------------------

  if (loading) {
    return (
      <ViewShell
        overline="05 / NOTES"
        title="Quiet things worth keeping."
        subtitle="Notes you've saved while reading — your own words, alongside what Vismay helped you find."
      >
        <ViewLoading rows={3} />
      </ViewShell>
    );
  }

  if (error && notes.length === 0) {
    return (
      <ViewShell
        overline="05 / NOTES"
        title="Quiet things worth keeping."
        subtitle="Notes you've saved while reading — your own words, alongside what Vismay helped you find."
      >
        <ViewError error={error} onRetry={load} />
      </ViewShell>
    );
  }

  if (notes.length === 0) {
    return (
      <ViewShell
        overline="05 / NOTES"
        title="Quiet things worth keeping."
        subtitle="Notes you've saved while reading — your own words, alongside what Vismay helped you find."
      >
        <ViewEmpty
          icon={NotebookPen}
          message="Notes you save will appear here. Try selecting text on a topic page and choosing 'Save' — or write one from scratch right now."
          cta="Write a note"
          onCta={createNote}
        />
      </ViewShell>
    );
  }

  return (
    <ViewShell
      overline="05 / NOTES"
      title="Quiet things worth keeping."
      subtitle="Notes you've saved while reading — your own words, alongside what Vismay helped you find."
      actions={
        <Button
          onClick={createNote}
          className="gap-2 rounded-full bg-forest text-primary-foreground hover:bg-forest/90"
        >
          <Plus className="size-4" aria-hidden="true" />
          New note
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        {/* List pane */}
        <aside
          className={cn(
            "rounded-2xl border border-border bg-paper shadow-soft",
            selected && editing ? "hidden md:block" : "block"
          )}
        >
          <ScrollArea className="h-[60vh] md:h-[70vh]">
            <ul className="flex flex-col p-2">
              {sorted.map((n) => (
                <NoteListItem
                  key={n.id}
                  note={n}
                  active={n.id === selectedId}
                  onSelect={() => {
                    setSelectedId(n.id);
                    setEditing(false);
                  }}
                  onTogglePin={() =>
                    updateNote(n.id, { pinned: !n.pinned })
                  }
                />
              ))}
            </ul>
          </ScrollArea>
        </aside>

        {/* Detail / editor pane */}
        <section
          className={cn(
            "min-h-[60vh] rounded-2xl border border-border bg-paper shadow-soft md:min-h-[70vh]",
            selected && editing ? "block" : "hidden md:block"
          )}
        >
          {!selected ? (
            <div className="flex h-full min-h-[50vh] items-center justify-center p-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <NotebookPen
                  className="size-6 text-sage"
                  strokeWidth={1.4}
                  aria-hidden="true"
                />
                <p className="text-sm text-muted-foreground">
                  Select a note on the left to read or edit it.
                </p>
              </div>
            </div>
          ) : editing ? (
            <NoteEditor
              key={selected.id}
              note={selected}
              onBack={() => setEditing(false)}
              onSave={(title, body) => {
                updateNote(selected.id, { title, body });
                setEditing(false);
              }}
            />
          ) : (
            <NoteReader
              note={selected}
              onEdit={() => setEditing(true)}
              onBack={() => setSelectedId(null)}
              onDelete={() => deleteNote(selected.id)}
              onTogglePin={() =>
                updateNote(selected.id, { pinned: !selected.pinned })
              }
            />
          )}
        </section>
      </div>
    </ViewShell>
  );
}

// ---------------------------------------------------------------------------
// List item
// ---------------------------------------------------------------------------

function NoteListItem({
  note,
  active,
  onSelect,
  onTogglePin,
}: {
  note: NoteData;
  active: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
}) {
  const reduce = useReducedMotion();
  const title =
    note.title?.trim() ||
    note.body.split("\n")[0]?.trim() ||
    "(empty note)";
  const preview =
    note.body.split("\n").slice(1).join(" ").trim() ||
    note.excerpt ||
    "";

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={active}
        className={cn(
          "group relative w-full rounded-xl border px-3 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
          active
            ? "border-forest/40 bg-cream/60"
            : "border-transparent hover:bg-cream/40"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h4 className="line-clamp-1 text-sm font-medium text-ink">
            {title}
          </h4>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            aria-label={note.pinned ? "Unpin note" : "Pin note"}
            aria-pressed={note.pinned}
            className={cn(
              "inline-grid size-6 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
              note.pinned
                ? "text-gold"
                : "text-muted-foreground opacity-0 group-hover:opacity-100"
            )}
          >
            <Pin
              className={cn("size-3.5", note.pinned ? "fill-current" : "")}
              aria-hidden="true"
            />
          </button>
        </div>
        {preview ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {preview}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          <span>{relativeTime(note.updatedAt)}</span>
          {note.topicTitle ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate text-forest/80">{note.topicTitle}</span>
            </>
          ) : null}
          {note.kind !== "manual" ? (
            <Badge
              variant="outline"
              className="rounded-full border-border text-[9px] text-muted-foreground"
            >
              {note.kind === "saved_excerpt" ? "Excerpt" : "Summary"}
            </Badge>
          ) : null}
        </div>
      </button>
    </motion.li>
  );
}

// ---------------------------------------------------------------------------
// Reader pane
// ---------------------------------------------------------------------------

function NoteReader({
  note,
  onEdit,
  onBack,
  onDelete,
  onTogglePin,
}: {
  note: NoteData;
  onEdit: () => void;
  onBack: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-forest md:hidden"
            aria-label="Back to notes list"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Notes
          </button>
          <h2 className="font-serif-display text-2xl text-ink">
            {note.title?.trim() || note.body.split("\n")[0] || "Untitled"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Updated {relativeTime(note.updatedAt)}
            {note.topicTitle ? ` · ${note.topicTitle}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePin}
            aria-label={note.pinned ? "Unpin note" : "Pin note"}
            className="gap-1.5 rounded-full text-muted-foreground hover:text-gold"
          >
            <Pin
              className={cn("size-4", note.pinned ? "fill-current text-gold" : "")}
              aria-hidden="true"
            />
            {note.pinned ? "Pinned" : "Pin"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="gap-1.5 rounded-full border-forest text-forest hover:bg-cream"
          >
            <SquarePen className="size-4" aria-hidden="true" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-full text-destructive hover:bg-destructive/10"
                aria-label="Delete note"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the note. You can't undo this.
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
      </header>
      <ScrollArea className="flex-1">
        <div className="p-5">
          {note.excerpt ? (
            <blockquote className="mb-4 rounded-r-lg border-l-2 border-gold bg-cream/40 px-4 py-2">
              <p className="text-pretty text-sm italic text-forest">
                {note.excerpt}
              </p>
              {note.excerptLocator ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {note.excerptLocator}
                </p>
              ) : null}
            </blockquote>
          ) : null}
          {note.body.trim() ? (
            <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-ink">
              {note.body}
            </pre>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              This note is empty. Click Edit to start writing.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor pane
// ---------------------------------------------------------------------------

function NoteEditor({
  note,
  onBack,
  onSave,
}: {
  note: NoteData;
  onBack: () => void;
  onSave: (title: string | null, body: string) => void;
}) {
  // The parent renders this component with `key={note.id}`, so React
  // remounts the editor whenever the active note changes — local state
  // therefore resets naturally, no effect required.
  const [title, setTitle] = useState(note.title ?? "");
  const [body, setBody] = useState(note.body);

  const dirty =
    (note.title ?? "") !== title || note.body !== body;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(title.trim() ? title.trim() : null, body);
  };

  return (
    <form onSubmit={submit} className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border p-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-forest md:hidden"
          aria-label="Cancel and back to notes list"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Cancel
        </button>
        <span className="hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:inline">
          Editing
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="rounded-full text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!dirty}
            className="gap-1.5 rounded-full bg-forest text-primary-foreground hover:bg-forest/90"
          >
            <Save className="size-4" aria-hidden="true" />
            Save
          </Button>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          aria-label="Note title"
          className="border-border bg-paper text-lg font-medium focus-visible:ring-2 focus-visible:ring-gold"
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write freely. Curiosity doesn't need a syllabus."
          aria-label="Note body"
          className="min-h-[40vh] flex-1 resize-none border-border bg-paper text-[15px] leading-relaxed focus-visible:ring-2 focus-visible:ring-gold"
        />
      </div>
    </form>
  );
}

export default NotesView;
