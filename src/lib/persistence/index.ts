/**
 * Server-side persistence helpers — typed wrappers around Prisma for the
 * Vismay data model. All functions take an explicit userId (the demo user
 * id in this sandbox).
 *
 * NOTE: These helpers must only be imported from server-side code (API
 * routes, server components, server actions). They are not safe to import
 * from client components because they touch the database directly.
 */
import { db } from "@/lib/db";
import type {
  TopicData,
  TopicSectionData,
  Subtopic,
  LearningEvent,
  LearningEventType,
  SourceDocumentData,
  SourcePassageData,
  NoteData,
  UploadData,
  ConceptNodeData,
  ConceptEdgeData,
  ChallengeData,
  ChallengeAttempt,
  UserPreferencesData,
  AssistantMessage,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export async function loadPreferences(userId: string): Promise<UserPreferencesData> {
  const p = await db.userPreferences.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  return {
    explanationStyle: (p.explanationStyle as any) ?? "concise",
    technicalLevel: (p.technicalLevel as any) ?? "balanced",
    showDiagrams: p.showDiagrams,
    showCitations: p.showCitations,
    onboardingDone: p.onboardingDone,
  };
}

export async function savePreferences(
  userId: string,
  patch: Partial<UserPreferencesData>
): Promise<UserPreferencesData> {
  const p = await db.userPreferences.upsert({
    where: { userId },
    update: {
      explanationStyle: patch.explanationStyle,
      technicalLevel: patch.technicalLevel,
      showDiagrams: patch.showDiagrams,
      showCitations: patch.showCitations,
      onboardingDone: patch.onboardingDone,
    },
    create: {
      userId,
      explanationStyle: patch.explanationStyle ?? "concise",
      technicalLevel: patch.technicalLevel ?? "balanced",
      showDiagrams: patch.showDiagrams ?? true,
      showCitations: patch.showCitations ?? true,
      onboardingDone: patch.onboardingDone ?? false,
    },
  });
  return {
    explanationStyle: p.explanationStyle as any,
    technicalLevel: p.technicalLevel as any,
    showDiagrams: p.showDiagrams,
    showCitations: p.showCitations,
    onboardingDone: p.onboardingDone,
  };
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || "topic";
}

export async function findTopicBySlug(userId: string, slug: string) {
  return db.topic.findUnique({
    where: { userId_slug: { userId, slug } },
    include: { sections: { orderBy: { orderIndex: "asc" } } },
  });
}

export async function getTopicData(userId: string, slug: string): Promise<TopicData | null> {
  const t = await findTopicBySlug(userId, slug);
  if (!t) return null;
  return serializeTopic(t);
}

export function serializeTopic(t: any): TopicData {
  const sections: TopicSectionData[] = (t.sections ?? [])
    .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
    .map((s: any) => ({
      id: s.id,
      orderIndex: s.orderIndex,
      title: s.title,
      shortSummary: s.shortSummary,
      body: s.body ?? undefined,
      subtopics: s.subtopicsJson ? (JSON.parse(s.subtopicsJson) as Subtopic[]) : undefined,
      contextualHint: s.contextualHintId
        ? { label: "Contextual connection", body: s.contextualHintId }
        : undefined,
    }));
  return {
    id: t.id,
    title: t.title,
    slug: t.slug,
    description: t.description ?? "",
    domain: t.domain as any,
    sections,
    userProvidedStructure: t.userProvidedStructure,
    lastSectionId: t.lastSectionId ?? null,
    savedForLater: t.savedForLater,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function listTopics(userId: string) {
  const topics = await db.topic.findMany({
    where: { userId },
    include: { sections: { select: { id: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return topics.map(serializeTopic);
}

export async function upsertTopic(
  userId: string,
  input: {
    title: string;
    description: string;
    domain: string;
    sections: {
      title: string;
      shortSummary: string;
      body?: string;
      subtopics?: Subtopic[];
      contextualHint?: { label: string; body: string } | null;
    }[];
    userProvidedStructure?: boolean;
    contextualHint?: { label: string; body: string } | null;
  }
): Promise<TopicData> {
  const slug = slugify(input.title);
  const existing = await db.topic.findUnique({
    where: { userId_slug: { userId, slug } },
  });
  // Upsert topic + sections in a transaction.
  const saved = await db.$transaction(async (tx) => {
    const topic = await tx.topic.upsert({
      where: { userId_slug: { userId, slug } },
      update: {
        title: input.title,
        description: input.description,
        domain: input.domain,
        userProvidedStructure: input.userProvidedStructure ?? false,
      },
      create: {
        userId,
        title: input.title,
        slug,
        description: input.description,
        domain: input.domain,
        userProvidedStructure: input.userProvidedStructure ?? false,
      },
    });
    // Replace sections (simple strategy: delete + recreate). This is fine for
    // our scale and avoids diff logic.
    await tx.topicSection.deleteMany({ where: { topicId: topic.id } });
    for (let i = 0; i < input.sections.length; i++) {
      const s = input.sections[i];
      const hint = i === 0 ? input.contextualHint : null;
      await tx.topicSection.create({
        data: {
          topicId: topic.id,
          orderIndex: i + 1,
          title: s.title,
          shortSummary: s.shortSummary,
          body: s.body,
          subtopicsJson: s.subtopics ? JSON.stringify(s.subtopics) : null,
          contextualHintId: hint ? hint.body : s.contextualHint?.body ?? null,
        },
      });
    }
    return topic;
  });
  const fresh = await db.topic.findUnique({
    where: { id: saved.id },
    include: { sections: { orderBy: { orderIndex: "asc" } } },
  });
  return serializeTopic(fresh);
}

export async function setTopicLastSection(userId: string, topicId: string, sectionId: string | null) {
  await db.topic.update({
    where: { id: topicId, userId },
    data: { lastSectionId: sectionId, updatedAt: new Date() },
  });
}

export async function toggleSavedTopic(userId: string, topicId: string, saved: boolean) {
  await db.topic.update({
    where: { id: topicId, userId },
    data: { savedForLater: saved, updatedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Learning events (chronological)
// ---------------------------------------------------------------------------

export async function recordLearningEvent(
  userId: string,
  input: {
    type: LearningEventType;
    label: string;
    detail?: string;
    topicId?: string;
    sectionId?: string;
    sourceId?: string;
    parentId?: string;
    occurredAt?: Date;
  }
): Promise<LearningEvent> {
  const ev = await db.learningEvent.create({
    data: {
      userId,
      topicId: input.topicId,
      type: input.type,
      label: input.label,
      detail: input.detail,
      sectionId: input.sectionId,
      sourceId: input.sourceId,
      parentId: input.parentId,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
  return serializeEvent(ev, null);
}

export function serializeEvent(e: any, topicTitle: string | null = null): LearningEvent {
  return {
    id: e.id,
    occurredAt: e.occurredAt.toISOString(),
    type: e.type as LearningEventType,
    label: e.label,
    detail: e.detail,
    parentId: e.parentId,
    topicId: e.topicId,
    topicTitle,
    sectionId: e.sectionId,
    sourceId: e.sourceId,
  };
}

export async function listLearningEvents(userId: string, limit = 200): Promise<LearningEvent[]> {
  const events = await db.learningEvent.findMany({
    where: { userId },
    orderBy: { occurredAt: "asc" },
    take: limit,
  });
  const topics = await db.topic.findMany({
    where: { userId },
    select: { id: true, title: true },
  });
  const titleMap = new Map(topics.map((t) => [t.id, t.title]));
  return events.map((e) => serializeEvent(e, e.topicId ? titleMap.get(e.topicId) ?? null : null));
}

export async function getLastVisitedPoint(userId: string): Promise<{
  topic: TopicData | null;
  lastEvent: LearningEvent | null;
}> {
  const last = await db.learningEvent.findFirst({
    where: { userId },
    orderBy: { occurredAt: "desc" },
  });
  if (!last?.topicId) {
    // Fall back to most-recently-updated topic.
    const t = await db.topic.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { sections: { orderBy: { orderIndex: "asc" } } },
    });
    return { topic: t ? serializeTopic(t) : null, lastEvent: null };
  }
  const t = await db.topic.findUnique({
    where: { id: last.topicId },
    include: { sections: { orderBy: { orderIndex: "asc" } } },
  });
  return {
    topic: t ? serializeTopic(t) : null,
    lastEvent: serializeEvent(last, t?.title ?? null),
  };
}

export async function deleteLearningEvent(userId: string, eventId: string) {
  await db.learningEvent.delete({ where: { id: eventId, userId } });
}

// ---------------------------------------------------------------------------
// Sources & passages
// ---------------------------------------------------------------------------

export async function saveSourceDocument(
  userId: string | null,
  input: {
    topicId?: string;
    tier?: string;
    kind?: string;
    title: string;
    url?: string | null;
    source?: string | null;
    publishedDate?: string | null;
    snippet?: string | null;
    fullText?: string | null;
    coverageNote?: string | null;
    uploadId?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
    fileSize?: number | null;
  }
) {
  return db.sourceDocument.create({
    data: {
      userId,
      topicId: input.topicId,
      tier: input.tier ?? "secondary",
      kind: input.kind ?? "article",
      title: input.title,
      url: input.url,
      source: input.source,
      publishedDate: input.publishedDate,
      snippet: input.snippet,
      fullText: input.fullText ? input.fullText.slice(0, 8000) : null,
      coverageNote: input.coverageNote,
      uploadId: input.uploadId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
    },
  });
}

export async function savePassages(sourceId: string, passages: SourcePassageData[]) {
  if (passages.length === 0) return;
  await db.sourcePassage.createMany({
    data: passages.map((p) => ({
      sourceId,
      passage: p.passage,
      locator: p.locator ?? null,
    })),
  });
}

export async function listSourcesForTopic(topicId: string): Promise<SourceDocumentData[]> {
  const docs = await db.sourceDocument.findMany({
    where: { topicId },
    orderBy: { createdAt: "desc" },
  });
  return docs.map(serializeSource);
}

export async function listAllSources(userId: string | null): Promise<SourceDocumentData[]> {
  const docs = await db.sourceDocument.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return docs.map(serializeSource);
}

export function serializeSource(s: any): SourceDocumentData {
  return {
    id: s.id,
    tier: s.tier,
    kind: s.kind,
    title: s.title,
    url: s.url,
    source: s.source,
    publishedDate: s.publishedDate,
    snippet: s.snippet,
    coverageNote: s.coverageNote,
    verified: s.verified,
  };
}

export async function listPassages(sourceId: string): Promise<SourcePassageData[]> {
  const rows = await db.sourcePassage.findMany({ where: { sourceId } });
  return rows.map((p) => ({ id: p.id, passage: p.passage, locator: p.locator }));
}

export async function listPassagesForTopic(topicId: string) {
  const docs = await db.sourceDocument.findMany({
    where: { topicId },
    select: { id: true, title: true, url: true, source: true, tier: true, kind: true, passages: true },
  });
  const out: {
    sourceId: string;
    sourceTitle: string;
    sourceUrl: string | null;
    sourceTier: string;
    sourceKind: string;
    passages: SourcePassageData[];
  }[] = [];
  for (const d of docs) {
    out.push({
      sourceId: d.id,
      sourceTitle: d.title,
      sourceUrl: d.url,
      sourceTier: d.tier,
      sourceKind: d.kind,
      passages: d.passages.map((p: any) => ({
        id: p.id,
        passage: p.passage,
        locator: p.locator,
      })),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function listNotes(userId: string): Promise<NoteData[]> {
  const notes = await db.note.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
  const topics = await db.topic.findMany({
    where: { userId },
    select: { id: true, title: true },
  });
  const titleMap = new Map(topics.map((t) => [t.id, t.title]));
  return notes.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    kind: n.kind as any,
    excerpt: n.excerpt,
    excerptLocator: n.excerptLocator,
    topicId: n.topicId,
    topicTitle: n.topicId ? titleMap.get(n.topicId) ?? null : null,
    sourceId: n.sourceId,
    pinned: n.pinned,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }));
}

export async function createNote(userId: string, input: Partial<NoteData> & { body: string }): Promise<NoteData> {
  const n = await db.note.create({
    data: {
      userId,
      topicId: input.topicId,
      sourceId: input.sourceId,
      title: input.title,
      body: input.body,
      kind: (input.kind as any) ?? "manual",
      excerpt: input.excerpt,
      excerptLocator: input.excerptLocator,
      pinned: input.pinned ?? false,
    },
  });
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    kind: n.kind as any,
    excerpt: n.excerpt,
    excerptLocator: n.excerptLocator,
    topicId: n.topicId,
    sourceId: n.sourceId,
    pinned: n.pinned,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

export async function updateNote(userId: string, id: string, patch: Partial<NoteData>): Promise<void> {
  await db.note.update({
    where: { id, userId },
    data: {
      title: patch.title,
      body: patch.body,
      pinned: patch.pinned,
    },
  });
}

export async function deleteNote(userId: string, id: string): Promise<void> {
  await db.note.delete({ where: { id, userId } });
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

export async function listUploads(userId: string): Promise<UploadData[]> {
  const ups = await db.upload.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return ups.map((u) => ({
    id: u.id,
    fileName: u.fileName,
    mimeType: u.mimeType,
    fileSize: u.fileSize,
    status: u.status as any,
    errorMessage: u.errorMessage,
    topicId: u.topicId,
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function createUpload(userId: string, input: {
  fileName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  topicId?: string | null;
  extractedText?: string;
  status?: string;
}): Promise<UploadData> {
  const u = await db.upload.create({
    data: {
      userId,
      topicId: input.topicId,
      fileName: input.fileName,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      extractedText: input.extractedText,
      status: input.status ?? "ready",
    },
  });
  return {
    id: u.id,
    fileName: u.fileName,
    mimeType: u.mimeType,
    fileSize: u.fileSize,
    status: u.status as any,
    errorMessage: u.errorMessage,
    topicId: u.topicId,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function getUpload(userId: string, id: string) {
  return db.upload.findUnique({ where: { id, userId } });
}

// ---------------------------------------------------------------------------
// Connected concepts
// ---------------------------------------------------------------------------

export async function listConceptGraph(userId: string): Promise<{
  nodes: ConceptNodeData[];
  edges: ConceptEdgeData[];
}> {
  const [nodes, edges] = await Promise.all([
    db.conceptNode.findMany({ where: { userId } }),
    db.conceptEdge.findMany({
      where: { OR: [{ from: { userId } }, { to: { userId } }] },
    }),
  ]);
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      title: n.title,
      description: n.description ?? undefined,
      domain: n.domain ?? undefined,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      fromId: e.fromId,
      toId: e.toId,
      relationship: e.relationship as any,
      note: e.note ?? undefined,
    })),
  };
}

export async function ensureConceptNode(
  userId: string,
  input: { title: string; description?: string; domain?: string; topicId?: string }
): Promise<ConceptNodeData> {
  const node = await db.conceptNode.upsert({
    where: { userId_title: { userId, title: input.title } },
    update: {
      description: input.description,
      domain: input.domain,
    },
    create: {
      userId,
      title: input.title,
      description: input.description,
      domain: input.domain,
      topicId: input.topicId,
    },
  });
  return {
    id: node.id,
    title: node.title,
    description: node.description ?? undefined,
    domain: node.domain ?? undefined,
  };
}

export async function connectConcepts(
  fromId: string,
  toId: string,
  relationship: ConceptEdgeData["relationship"] = "related",
  note?: string
) {
  return db.conceptEdge.upsert({
    where: { fromId_toId_relationship: { fromId, toId, relationship } },
    update: { note },
    create: { fromId, toId, relationship, note },
  });
}

// ---------------------------------------------------------------------------
// Assistant chats
// ---------------------------------------------------------------------------

export async function loadAssistantChat(userId: string, topicId?: string) {
  return db.assistantChat.findFirst({
    where: { userId, topicId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function saveAssistantMessages(
  userId: string,
  topicId: string | undefined,
  context: string | undefined,
  messages: AssistantMessage[]
) {
  const existing = topicId
    ? await db.assistantChat.findFirst({ where: { userId, topicId }, orderBy: { updatedAt: "desc" } })
    : undefined;
  if (existing) {
    return db.assistantChat.update({
      where: { id: existing.id },
      data: { messagesJson: JSON.stringify(messages), updatedAt: new Date() },
    });
  }
  return db.assistantChat.create({
    data: {
      userId,
      topicId,
      context,
      messagesJson: JSON.stringify(messages),
    },
  });
}

// ---------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------

export async function listChallenges(userId: string, topicId?: string): Promise<ChallengeData[]> {
  const rows = await db.challenge.findMany({
    where: { userId, topicId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((c) => ({
    id: c.id,
    difficulty: c.difficulty as any,
    prompt: c.prompt,
    attempts: c.attemptsJson ? (JSON.parse(c.attemptsJson) as ChallengeAttempt[]) : [],
    solved: c.solved,
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function createChallenge(
  userId: string,
  topicId: string,
  input: { difficulty: ChallengeData["difficulty"]; prompt: string; expected?: string }
): Promise<ChallengeData> {
  const c = await db.challenge.create({
    data: {
      userId,
      topicId,
      difficulty: input.difficulty,
      prompt: input.prompt,
      expectedJson: input.expected,
      attemptsJson: JSON.stringify([]),
    },
  });
  return {
    id: c.id,
    difficulty: c.difficulty as any,
    prompt: c.prompt,
    attempts: [],
    solved: false,
    createdAt: c.createdAt.toISOString(),
  };
}

export async function appendChallengeAttempt(
  userId: string,
  challengeId: string,
  attempt: ChallengeAttempt
): Promise<ChallengeData> {
  const c = await db.challenge.findUnique({ where: { id: challengeId, userId } });
  if (!c) throw new Error("Challenge not found");
  const attempts: ChallengeAttempt[] = c.attemptsJson ? JSON.parse(c.attemptsJson) : [];
  attempts.push(attempt);
  const updated = await db.challenge.update({
    where: { id: challengeId },
    data: {
      attemptsJson: JSON.stringify(attempts),
      solved: attempt.correct ? true : c.solved,
    },
  });
  return {
    id: updated.id,
    difficulty: updated.difficulty as any,
    prompt: updated.prompt,
    attempts,
    solved: updated.solved,
    createdAt: updated.createdAt.toISOString(),
  };
}
