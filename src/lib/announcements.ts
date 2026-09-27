import "server-only";
import { and, desc, gte, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { announcements, type Role } from "@/db/schema";

export function audiencesFor(role: Role): ("everyone" | "leaders" | "staff")[] {
  if (role === "member") return ["everyone"];
  if (role === "leader") return ["everyone", "leaders"];
  return ["everyone", "leaders", "staff"];
}

export async function visibleAnnouncements(role: Role, today: string, limit = 50) {
  return db
    .select()
    .from(announcements)
    .where(and(inArray(announcements.audience, audiencesFor(role)), or(isNull(announcements.expiresAt), gte(announcements.expiresAt, today))))
    .orderBy(desc(announcements.pinned), desc(announcements.createdAt))
    .limit(limit);
}
