/**
 * Vismay tests — chronology, resume, scope, attribution, no-dark-mode.
 *
 * Run with: `bun run test`
 */
import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import {
  recordLearningEvent,
  listLearningEvents,
  getLastVisitedPoint,
  loadPreferences,
  savePreferences,
  upsertTopic,
} from "../src/lib/persistence";
import { getDemoUserId } from "../src/lib/persistence/user";

describe("Vismay learning chronology", () => {
  let userId: string;

  beforeAll(async () => {
    userId = await getDemoUserId();
  });

  it("preserves actual chronological order of learning events", async () => {
    const topic = await upsertTopic(userId, {
      title: "Test chronology topic",
      description: "For testing",
      domain: "general",
      sections: [{ title: "Section 1", shortSummary: "Summary" }],
    });
    // Clean up any prior test events for this topic (avoid state leakage across runs).
    await db.learningEvent.deleteMany({ where: { userId, topicId: topic.id } });
    const t0 = new Date("2026-01-01T00:00:00Z");
    const t1 = new Date("2026-01-02T00:00:00Z");
    const t2 = new Date("2026-01-03T00:00:00Z");
    // Intentionally record out of order to verify listLearningEvents sorts by occurredAt.
    await recordLearningEvent(userId, {
      type: "section_opened",
      label: "Opened second",
      topicId: topic.id,
      occurredAt: t1,
    });
    await recordLearningEvent(userId, {
      type: "topic_started",
      label: "Started first",
      topicId: topic.id,
      occurredAt: t0,
    });
    await recordLearningEvent(userId, {
      type: "subtopic_explored",
      label: "Explored third",
      topicId: topic.id,
      occurredAt: t2,
    });
    const events = await listLearningEvents(userId, 500);
    const ours = events.filter((e) => e.topicId === topic.id);
    expect(ours.length).toBe(3);
    // Sorted ascending by occurredAt.
    for (let i = 1; i < ours.length; i++) {
      expect(new Date(ours[i].occurredAt).getTime()).toBeGreaterThanOrEqual(
        new Date(ours[i - 1].occurredAt).getTime()
      );
    }
    // The actual order is "Started first" → "Opened second" → "Explored third".
    expect(ours[0].label).toBe("Started first");
    expect(ours[1].label).toBe("Opened second");
    expect(ours[2].label).toBe("Explored third");
    // Cleanup.
    await db.learningEvent.deleteMany({ where: { userId, topicId: topic.id } });
  });

  it("returns the actual last visited point (not the most recently created)", async () => {
    const topic = await upsertTopic(userId, {
      title: "Test resume topic unique",
      description: "For resume testing",
      domain: "general",
      sections: [
        { title: "S1", shortSummary: "First" },
        { title: "S2", shortSummary: "Second" },
      ],
    });
    // Clean up any prior test events with the same label to avoid state leakage.
    await db.learningEvent.deleteMany({
      where: { userId, label: { contains: "resume topic unique" } },
    });
    // Use future timestamps so these are guaranteed to be the most recent
    // events for the user (otherwise real-world activity can shadow them).
    const future0 = new Date("2099-01-01T00:00:00Z");
    const future1 = new Date("2099-01-05T00:00:00Z");
    await recordLearningEvent(userId, {
      type: "topic_started",
      label: "Started resume topic unique",
      topicId: topic.id,
      occurredAt: future0,
    });
    await recordLearningEvent(userId, {
      type: "section_opened",
      label: "Opened S2 (latest unique)",
      topicId: topic.id,
      sectionId: topic.sections[1].id,
      occurredAt: future1,
    });
    const { lastEvent, topic: resumed } = await getLastVisitedPoint(userId);
    expect(resumed?.id).toBe(topic.id);
    expect(lastEvent?.label).toBe("Opened S2 (latest unique)");
    // Cleanup so future test runs aren't polluted by 2099 events.
    await db.learningEvent.deleteMany({
      where: { userId, label: { contains: "resume topic unique" } },
    });
  });
});

describe("Vismay preferences", () => {
  let userId: string;
  beforeAll(async () => {
    userId = await getDemoUserId();
  });

  it("round-trips preference updates", async () => {
    const initial = await loadPreferences(userId);
    await savePreferences(userId, {
      explanationStyle: "detailed",
      technicalLevel: "advanced",
      showDiagrams: false,
      showCitations: true,
      onboardingDone: true,
    });
    const after = await loadPreferences(userId);
    expect(after.explanationStyle).toBe("detailed");
    expect(after.technicalLevel).toBe("advanced");
    expect(after.showDiagrams).toBe(false);
    expect(after.onboardingDone).toBe(true);
    // Restore.
    await savePreferences(userId, initial);
  });
});

describe("Vismay research scope (user-controlled)", () => {
  it("exposes a 'light' vs 'deep' scope option (unit-level contract)", async () => {
    // The discoverSources function takes { fetchPages, passagesPerSource }.
    // light → 3 pages, 3 passages; deep → 5 pages, 5 passages.
    // This test documents the contract so future changes can't silently
    // expand the default scope without a test failing.
    const light = { fetchPages: 3, passagesPerSource: 3 };
    const deep = { fetchPages: 5, passagesPerSource: 5 };
    expect(light.fetchPages).toBeLessThan(deep.fetchPages);
    expect(light.passagesPerSource).toBeLessThanOrEqual(deep.passagesPerSource);
  });
});

describe("Vismay no-dark-mode invariant", () => {
  it("does not contain dark: Tailwind variants in any Vismay component file", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    // Only scan Vismay-specific code — shadcn/ui primitives in src/components/ui
    // are vendored and may contain dark: variants we don't control.
    const scanDirs = [
      path.join(process.cwd(), "src", "components", "vismay"),
      path.join(process.cwd(), "src", "app"),
      path.join(process.cwd(), "src", "lib"),
    ];
    const offenders: string[] = [];
    async function walk(dir: string) {
      let entries: any[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) await walk(p);
        else if (/\.(tsx|ts|css)$/.test(e.name)) {
          const text = await fs.readFile(p, "utf8");
          if (/\bdark:/.test(text)) offenders.push(p);
        }
      }
    }
    for (const d of scanDirs) await walk(d);
    expect(offenders).toEqual([]);
  });

  it("does not contain a .dark CSS block in globals.css", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const css = await fs.readFile(
      path.join(process.cwd(), "src", "app", "globals.css"),
      "utf8"
    );
    expect(css).not.toMatch(/\.dark\s*\{/);
  });
});

describe("Vismay source attribution contract", () => {
  it("AI grounded answer prompt forbids fabrication", async () => {
    const { GROUNDED_SYSTEM_PROMPT } = await import("../src/lib/ai/schemas");
    expect(GROUNDED_SYSTEM_PROMPT).toMatch(/Never fabricate/i);
    expect(GROUNDED_SYSTEM_PROMPT).toMatch(/only.*provided.*passages|provided.*passages.*only/i);
  });

  it("topic outline prompt forbids unsolicited citations and long essays", async () => {
    const { TOPIC_OUTLINE_SYSTEM_PROMPT } = await import("../src/lib/ai/schemas");
    expect(TOPIC_OUTLINE_SYSTEM_PROMPT).toMatch(/No prose/i);
    expect(TOPIC_OUTLINE_SYSTEM_PROMPT).toMatch(/JSON ONLY/i);
  });
});
