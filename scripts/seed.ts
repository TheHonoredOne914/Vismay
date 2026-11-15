/**
 * Seed Vismay with clearly-labeled DEMO content so the homepage and journey
 * views have something to show on first run. All seed data is tagged with
 * "DEMO" in the label/detail fields and is editable / deletable by the user.
 *
 * Run with: `bun scripts/seed.ts`
 */
import { db } from "../src/lib/db";
import { getDemoUserId } from "../src/lib/persistence/user";
import { loadPreferences } from "../src/lib/persistence";

async function seed() {
  const userId = await getDemoUserId();
  await loadPreferences(userId);

  // Topic 1 — Newton's laws (DEMO)
  const newton = await db.topic.upsert({
    where: { userId_slug: { userId, slug: "newtons-laws" } },
    update: {},
    create: {
      userId,
      title: "Newton's laws of motion",
      slug: "newtons-laws",
      domain: "physics",
      description:
        "Three foundational principles relating force, mass, and motion. The starting point for classical mechanics.",
      savedForLater: true,
    },
  });
  await db.topicSection.upsert({
    where: { id: "seed-newton-1" },
    update: {},
    create: {
      id: "seed-newton-1",
      topicId: newton.id,
      orderIndex: 1,
      title: "Meaning & overview",
      shortSummary:
        "Newton's three laws describe how objects move when forces act on them — inertia, F=ma, and action–reaction.",
      body:
        "Newton's three laws of motion form the foundation of classical mechanics. The first law (inertia) states that an object at rest stays at rest, and an object in motion stays in uniform motion, unless acted on by a net external force. The second law quantifies this: F = ma. The third law pairs forces between interacting bodies.",
      subtopicsJson: JSON.stringify([
        { id: "n1", title: "First law — inertia", summary: "Objects resist changes to their motion." },
        { id: "n2", title: "Second law — F = ma", summary: "Force equals mass times acceleration." },
        { id: "n3", title: "Third law — action & reaction", summary: "For every force there is an equal and opposite force." },
      ]),
    },
  });
  await db.topicSection.upsert({
    where: { id: "seed-newton-2" },
    update: {},
    create: {
      id: "seed-newton-2",
      topicId: newton.id,
      orderIndex: 2,
      title: "Worked example",
      shortSummary:
        "Apply F = ma to a 2 kg block pushed with 10 N of force on a frictionless surface.",
      body:
        "Given m = 2 kg and F = 10 N, the acceleration is a = F / m = 5 m/s². After 3 seconds from rest, the velocity is v = a · t = 15 m/s.",
    },
  });

  // Topic 2 — Gravitation (DEMO)
  const grav = await db.topic.upsert({
    where: { userId_slug: { userId, slug: "gravitation" } },
    update: {},
    create: {
      userId,
      title: "Gravitation",
      slug: "gravitation",
      domain: "physics",
      description:
        "Newton's law of universal gravitation and its limitations — the doorway to general relativity.",
    },
  });
  await db.topicSection.upsert({
    where: { id: "seed-grav-1" },
    update: {},
    create: {
      id: "seed-grav-1",
      topicId: grav.id,
      orderIndex: 1,
      title: "Meaning & overview",
      shortSummary:
        "Every mass attracts every other mass with a force proportional to the product of masses and inversely proportional to the square of the distance.",
      body:
        "Newton's law of universal gravitation: F = G · m₁ · m₂ / r². This explains planetary orbits, tides, and free fall. It is an excellent approximation for most situations, but breaks down near very massive objects and at very high speeds — where general relativity takes over.",
      subtopicsJson: JSON.stringify([
        { id: "g1", title: "Inverse-square law", summary: "Force weakens with the square of distance." },
        { id: "g2", title: "Gravitational constant G", summary: "A fundamental constant of nature." },
        { id: "g3", title: "Limits of Newtonian gravity", summary: "Why Einstein replaced it." },
      ]),
    },
  });

  // Topic 3 — Uniform Civil Code (DEMO)
  const ucc = await db.topic.upsert({
    where: { userId_slug: { userId, slug: "uniform-civil-code" } },
    update: {},
    create: {
      userId,
      title: "Uniform Civil Code",
      slug: "uniform-civil-code",
      domain: "law",
      description:
        "A proposal for a common set of civil laws governing marriage, divorce, and inheritance — regardless of religion, in India.",
      savedForLater: true,
    },
  });
  await db.topicSection.upsert({
    where: { id: "seed-ucc-1" },
    update: {},
    create: {
      id: "seed-ucc-1",
      topicId: ucc.id,
      orderIndex: 1,
      title: "Meaning & overview",
      shortSummary:
        "The UCC refers to the idea of a common set of civil laws for citizens, particularly in family-related matters such as marriage, divorce, and inheritance.",
      body:
        "The Uniform Civil Code (UCC) refers to the proposal to replace the personal laws of different religious communities in India with a common set of civil rules governing marriage, divorce, succession, and adoption. It is a longstanding subject of constitutional, political, and social debate.",
      subtopicsJson: JSON.stringify([
        { id: "u1", title: "What is the UCC?", summary: "A common civil law for all citizens." },
        { id: "u2", title: "Why is it discussed?", summary: "Personal laws currently vary by religion." },
        { id: "u3", title: "Which areas of law are involved?", summary: "Marriage, divorce, inheritance, adoption." },
      ]),
    },
  });
  await db.topicSection.upsert({
    where: { id: "seed-ucc-2" },
    update: {},
    create: {
      id: "seed-ucc-2",
      topicId: ucc.id,
      orderIndex: 2,
      title: "Constitutional foundations",
      shortSummary:
        "Article 44 of the Directive Principles asks the State to endeavour to secure a uniform civil code for citizens throughout India.",
      body:
        "Article 44 of the Constitution of India (a Directive Principle of State Policy) directs the State to endeavour to secure for the citizens a uniform civil code throughout the territory of India. Directive Principles are not enforceable by courts but are fundamental to the governance of the country.",
      subtopicsJson: JSON.stringify([
        { id: "c1", title: "Article 44 — original text", summary: "Read the actual constitutional wording." },
        { id: "c2", title: "Related provisions", summary: "Equality (14), freedom of religion (25), and others." },
      ]),
    },
  });

  // Learning events — chronological, oldest first
  const now = Date.now();
  const day = 86400_000;
  const events: { type: string; label: string; detail?: string; topicId: string; ago: number }[] = [
    { type: "topic_started", label: "Started Newton's laws", detail: "DEMO seed", topicId: newton.id, ago: 3 * day },
    { type: "section_opened", label: "Opened Second law — F = ma", detail: "DEMO seed", topicId: newton.id, ago: 3 * day - 3600_000 },
    { type: "discovery_followed", label: "Connected to gravitation", detail: "DEMO seed", topicId: grav.id, ago: 2 * day },
    { type: "section_opened", label: "Opened Inverse-square law", detail: "DEMO seed", topicId: grav.id, ago: 2 * day - 7200_000 },
    { type: "topic_started", label: "Started Uniform Civil Code", detail: "DEMO seed", topicId: ucc.id, ago: 1 * day },
    { type: "section_opened", label: "Opened Article 44", detail: "DEMO seed", topicId: ucc.id, ago: 1 * day - 3600_000 },
  ];
  for (const e of events) {
    const occurredAt = new Date(now - e.ago);
    const existing = await db.learningEvent.findFirst({
      where: { userId, label: e.label, occurredAt },
    });
    if (!existing) {
      await db.learningEvent.create({
        data: {
          userId,
          topicId: e.topicId,
          type: e.type,
          label: e.label,
          detail: e.detail,
          occurredAt,
        },
      });
    }
  }
  await db.topic.update({
    where: { id: ucc.id },
    data: { lastSectionId: "seed-ucc-2", updatedAt: new Date(now - 3600_000) },
  });

  // Concept graph — DEMO logical relationships
  const newtonConcept = await db.conceptNode.upsert({
    where: { userId_title: { userId, title: "Newton's laws of motion" } },
    update: {},
    create: { userId, title: "Newton's laws of motion", domain: "physics", topicId: newton.id },
  });
  const gravConcept = await db.conceptNode.upsert({
    where: { userId_title: { userId, title: "Gravitation" } },
    update: {},
    create: { userId, title: "Gravitation", domain: "physics", topicId: grav.id },
  });
  const uccConcept = await db.conceptNode.upsert({
    where: { userId_title: { userId, title: "Uniform Civil Code" } },
    update: {},
    create: { userId, title: "Uniform Civil Code", domain: "law", topicId: ucc.id },
  });
  await db.conceptEdge.upsert({
    where: { fromId_toId_relationship: { fromId: newtonConcept.id, toId: gravConcept.id, relationship: "extends" } },
    update: {},
    create: { fromId: newtonConcept.id, toId: gravConcept.id, relationship: "extends", note: "DEMO seed" },
  });
  await db.conceptEdge.upsert({
    where: { fromId_toId_relationship: { fromId: gravConcept.id, toId: uccConcept.id, relationship: "related" } },
    update: {},
    create: { fromId: gravConcept.id, toId: uccConcept.id, relationship: "related", note: "DEMO seed: both deal with universal principles" },
  });

  // A demo source for UCC
  const uccSource = await db.sourceDocument.upsert({
    where: { id: "seed-ucc-src-1" },
    update: {},
    create: {
      id: "seed-ucc-src-1",
      userId,
      topicId: ucc.id,
      tier: "primary",
      kind: "constitution",
      title: "Constitution of India — Article 44",
      url: "https://www.constitutionofindia.net/constitution_of_india/directive_principles/articles/Article_44",
      source: "constitutionofindia.net",
      snippet:
        "The State shall endeavour to secure for the citizens a uniform civil code throughout the territory of India.",
      coverageNote: "DEMO seed — primary constitutional text.",
      verified: true,
    },
  });
  await db.sourcePassage.upsert({
    where: { id: "seed-ucc-pas-1" },
    update: {},
    create: {
      id: "seed-ucc-pas-1",
      sourceId: uccSource.id,
      passage:
        "The State shall endeavour to secure for the citizens a uniform civil code throughout the territory of India.",
      locator: "Article 44",
    },
  });

  console.log("✓ Vismay seed data inserted (labeled DEMO).");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
