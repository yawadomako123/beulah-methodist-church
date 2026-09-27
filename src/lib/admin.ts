import "server-only";
import { asc, count, eq, isNotNull } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { members, user as userTable } from "@/db/schema";

export const pendingCount = cache(async () => {
  const [{ n }] = await db.select({ n: count() }).from(userTable).where(eq(userTable.active, false));
  return n;
});

export async function pendingUsers() {
  return db.select().from(userTable).where(eq(userTable.active, false)).orderBy(asc(userTable.createdAt));
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

/**
 * Member records available to link, plus a best-guess match for each pending user
 * (same email, or first and last name both appearing in their Google name).
 */
export async function linkableMembers(forUsers: { id: string; name: string; email: string }[]) {
  const [rows, linked] = await Promise.all([
    db
      .select({ id: members.id, first: members.firstName, last: members.lastName, email: members.email, phone: members.phone })
      .from(members)
      .orderBy(asc(members.lastName), asc(members.firstName)),
    db.select({ memberId: userTable.memberId }).from(userTable).where(isNotNull(userTable.memberId)),
  ]);
  const taken = new Set(linked.map((l) => l.memberId));
  const free = rows.filter((m) => !taken.has(m.id));
  const options = free.map((m) => ({ value: m.id, label: `${m.last}, ${m.first}${m.phone ? ` (${m.phone})` : ""}` }));

  const suggestions: Record<string, number | undefined> = {};
  for (const u of forUsers) {
    const byEmail = free.find((m) => m.email && m.email.toLowerCase() === u.email.toLowerCase());
    if (byEmail) {
      suggestions[u.id] = byEmail.id;
      continue;
    }
    const words = new Set(norm(u.name));
    const byName = free.filter((m) => norm(m.first).every((w) => words.has(w)) && norm(m.last).every((w) => words.has(w)));
    if (byName.length === 1) suggestions[u.id] = byName[0].id;
  }
  return { options, suggestions };
}
