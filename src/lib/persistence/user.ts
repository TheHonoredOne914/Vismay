/**
 * Single demo user pattern.
 *
 * The sandbox has no real auth wired (NextAuth would need an OAuth provider).
 * To keep the experience functional, we use a single, deterministic demo
 * user identified by a constant email. Replace this with real NextAuth /
 * Supabase Auth in production — the rest of the data model is per-user
 * already, so the migration is a drop-in.
 *
 * Server-only — must not be imported from client components.
 */
import { db } from "@/lib/db";

const DEMO_EMAIL = "vismay@demo.local";
const DEMO_NAME = "Curious Learner";

export async function getDemoUser() {
  let user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    user = await db.user.create({
      data: {
        email: DEMO_EMAIL,
        name: DEMO_NAME,
        preferences: { create: {} },
      },
      include: { preferences: true },
    });
  }
  if (!user) throw new Error("Failed to ensure demo user");
  return user;
}

export async function getDemoUserId(): Promise<string> {
  const u = await getDemoUser();
  return u.id;
}
